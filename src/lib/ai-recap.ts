import { generateText, type LanguageModel } from 'ai'
import { fallbackRecap, type RecapFacts } from './summary'
import type { RecapSource } from './types'

/** Cheap, current multilingual model. Override with AI_GATEWAY_MODEL after checking /v1/models. */
export const DEFAULT_RECAP_MODEL = 'google/gemini-3.5-flash'

export function recapModelId(): string {
  const configured = process.env.AI_GATEWAY_MODEL?.trim()
  return configured || DEFAULT_RECAP_MODEL
}

const INSTRUCTIONS = `אתה שדרן של ליגת פלאדלייט: פיפא בין חברים, בעיקר זוגות, על כסף קטן.
כתוב סיכום קצר בעברית מדוברת, 80 עד 130 מילים, עם קריצה אבל בלי להשפיל אף אחד.
חוקים:
- השתמש רק בעובדות שב-JSON. אסור להמציא שמות, תוצאות, סכומים, שערים או אירועים.
- אין תיקו בליגה הזו. אל תזכיר תיקו.
- אל תציג את עצמך, אל תגיד שאתה מודל, ואל תכתוב כותרות או תבליטים.
- אם נתון חסר, פשוט דלג עליו.
- אפשר להזכיר את המצטיין, ההפתעה אם יש, ומי מעביר למי.`

export async function writeRecap(facts: RecapFacts): Promise<{ text: string; source: RecapSource; model: string | null }> {
  const fallback = fallbackRecap(facts)
  const model = recapModelId()
  try {
    const { text } = await generateText({
      model: model as LanguageModel,
      instructions: INSTRUCTIONS,
      prompt: JSON.stringify(facts),
      maxOutputTokens: 450,
      temperature: 0.7,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(20_000),
    })
    const cleaned = text.replace(/\*\*/g, '').trim()
    if (cleaned.length < 20) return { text: fallback, source: 'fallback', model: null }
    return { text: cleaned.slice(0, 1500), source: 'model', model }
  } catch (error) {
    console.error('night recap fell back', error instanceof Error ? error.name : 'error')
    return { text: fallback, source: 'fallback', model: null }
  }
}
