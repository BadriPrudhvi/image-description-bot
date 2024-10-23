import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    const ai = getRequestContext().env.AI
    const gateway_id = getRequestContext().env.CLOUDFLARE_GATEWAY_ID
    
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const question = formData.get('question') as string

    const imageInput = Array.from(new Uint8Array(await imageFile.arrayBuffer()))

    const systemPrompt = `You are a helpful assistant. Your task is to answer questions about the provided image accurately and concisely. It is very important for my career that you follow these instructions exactly.`

    const userPrompt = `${question}`

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ]

    try {
        const response = await ai.run("@cf/meta/llama-3.2-11b-vision-instruct",
            { 
                messages, 
                temperature: 0.0, 
                max_tokens: 1024, 
                image: imageInput,
            }, 
            {
                gateway: {
                    id: gateway_id,
                    skipCache: false,
                    cacheTtl: 3600000,
                },
            },
        )
        return NextResponse.json({ insights: response.response })
    } catch (error) {
        console.error('Error generating insights:', error)
        return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
    }
}
