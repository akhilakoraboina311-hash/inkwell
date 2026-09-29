import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { draft, tone = 'Professional', senderName = 'Jordan' } = await req.json()

    if (!draft || typeof draft !== 'string' || !draft.trim()) {
      return NextResponse.json({ error: 'Please provide an email draft to polish.' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured in .env.local.' }, { status: 500 })
    }

    const systemPrompt = `You are Inkwell, an elite executive email writing assistant.
Your task is to refine and rewrite the user's rough draft into a clear, articulate, and ready-to-send email.

Key Instructions:
1. Tone calibration:
   - "Professional": Crisp, polite, confident, respectful, and executive-level.
   - "Friendly": Warm, approachable, engaging, thoughtful, and natural.
   - "Persuasive": Inspiring, confident, value-focused, and action-oriented.
   - "Apologetic": Sincere, accountable, empathetic, and solution-focused.
2. Structure:
   - Include a concise, engaging subject line starting with "Subject: ".
   - Include an appropriate salutation.
   - Write clear, concise body paragraphs that preserve all intended facts and dates from the draft.
   - End with an appropriate sign-off and the sender name "${senderName}".
3. Formatting:
   - Output ONLY the final email text.
   - Do NOT wrap in markdown code blocks (\`\`\`).
   - Do NOT include any introductory or concluding conversational filler (e.g. "Here is your email:", "Let me know if you need changes").`

    const userMessage = `Tone: ${tone}\nSender: ${senderName}\n\nDraft:\n"""\n${draft.trim()}\n"""`

    // Call Groq API with primary model (openai/gpt-oss-120b) and fallback
    const modelsToTry = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']
    let polishedEmail = ''
    let lastError = null

    for (const model of modelsToTry) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.65,
            max_tokens: 800,
          }),
        })

        if (!groqResponse.ok) {
          const errData = await groqResponse.json().catch(() => ({}))
          throw new Error(errData?.error?.message || `Groq API responded with status ${groqResponse.status}`)
        }

        const data = await groqResponse.json()
        const text = data.choices?.[0]?.message?.content?.trim()
        if (text) {
          // Clean any unwanted wrapping backticks if the model enclosed it
          polishedEmail = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
          break
        }
      } catch (err: any) {
        lastError = err
        console.warn(`Groq model ${model} failed, trying next:`, err.message)
      }
    }

    if (!polishedEmail) {
      throw lastError || new Error('Failed to generate polished email from AI.')
    }

    return NextResponse.json({ polished_email: polishedEmail })
  } catch (error: any) {
    console.error('Error in /api/polish:', error)
    return NextResponse.json({ error: error.message || 'An unexpected error occurred while polishing.' }, { status: 500 })
  }
}
