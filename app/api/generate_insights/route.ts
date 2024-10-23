import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    const ai = getRequestContext().env.AI
    const gateway_id = getRequestContext().env.CLOUDFLARE_GATEWAY_ID
    
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const language = formData.get('language') as string
    const length = formData.get('length') as string

    const imageInput = Array.from(new Uint8Array(await imageFile.arrayBuffer()))

    const systemPrompt = `You are an expert image insights generator. Your task is to generate concise and impactful insights about an image. It is very important for my career that you follow the instructions exactly.`

    const userPrompt = `Generate interesting insights about the provided image in ${language} language. Make sure the insights are ${length} and clear. `

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ]

    try {
        const response = await ai.run("@cf/meta/llama-3.2-11b-vision-instruct",
            { 
                messages, 
                image: imageInput,
                temperature: 0.0, 
                max_tokens: 512, 
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
