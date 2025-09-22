import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for Door2Door V2 application. Provide concise and helpful responses.'
        },
        ...messages
      ],
    })

    return Response.json({ response: result.text })
  } catch (error) {
    console.error('AI Chat Error:', error)
    return Response.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}
