interface Props {
  badge: string
  title: string
  sub: string
}

export default function PageHeader({ badge, title, sub }: Props) {
  return (
    <header className="flex-none px-[18px] pt-[13px] bg-[#ece4d2]">
      <div className="flex items-center justify-between text-[11px] font-semibold tracking-[.22em] uppercase text-[#6f6757]"
        style={{ fontFamily: 'var(--font-barlow)' }}>
        <span>Floodlight League</span>
        <span>{badge}</span>
      </div>
      <div className="h-[3px] bg-[#1c1916] my-[9px]" />
      <div className="text-[34px] leading-[0.86] uppercase tracking-[.005em]"
        style={{ fontFamily: 'var(--font-anton)' }}>
        {title}
      </div>
      <div className="text-[13.5px] text-[#6f6757] my-[7px] italic"
        style={{ fontFamily: 'var(--font-spectral)' }}>
        {sub}
      </div>
      <div className="h-[2px] bg-[#1c1916]" />
      <div className="h-[1px] bg-[#1c1916] mt-[2px]" />
    </header>
  )
}
