// supabase/functions/nearby-hotels/index.ts
// Overpass API üzerinden yakın otelleri getirir.
// Cache: 24 saat TTL ile Supabase DB

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
]
const CACHE_TTL_HOURS = 24

// Overpass API'den dönen element tipi
interface OverpassElement {
    id: number
    lat?: number
    lon?: number
    center?: { lat: number; lon: number }
    tags: {
        name?: string
        tourism?: string
        stars?: string
        'addr:street'?: string
        'addr:full'?: string
        phone?: string
        website?: string
    }
}

interface OverpassResponse {
    elements: OverpassElement[]
}

async function queryOverpass(query: string): Promise<OverpassResponse> {
    for (const server of OVERPASS_SERVERS) {
        try {
            const res = await fetch(server, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            })
            if (res.ok) {
                const data: OverpassResponse = await res.json()
                if (data.elements) return data
            }
        } catch (_e) { /* try next server */ }
    }
    throw new Error('All Overpass servers failed')
}

serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json() as { lat?: number; lng?: number; radius?: number }
        const { lat, lng, radius = 1500 } = body

        if (lat === undefined || lat === null || lng === undefined || lng === null) {
            return new Response(
                JSON.stringify({ error: 'lat ve lng parametreleri gerekli.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const latNum = Number(lat)
        const lngNum = Number(lng)
        const radiusNum = Number(radius)

        if (isNaN(latNum) || isNaN(lngNum)) {
            return new Response(
                JSON.stringify({ error: 'lat ve lng sayısal değer olmalı.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ─── Cache kontrolü ───
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const cacheKey = `hotels_${latNum.toFixed(3)}_${lngNum.toFixed(3)}_${radiusNum}`
        const { data: cached } = await supabase
            .from('api_cache')
            .select('response, created_at')
            .eq('cache_key', cacheKey)
            .single()

        if (cached) {
            const age = (Date.now() - new Date(cached.created_at as string).getTime()) / (1000 * 60 * 60)
            if (age < CACHE_TTL_HOURS) {
                return new Response(
                    JSON.stringify(cached.response),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // ─── Overpass Query ───
        const query = `[out:json][timeout:15];node["tourism"~"hotel|hostel|guest_house"](around:${radiusNum},${latNum},${lngNum});out body 20;`

        const overpassData = await queryOverpass(query)

        // ─── Parse sonuçları ───
        const hotels = overpassData.elements
            .filter((el: OverpassElement) => el.tags?.name)
            .map((el: OverpassElement) => ({
                id: el.id,
                name: el.tags.name,
                lat: el.lat ?? el.center?.lat,
                lng: el.lon ?? el.center?.lon,
                stars: parseInt(el.tags.stars ?? '0', 10) || 0,
                address: el.tags['addr:street'] || el.tags['addr:full'] || '',
                phone: el.tags.phone || '',
                website: el.tags.website || '',
                type: el.tags.tourism || 'hotel',
            }))
            .filter((h) => h.lat !== undefined && h.lng !== undefined)
            .slice(0, 20)

        const result = { hotels, count: hotels.length }

        // ─── Cache kaydet ───
        await supabase
            .from('api_cache')
            .upsert({
                cache_key: cacheKey,
                response: result,
                created_at: new Date().toISOString(),
            })

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Beklenmeyen hata'
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
