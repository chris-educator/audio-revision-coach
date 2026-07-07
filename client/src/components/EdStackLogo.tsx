import { EdStackMark } from './EdStackMark'

interface EdStackLogoProps {
  size?: number
  /** Light page background vs dark banner */
  tone?: 'light' | 'dark'
  inheritSize?: boolean
}

export function EdStackLogo({
  size = 28,
  tone = 'light',
  inheritSize = false,
}: EdStackLogoProps) {
  const edColor = tone === 'dark' ? '#FAFAFA' : '#09090B'

  return (
    <div className="edstack-logo">
      <div
        className="inline-flex items-center gap-[0.35em]"
        style={
          inheritSize
            ? { fontSize: 'inherit', fontWeight: 800, letterSpacing: '-0.035em' }
            : undefined
        }
      >
        <EdStackMark size={size} emSize={inheritSize} tone={tone} className="shrink-0" />
        <span
          className="font-heading"
          style={{
            fontWeight: 800,
            fontSize: inheritSize ? 'inherit' : 18,
            letterSpacing: inheritSize ? 'inherit' : '-0.02em',
          }}
        >
          <span style={{ color: edColor }}>Ed</span>
          <span style={{ color: 'var(--color-stack-green, #22c55e)' }}>Stack</span>
        </span>
      </div>
    </div>
  )
}
