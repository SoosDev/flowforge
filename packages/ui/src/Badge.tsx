type Variant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted'

interface Props {
  label: string
  variant?: Variant
}

const VARIANTS: Record<Variant, string> = {
  default: 'bg-slate-700 text-slate-200',
  success: 'bg-green-900/60 text-green-300 border border-green-700/50',
  danger: 'bg-red-900/60 text-red-300 border border-red-700/50',
  warning: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50',
  info: 'bg-blue-900/60 text-blue-300 border border-blue-700/50',
  muted: 'bg-slate-800 text-slate-400',
}

export function Badge({ label, variant = 'default' }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${VARIANTS[variant]}`}>
      {label}
    </span>
  )
}
