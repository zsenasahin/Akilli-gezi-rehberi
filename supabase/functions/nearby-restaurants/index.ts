// supabase/functions/nearby-restaurants/index.ts
// Overpass API üzerinden yakın restoranları getirir.

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

async function queryOverpass(query: string): Promise<any> {
    for (const server of OVERPASS_SERVERS) {
        try {
            const res = await fetch(server, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            })
            if (res.ok) {
                const data = await res.json()
                if (data.elements) return data
            }
        } catch (e) { /* try next server */ }
    }
    throw new Error('All Overpass servers failed')
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { lat, lng, radius = 1000 } = await req.json()

        if (!lat || !lng) {
            return new Response(
                JSON.stringify({ error: 'lat ve lng parametreleri gerekli.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Cache kontrolü
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const cacheKey = `restaurants_${lat.toFixed(3)}_${lng.toFixed(3)}_${radius}`
        const { data: cached } = await supabase
            .from('api_cache')
            .select('response, created_at')
            .eq('cache_key', cacheKey)
            .single()

        if (cached) {
            const age = (Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60)
            if (age < CACHE_TTL_HOURS) {
                return new Response(
                    JSON.stringify(cached.response),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // Overpass Query (simplified for speed)
        const query = `[out:json][timeout:15];node["amenity"~"restaurant|cafe|fast_food"](around:${radius},${lat},${lng});out body 20;`

        const overpassData = await queryOverpass(query)

        const restaurants = overpassData.elements
            .filter((el: any) => el.tags?.name)
            .map((el: any) => ({
                id: el.id,
                name: el.tags.name,
                lat: el.lat,
                lng: el.lon,
                cuisine: el.tags.cuisine || el.tags['cuisine:tr'] || '',
                phone: el.tags.phone || '',
                website: el.tags.website || '',
                type: el.tags.amenity || 'restaurant',
                openingHours: el.tags.opening_hours || '',
            }))
            .slice(0, 20)

        const result = { restaurants, count: restaurants.length }

        // Cache kaydet
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

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
