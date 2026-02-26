// supabase/functions/optimize-route/index.ts
// Haversine ile sıralama + OpenRouteService ile rota polyline

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Haversine ───
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

// ─── Nearest Neighbor Sıralama ───
function sortByNearest(
    start: { lat: number; lng: number },
    places: Array<{ lat: number; lng: number; name: string; id: number }>
) {
    const remaining = [...places]
    const sorted: any[] = []
    let current = { lat: start.lat, lng: start.lng }

    while (remaining.length > 0) {
        let nearestIdx = 0
        let nearestDist = Infinity

        for (let i = 0; i < remaining.length; i++) {
            const dist = haversineDistance(current.lat, current.lng, remaining[i].lat, remaining[i].lng)
            if (dist < nearestDist) {
                nearestDist = dist
                nearestIdx = i
            }
        }

        const nearest = remaining.splice(nearestIdx, 1)[0]
        sorted.push({ ...nearest, distanceFromPrev: Math.round(nearestDist * 1000) })
        current = { lat: nearest.lat, lng: nearest.lng }
    }

    return sorted
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { accommodation, places } = await req.json()

        if (!accommodation || !places || places.length === 0) {
            return new Response(
                JSON.stringify({ error: 'accommodation ve places parametreleri gerekli.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Haversine ile en yakından sırala
        const orderedPlaces = sortByNearest(accommodation, places)

        // 2. OpenRouteService ile rota al
        const ORS_API_KEY = Deno.env.get('ORS_API_KEY')

        if (!ORS_API_KEY) {
            // ORS key yoksa sadece Haversine sonuçlarını döndür
            const fallbackRoute = [
                [accommodation.lng, accommodation.lat],
                ...orderedPlaces.map((p: any) => [p.lng, p.lat]),
            ]

            let totalDist = 0
            for (let i = 0; i < orderedPlaces.length; i++) {
                totalDist += orderedPlaces[i].distanceFromPrev
            }

            return new Response(
                JSON.stringify({
                    route: fallbackRoute,
                    distance: totalDist / 1000,
                    duration: null,
                    orderedPlaces,
                    source: 'haversine',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Waypoints: [start, ...places]
        const coordinates = [
            [accommodation.lng, accommodation.lat],
            ...orderedPlaces.map((p: any) => [p.lng, p.lat]),
        ]

        // ORS Directions API
        const orsResponse = await fetch(
            'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': ORS_API_KEY,
                },
                body: JSON.stringify({
                    coordinates,
                    instructions: false,
                    geometry_simplify: true,
                }),
            }
        )

        if (!orsResponse.ok) {
            const errorText = await orsResponse.text()
            console.error('ORS error:', errorText)

            // Fallback to straight lines
            return new Response(
                JSON.stringify({
                    route: coordinates,
                    distance: orderedPlaces.reduce((sum: number, p: any) => sum + p.distanceFromPrev, 0) / 1000,
                    duration: null,
                    orderedPlaces,
                    source: 'haversine-fallback',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const orsData = await orsResponse.json()
        const feature = orsData.features?.[0]

        return new Response(
            JSON.stringify({
                route: feature?.geometry?.coordinates || coordinates,
                distance: (feature?.properties?.summary?.distance || 0) / 1000, // km
                duration: feature?.properties?.summary?.duration || null, // saniye
                orderedPlaces,
                source: 'openrouteservice',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
