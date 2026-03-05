// supabase/functions/travel-assistant/index.ts
// Gemini 1.5 Flash destekli gezi asistanı
// API key: GEMINI_API_KEY Supabase secret olarak tanımlı olmalı

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        if (!GEMINI_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'GEMINI_API_KEY tanımlı değil.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const body = await req.json() as {
            message: string
            context?: {
                city?: string
                days?: number
                startDate?: string
                currentDay?: number
                places?: Array<{ name: string; category: string; day: number }>
                completedPlaces?: string[]
                remainingTime?: number // dakika
            }
            history?: Array<{ role: string; text: string }>
        }

        const { message, context, history = [] } = body

        // Sistem prompt: asistanın ne olduğunu ve bağlamı anlatıyoruz
        const systemPrompt = buildSystemPrompt(context)

        // Geçmiş mesajlardan Gemini formatına çevir
        const geminiHistory = history.map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.text }],
        }))

        // Mevcut mesajı ekle
        const contents = [
            ...geminiHistory,
            { role: 'user', parts: [{ text: message }] },
        ]

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemPrompt }],
                    },
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 512,
                        topP: 0.9,
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                    ],
                }),
            }
        )

        if (!geminiRes.ok) {
            const errText = await geminiRes.text()
            console.error('Gemini error:', errText)
            return new Response(
                JSON.stringify({ error: 'Gemini API hatası: ' + errText }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const geminiData = await geminiRes.json() as {
            candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> }
                finishReason?: string
            }>
        }

        const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Yanıt alınamadı.'

        return new Response(
            JSON.stringify({ reply: replyText }),
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

// ─── Sistem Prompt Oluşturucu ─────────────────────────────────────────────────
function buildSystemPrompt(context?: {
    city?: string
    days?: number
    startDate?: string
    currentDay?: number
    places?: Array<{ name: string; category: string; day: number }>
    completedPlaces?: string[]
    remainingTime?: number
}): string {
    let prompt = `Sen "Gezi Asistanı" adlı, Türkiye'yi seven ve bilen samimi bir seyahat rehberisin.
Kısa, net ve pratik yanıtlar verirsin. Emoji kullanmaktan çekinmezsin.
Yanıtlarını Türkçe verirsin.
Yalnızca seyahat, gezi, yemek, konaklama ve şehir rehberliği konularında yardımcı olursun.
`

    if (context?.city) {
        prompt += `\nKullanıcı şu an ${context.city} şehrinde gezi planlıyor veya gezide.`
    }
    if (context?.days) {
        prompt += ` Gezi toplam ${context.days} gün.`
    }
    if (context?.startDate) {
        prompt += ` Başlangıç tarihi: ${context.startDate}.`
    }
    if (context?.currentDay) {
        prompt += ` Şu an ${context.currentDay}. günde.`
    }
    if (context?.remainingTime !== undefined) {
        if (context.remainingTime > 0) {
            prompt += ` Bugünkü planında yaklaşık ${context.remainingTime} dakika boş vakti var.`
        }
    }
    if (context?.places && context.places.length > 0) {
        const todayPlaces = context.places
            .filter(p => p.day === context.currentDay)
            .map(p => p.name)
        if (todayPlaces.length > 0) {
            prompt += ` Bugünkü plan: ${todayPlaces.join(', ')}.`
        }
    }
    if (context?.completedPlaces && context.completedPlaces.length > 0) {
        prompt += ` Tamamlanan yerler: ${context.completedPlaces.join(', ')}.`
    }

    prompt += `\n\nKullanıcının sorusuna göre pratik, özgün ve eğlenceli öneriler sun.
"Bilmiyorum" deme, en azından genel bir öneri yap.
Yanıtların 2-4 cümle olsun, çok uzun yazma.`

    return prompt
}
