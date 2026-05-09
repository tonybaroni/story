import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { parseTimeToSeconds } from '@/lib/swim-utils'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { swimcloud_url } = await req.json()
  if (!swimcloud_url) {
    return NextResponse.json({ error: 'swimcloud_url required' }, { status: 400 })
  }

  const prompt = `Search for the swimmer's best SCY (short course yards) times from their SwimCloud profile.

SwimCloud profile URL: ${swimcloud_url}

Search SwimCloud and swimming results databases to find their personal best (fastest ever) SCY times for these events:
- 50 yard backstroke
- 100 yard backstroke
- 200 yard backstroke
- 50 yard freestyle
- 100 yard freestyle
- 200 yard freestyle

After searching, return ONLY a JSON object — no other text before or after the JSON. Use this exact structure:
{
  "50_back": { "time_display": "27.45" },
  "100_back": { "time_display": "58.12" },
  "200_back": { "time_display": "2:03.45" },
  "50_free": { "time_display": "23.10" },
  "100_free": { "time_display": "50.85" },
  "200_free": { "time_display": "1:52.34" }
}

Only include events where you found a valid time. Times under 60 seconds should be like "27.45", times 60+ seconds should be in M:SS.ss format like "2:03.45".`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20260209' as any, name: 'web_search' }],
    messages,
  })

  // web_search has an internal 10-iteration limit; pause_turn means it needs another call
  let iterations = 0
  while (response.stop_reason === 'pause_turn' && iterations < 3) {
    iterations++
    messages.push({ role: 'assistant', content: response.content })
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20260209' as any, name: 'web_search' }],
      messages,
    })
  }

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return NextResponse.json({ error: 'No text response from AI' }, { status: 500 })
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Could not parse times from AI response' }, { status: 500 })
  }

  let raw: Record<string, { time_display: string }>
  try {
    raw = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in AI response' }, { status: 500 })
  }

  // Enrich with time_seconds computed from display string
  const result: Record<string, { time_display: string; time_seconds: number }> = {}
  for (const [event, data] of Object.entries(raw)) {
    if (data?.time_display) {
      result[event] = {
        time_display: data.time_display,
        time_seconds: parseTimeToSeconds(data.time_display),
      }
    }
  }

  return NextResponse.json(result)
}
