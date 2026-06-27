const map = {
  W: { bg: '#1f7a3d', fg: '#f1ead8' },
  D: { bg: '#e8e0cd', fg: '#1c1916' },
  L: { bg: '#d9531e', fg: '#f6efdf' },
}

export default function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const { bg, fg } = map[result]
  return (
    <div
      className="w-[19px] h-[19px] flex items-center justify-center text-[12px] font-bold border border-[rgba(28,25,22,0.4)]"
      style={{ background: bg, color: fg, fontFamily: 'var(--font-barlow)' }}
    >
      {result}
    </div>
  )
}
