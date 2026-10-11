import type { AppMode } from '../../types'

interface StatusBarProps {
  mode: AppMode
}

export const StatusBar = ({ mode }: StatusBarProps) => {
  return (
    <header className="app-header">
      <div className="brand-badge">
        <span className="brand-dot" aria-hidden="true" />
        <span className="brand-title">PUSSY</span>
      </div>
      <div className="mode-badge">
        {mode === 'ar' ? 'AR Mode' : 'Pet Mode'}
      </div>
    </header>
  )
}
