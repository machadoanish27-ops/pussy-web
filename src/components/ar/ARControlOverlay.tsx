import { useState, useEffect } from 'react'

interface ARControlOverlayProps {
  isPlaced: boolean
  isWebXR?: boolean
  hasInteracted?: boolean
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
 * - Dynamic 3-stage instruction banner:
 *     1. "Move phone to detect floor surface"
 *     2. "Tap floor to place Pikachu"
 *     3. "Drag • Pinch • Rotate" (auto-hides after interaction)
 * - Honest capability tag: WebXR vs Camera Passthrough (Floor Anchored)
 * - One-handed quick action dock: 360° rotate, size, center, relocate
 */
export const ARControlOverlay = ({
  isPlaced,
  isWebXR = false,
  hasInteracted = false,
  onRotateLeft,
  onRotateRight,
  onZoomIn,
  onZoomOut,
  onReset,
  onRelocate,
}: ARControlOverlayProps) => {
  const [showBanner, setShowBanner] = useState(true)

  // Auto-hide guidance banner 4 seconds after first interaction
  useEffect(() => {
    if (hasInteracted && isPlaced) {
      const timer = setTimeout(() => {
        setShowBanner(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [hasInteracted, isPlaced])

  return (
    <div className="ar-overlay-root">
      {/* Guidance Banner */}
      {showBanner && (
        <div className="ar-guidance-banner">
          <div className="ar-guidance-content">
            <span className="ar-guidance-icon">{isPlaced ? '✨' : '📍'}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="ar-guidance-text">
                {isPlaced
                  ? 'Drag to move • Pinch to scale • Twist to rotate'
                  : 'Move phone to find floor → Tap to place Pikachu!'}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.65)' }}>
                {isWebXR
                  ? '🥽 WebXR Immersive Surface Tracking'
                  : '📷 Camera AR (Floor Surface Anchored)'}
              </span>
            </div>
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
