// supabase/functions/city-pois/index.ts
// TomTom Search API destekli şehir POI servisi.
// TOMTOM_API_KEY Supabase secret olarak tanımlanmalı.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CACHE_TTL_HOURS = 24
const TOMTOM_BASE_URL = 'https://api.tomtom.com/search/2/categorySearch'

const CATEGORY_QUERIES: Record<string, string[]> = {
    restaurant: ['restaurant', 'fast food'],
    cafe: ['cafe', 'coffee shop'],
    hotel: ['hotel', 'hostel', 'guest house'],
    atm: ['atm', 'bank'],
    pharmacy: ['pharmacy'],
    attraction: ['tourist attraction', 'museum'],
    practical: ['atm', 'pharmacy'],
    all: ['restaurant', 'cafe', 'hotel'],
}

const CATEGORY_LABELS: Record<string, string> = {
    restaurant: 'Restoran',
    fast_food: 'Fast Food',
    cafe: 'Kafe',
    hotel: 'Otel',
    hostel: 'Hostel',
    guest_house: 'Pansiyon',
    atm: 'ATM',
    bank: 'Banka',
    pharmacy: 'Eczane',
    attraction: 'Turistik Yer',
}

const CATEGORY_EMOJIS: Record<string, string> = {
    restaurant: '🍽️',
    fast_food: '🍔',
    cafe: '☕',
    hotel: '🏨',
    hostel: '🛏️',
    guest_house: '🏠',
    atm: '🏧',
    bank: '🏦',
    pharmacy: '💊',
    attraction: '🏛️',
}

function inferCategory(poi: any, query: string): string {
    const normalizedQuery = query.toLowerCase()
    const categories = [
        poi?.classifications?.[0]?.names?.[0]?.name,
        poi?.categories?.[0],
        poi?.categorySet?.[0]?.id,
    ].filter(Boolean).join(' ').toLowerCase()

    if (normalizedQuery.includes('coffee') || normalizedQuery.includes('cafe') || categories.includes('cafe')) return 'cafe'
    if (normalizedQuery.includes('hostel')) return 'hostel'
    if (normalizedQuery.includes('guest')) return 'guest_house'
    if (normalizedQuery.includes('hotel') || categories.includes('hotel')) return 'hotel'
    if (normalizedQuery.includes('atm') || categories.includes('atm')) return 'atm'
    if (normalizedQuery.includes('bank') || categories.includes('bank')) return 'bank'
    if (normalizedQuery.includes('pharmacy') || categories.includes('pharmacy')) return 'pharmacy'
    if (normalizedQuery.includes('museum') || normalizedQuery.includes('tourist')) return 'attraction'
    if (normalizedQuery.includes('fast')) return 'fast_food'
    return 'restaurant'
}

function normalizeTomTomResult(item: any, query: string) {
    const category = inferCategory(item.poi, query)
    const address = item.address?.freeformAddress || [
        item.address?.streetName,
        item.address?.municipality,
    ].filter(Boolean).join(' ')

    return {
        id: `tomtom-${item.id || item.poi?.id || `${item.position?.lat}-${item.position?.lon}`}`,
        name: item.poi?.name || item.address?.freeformAddress || 'İsimsiz yer',
        lat: item.position?.lat,
        lng: item.position?.lon,
        category,
        categoryLabel: CATEGORY_LABELS[category] || item.poi?.categories?.[0] || category,
        emoji: CATEGORY_EMOJIS[category] || '📍',
        phone: item.poi?.phone || '',
        website: item.poi?.url || '',
        address: address || '',
        cuisine: '',
        stars: 0,
        rooms: 0,
        accommodationType: ['hotel', 'hostel', 'guest_house'].includes(category) ? CATEGORY_LABELS[category] : '',
        openingHours: '',
        internetAccess: false,
        wheelchair: '',
        dietVegan: false,
        dietVegetarian: false,
        priceRange: ['restaurant', 'cafe', 'fast_food'].includes(category) ? '₺₺' : '',
        source: 'tomtom',
    }
}

async function fetchTomTomPOIs(apiKey: string, lat: number, lng: number, radius: number, category: string) {
    const queries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.all
    const requests = queries.map(async (query) => {
        const params = new URLSearchParams({
            key: apiKey,
            lat: String(lat),
            lon: String(lng),
            radius: String(radius),
            limit: '20',
            countrySet: 'TR',
            language: 'tr-TR',
            view: 'TR',
        })

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 9000)
        try {
            const res = await fetch(`${TOMTOM_BASE_URL}/${encodeURIComponent(query)}.json?${params.toString()}`, {
                method: 'GET',
                signal: controller.signal,
            })
            if (!res.ok) throw new Error(`TomTom HTTP ${res.status}`)
            const json = await res.json()
            return (json.results || []).map((item: any) => normalizeTomTomResult(item, query))
        } finally {
            clearTimeout(timer)
        }
    })

    const settled = await Promise.allSettled(requests)
    const merged = settled.flatMap((item) => item.status === 'fulfilled' ? item.value : [])
    const seen = new Set<string>()

    return merged
        .filter((poi) => poi.name && poi.lat && poi.lng)
        .filter((poi) => {
            const key = `${poi.name.toLocaleLowerCase('tr-TR')}_${Math.round(poi.lat * 10000)}_${Math.round(poi.lng * 10000)}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
        .slice(0, category === 'atm' || category === 'pharmacy' ? 12 : 30)
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { lat, lng, radius = 2000, category = 'all' } = await req.json()
        const latNum = Number(lat)
        const lngNum = Number(lng)
        const radiusNum = Number(radius)

        if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
            return new Response(
                JSON.stringify({ error: 'lat ve lng sayısal değer olmalı.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const cacheKey = `tomtom_city_pois_${category}_${latNum.toFixed(3)}_${lngNum.toFixed(3)}_${radiusNum}`
        const { data: cached } = await supabase
            .from('api_cache')
            .select('response, created_at')
            .eq('cache_key', cacheKey)
            .maybeSingle()

        if (cached) {
            const age = (Date.now() - new Date(cached.created_at as string).getTime()) / (1000 * 60 * 60)
            if (age < CACHE_TTL_HOURS) {
                return new Response(
                    JSON.stringify({ ...cached.response, fromCache: true }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        const tomTomKey = Deno.env.get('TOMTOM_API_KEY')
        if (!tomTomKey) {
            throw new Error('TOMTOM_API_KEY tanımlı değil.')
        }

        const pois = await fetchTomTomPOIs(tomTomKey, latNum, lngNum, radiusNum, category)
        const result = { pois, data: pois, count: pois.length, category, radius: radiusNum, source: 'tomtom' }

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
        const message = error instanceof Error ? error.message : 'Beklenmeyen hata'
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
