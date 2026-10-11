import type { AppMode, PetState } from '../../types'

interface StatusBarProps {
  mode: AppMode
  petState?: PetState
}

export const StatusBar = ({ mode, petState = 'IDLE' }: StatusBarProps) => {
  return (
    <header className="app-header">
      <div className="brand-badge">
        <span className="brand-dot" aria-hidden="true" />
        <span className="brand-title">PUSSY</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div className="mode-badge" style={{ color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.1)' }}>
          {petState}
        </div>
        <div className="mode-badge">
          {mode === 'ar' ? 'AR Mode' : '3D Mode'}
        </div>
      </div>
    </header>
  )
}
