import type { AppMode } from '../../types'

interface ControlDockProps {
  mode: AppMode
  onToggleMode: () => void
}

export const ControlDock = ({ mode, onToggleMode }: ControlDockProps) => {
  return (
    <footer className="app-dock">
      <nav className="dock-container" aria-label="Pet controls">
        <div className="dock-item-placeholder">
          <span>🐾</span>
          <span>Interactions</span>
        </div>
        <button
          type="button"
          onClick={onToggleMode}
          className="mode-badge"
          style={{ cursor: 'pointer', background: 'transparent' }}
          aria-label="Toggle AR mode"
        >
          {mode === 'normal' ? 'Switch to AR' : 'Switch to 3D'}
        </button>
      </nav>
    </footer>
  )
}
