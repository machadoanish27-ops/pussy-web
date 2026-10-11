import type { AppMode } from '../../types'

interface ControlDockProps {
  mode: AppMode
  onToggleMode: () => void
  onTapPet?: () => void
}

export const ControlDock = ({ mode, onToggleMode, onTapPet }: ControlDockProps) => {
  return (
    <footer className="app-dock">
      <nav className="dock-container" aria-label="Pet controls">
        <button
          type="button"
          onClick={onTapPet}
          className="dock-item-placeholder"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          aria-label="Interact with Pikachu"
        >
          <span>⚡</span>
          <span>Tap Pikachu</span>
        </button>
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
