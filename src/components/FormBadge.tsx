export default function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const cls =
    result === 'W'
      ? 'bg-green-600 text-white'
      : result === 'D'
        ? 'bg-gray-600 text-white'
        : 'bg-red-600 text-white'
  return (
    <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${cls}`}>
      {result}
    </span>
  )
}
