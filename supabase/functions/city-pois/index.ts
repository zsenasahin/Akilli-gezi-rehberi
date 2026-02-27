// supabase/functions/city-pois/index.ts
// Bir şehrin çevresindeki TÜM ilgi noktalarını getirir.
// Kategoriler: restaurant, cafe, bar, hotel, atm, pharmacy, attraction
// Overpass API + Cache (24h TTL)

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

// ─── Fiyat aralığı tahmini ───
function estimatePriceRange(tags: any): string {
    // OSM'de bazen 'price_range' veya 'fee' tag'leri olabilir
    if (tags.price_range) return tags.price_range
    if (tags['diet:vegan'] === 'only' || tags['diet:vegetarian'] === 'only') return '₺'
    if (tags.stars) {
        const s = parseInt(tags.stars)
        if (s >= 5) return '₺₺₺₺'
        if (s >= 4) return '₺₺₺'
        if (s >= 3) return '₺₺'
        return '₺'
    }
    if (tags.amenity === 'fast_food') return '₺'
    if (tags.amenity === 'cafe') return '₺₺'
    if (tags.amenity === 'restaurant') return '₺₺'
    return ''
}

// ─── Mutfak türünü Türkçe'ye çevir ───
function translateCuisine(cuisine: string): string {
    if (!cuisine) return ''
    const map: Record<string, string> = {
        'turkish': 'Türk Mutfağı', 'kebab': 'Kebap', 'pizza': 'Pizza',
        'burger': 'Burger', 'seafood': 'Deniz Ürünleri', 'italian': 'İtalyan',
        'chinese': 'Çin', 'japanese': 'Japon', 'indian': 'Hint',
        'mexican': 'Meksika', 'french': 'Fransız', 'asian': 'Asya',
        'mediterranean': 'Akdeniz', 'breakfast': 'Kahvaltı', 'coffee': 'Kahve',
        'dessert': 'Tatlı', 'ice_cream': 'Dondurma', 'bakery': 'Fırın',
        'pide': 'Pide', 'lahmacun': 'Lahmacun', 'doner': 'Döner',
        'fish': 'Balık', 'regional': 'Yöresel', 'international': 'Uluslararası',
        'sandwich': 'Sandviç', 'sushi': 'Suşi', 'steak': 'Steak',
        'chicken': 'Tavuk', 'soup': 'Çorba', 'grill': 'Izgara',
        'tea': 'Çay', 'cake': 'Pasta',
    }
    // Birden fazla mutfak virgülle ayrılabilir
    return cuisine.split(';').map(c => {
        const key = c.trim().toLowerCase()
        return map[key] || c.trim()
    }).join(', ')
}

// ─── Konaklama türünü Türkçe'ye çevir ───
function translateAccommodationType(type: string): string {
    const map: Record<string, string> = {
        'hotel': 'Otel', 'hostel': 'Hostel', 'guest_house': 'Pansiyon',
        'motel': 'Motel', 'apartment': 'Apart', 'camp_site': 'Kamp Alanı',
        'chalet': 'Dağ Evi', 'bed_and_breakfast': 'B&B',
    }
    return map[type] || 'Otel'
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { lat, lng, radius = 2000, category = 'all' } = await req.json()

        if (!lat || !lng) {
            return new Response(
                JSON.stringify({ error: 'lat ve lng parametreleri gerekli.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ─── Cache kontrolü ───
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const cacheKey = `city_pois_${category}_${lat.toFixed(3)}_${lng.toFixed(3)}_${radius}`
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

        // ─── Kategoriye göre Overpass Query oluştur ───
        let overpassFilter = ''
        const limit = 30

        switch (category) {
            case 'restaurant':
                overpassFilter = `node["amenity"="restaurant"](around:${radius},${lat},${lng});`
                break
            case 'cafe':
                overpassFilter = `node["amenity"~"cafe|coffee_shop"](around:${radius},${lat},${lng});`
                break
            case 'bar':
                overpassFilter = `node["amenity"~"bar|pub|nightclub"](around:${radius},${lat},${lng});`
                break
            case 'fast_food':
                overpassFilter = `node["amenity"="fast_food"](around:${radius},${lat},${lng});`
                break
            case 'hotel':
                overpassFilter = `node["tourism"~"hotel|hostel|guest_house|motel"](around:${radius},${lat},${lng});`
                break
            case 'atm':
                overpassFilter = `node["amenity"="atm"](around:${radius},${lat},${lng});node["amenity"="bank"](around:${radius},${lat},${lng});`
                break
            case 'pharmacy':
                overpassFilter = `node["amenity"="pharmacy"](around:${radius},${lat},${lng});`
                break
            case 'attraction':
                overpassFilter = `node["tourism"~"attraction|museum|viewpoint|artwork"](around:${radius},${lat},${lng});node["historic"](around:${radius},${lat},${lng});`
                break
            case 'all':
            default:
                // Tüm yeme-içme + konaklama
                overpassFilter = `
                    node["amenity"~"restaurant|cafe|fast_food|bar|pub"](around:${radius},${lat},${lng});
                    node["tourism"~"hotel|hostel|guest_house"](around:${radius},${lat},${lng});
                `
                break
        }

        const query = `[out:json][timeout:20];(${overpassFilter});out body ${limit};`
        const overpassData = await queryOverpass(query)

        // ─── Parse sonuçları ───
        const pois = overpassData.elements
            .filter((el: any) => el.tags?.name)
            .map((el: any) => {
                const tags = el.tags || {}
                const poiCategory = tags.tourism || tags.amenity || tags.historic || 'other'

                return {
                    id: el.id,
                    name: tags.name,
                    nameEn: tags['name:en'] || '',
                    lat: el.lat || el.center?.lat,
                    lng: el.lon || el.center?.lon,
                    category: poiCategory,
                    categoryLabel: getCategoryLabel(poiCategory),
                    // İletişim
                    phone: tags.phone || tags['contact:phone'] || '',
                    website: tags.website || tags['contact:website'] || '',
                    email: tags.email || tags['contact:email'] || '',
                    // Adres
                    address: [
                        tags['addr:street'],
                        tags['addr:housenumber'],
                        tags['addr:city'],
                    ].filter(Boolean).join(' ') || tags['addr:full'] || '',
                    // Yeme-içme detayları
                    cuisine: translateCuisine(tags.cuisine || ''),
                    dietVegetarian: tags['diet:vegetarian'] === 'yes',
                    dietVegan: tags['diet:vegan'] === 'yes',
                    // Konaklama detayları
                    stars: parseInt(tags.stars) || 0,
                    rooms: parseInt(tags.rooms) || 0,
                    accommodationType: tags.tourism ? translateAccommodationType(tags.tourism) : '',
                    // Genel
                    openingHours: tags.opening_hours || '',
                    wheelchair: tags.wheelchair || '',
                    internetAccess: tags.internet_access === 'wlan' || tags.internet_access === 'yes',
                    smoking: tags.smoking || '',
                    priceRange: estimatePriceRange(tags),
                    // Emoji
                    emoji: getCategoryEmoji(poiCategory),
                }
            })
            .filter((p: any) => p.lat && p.lng)

        const result = { pois, count: pois.length, category, radius }

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

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// ─── Yardımcı: Kategori etiketi ───
function getCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
        'restaurant': 'Restoran', 'cafe': 'Kafe', 'fast_food': 'Fast Food',
        'bar': 'Bar', 'pub': 'Pub', 'nightclub': 'Gece Kulübü',
        'hotel': 'Otel', 'hostel': 'Hostel', 'guest_house': 'Pansiyon',
        'motel': 'Motel', 'atm': 'ATM', 'bank': 'Banka',
        'pharmacy': 'Eczane', 'attraction': 'Turistik Yer',
        'museum': 'Müze', 'viewpoint': 'Manzara Noktası',
        'artwork': 'Sanat Eseri', 'castle': 'Kale', 'monument': 'Anıt',
        'ruins': 'Harabe', 'archaeological_site': 'Arkeolojik Alan',
        'coffee_shop': 'Kahveci',
    }
    return map[cat] || cat
}

// ─── Yardımcı: Kategori emoji ───
function getCategoryEmoji(cat: string): string {
    const map: Record<string, string> = {
        'restaurant': '🍽️', 'cafe': '☕', 'fast_food': '🍔',
        'bar': '🍺', 'pub': '🍻', 'nightclub': '🎶',
        'hotel': '🏨', 'hostel': '🛏️', 'guest_house': '🏠',
        'motel': '🏨', 'atm': '🏧', 'bank': '🏦',
        'pharmacy': '💊', 'attraction': '🏛️',
        'museum': '🎨', 'viewpoint': '👁️',
        'artwork': '🖼️', 'castle': '🏰', 'monument': '🗿',
        'ruins': '🏚️', 'archaeological_site': '⛏️',
    }
    return map[cat] || '📍'
}
