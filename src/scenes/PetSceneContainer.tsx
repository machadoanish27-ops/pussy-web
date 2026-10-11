import type { AppMode } from '../types'

interface PetSceneContainerProps {
  mode: AppMode
}

export const PetSceneContainer = ({ mode }: PetSceneContainerProps) => {
  return (
    <main className="scene-viewport" aria-label="3D pet viewport">
      <div className="scene-foundation-placeholder">
        <div className="foundation-icon-circle">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Minimal Cat Face Icon */}
            <path d="M12 5c-4.418 0-8 3.582-8 8 0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4 0-4.418-3.582-8-8-8z" />
            <path d="M4 10l-2-6 6 2" />
            <path d="M20 10l2-6-6 2" />
            <circle cx="9" cy="13" r="1" fill="currentColor" />
            <circle cx="15" cy="13" r="1" fill="currentColor" />
          </svg>
        </div>
        <span className="foundation-tag">Phase 1 • Foundation</span>
        <h1 className="foundation-title">PUSSY Virtual Pet</h1>
        <p className="foundation-subtitle">
          {mode === 'ar'
            ? 'AR camera surface tracking ready to host 3D scene in Phase 2.'
            : 'Full-screen mobile viewport ready to host 3D cat scene in Phase 2.'}
        </p>
      </div>
    </main>
  )
}
