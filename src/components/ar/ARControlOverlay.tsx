import { useState } from 'react'

interface ARControlOverlayProps {
  isPlaced: boolean
  onRotateLeft: () => void
  onRotateRight: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onRelocate: () => void
}

/**
 * ARControlOverlay
 *
 * Provides on-screen guidance and one-handed quick controls for AR Mode:
 * - Placement / drag / pinch guidance banner
 * - Quick rotate buttons (360° rotation)
 * - Quick scale / zoom buttons
 * - Re-center & re-anchor button
 */
export const ARControlOverlay = ({
  isPlaced,
  onRotateLeft,
  onRotateRight,
  onZoomIn,
  onZoomOut,
  onReset,
  onRelocate,
}: ARControlOverlayProps) => {
  const [showBanner, setShowBanner] = useState(true)

  return (
    <div className="ar-overlay-root">
      {/* Guidance Banner */}
      {showBanner && (
        <div className="ar-guidance-banner">
          <div className="ar-guidance-content">
            <span className="ar-guidance-icon">{isPlaced ? '✨' : '📍'}</span>
            <span className="ar-guidance-text">
              {isPlaced
                ? 'Drag to move • Pinch to scale • Twist to rotate'
                : 'Tap floor to place Pikachu!'}
            </span>
          </div>
          <button
            type="button"
            className="ar-banner-close"
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss guidance"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Quick Action Dock (Right Side) */}
      <div className="ar-quick-dock">
        <button
          type="button"
          className="ar-dock-pill"
          onClick={onRotateLeft}
          title="Rotate Left"
          aria-label="Rotate pet left"
        >
          <span className="ar-pill-icon">↺</span>
          <span className="ar-pill-label">Rotate</span>
        </button>

        <button
          type="button"
          className="ar-dock-pill"
          onClick={onRotateRight}
          title="Rotate Right"
          aria-label="Rotate pet right"
        >
          <span className="ar-pill-icon">↻</span>
          <span className="ar-pill-label">Rotate</span>
        </button>

        <button
          type="button"
          className="ar-dock-pill"
          onClick={onZoomIn}
          title="Enlarge Pet"
          aria-label="Make pet larger"
        >
          <span className="ar-pill-icon">➕</span>
          <span className="ar-pill-label">Size</span>
        </button>

        <button
          type="button"
          className="ar-dock-pill"
          onClick={onZoomOut}
          title="Shrink Pet"
          aria-label="Make pet smaller"
        >
          <span className="ar-pill-icon">➖</span>
          <span className="ar-pill-label">Size</span>
        </button>

        <button
          type="button"
          className="ar-dock-pill"
          onClick={onRelocate}
          title="Re-anchor Floor Position"
          aria-label="Move pet to new surface location"
        >
          <span className="ar-pill-icon">📍</span>
          <span className="ar-pill-label">Place</span>
        </button>

        <button
          type="button"
          className="ar-dock-pill"
          onClick={onReset}
          title="Reset Size & Center"
          aria-label="Reset pet size and center position"
        >
          <span className="ar-pill-icon">🎯</span>
          <span className="ar-pill-label">Center</span>
        </button>
      </div>
    </div>
  )
}
