'use client'

import { ErrorBlock } from '@/components/ui'

export default function GlobalErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorBlock message={error.message || 'העמוד נתקע באמצע. אפשר לנסות שוב.'} onRetry={reset} />
}
