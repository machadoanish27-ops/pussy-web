import type { AppMode, PetState } from '../../types'
import type { VoiceStatus } from '../../systems/voice/VoiceRepeater.ts'

interface ControlDockProps {
  mode: AppMode
  petState: PetState
  voiceStatus: VoiceStatus
  voiceMessage?: string
  isSoccer: boolean
  onToggleMode: () => void
  onTalk: () => void
  onPet: () => void
  onHit: () => void
  onFeedMilk: () => void
  onFeedFish: () => void
  onToggleSoccer: () => void
}

/**
 * ControlDock
 *
 * Full-featured mobile-first action dock with touch-friendly buttons:
 * Talk (Microphone), Pet, Hit, Milk, Fish, Soccer, and AR Mode.
 */
export const ControlDock = ({
  mode,
  petState,
  voiceStatus,
  voiceMessage,
  isSoccer,
  onToggleMode,
  onTalk,
  onPet,
  onHit,
  onFeedMilk,
  onFeedFish,
  onToggleSoccer,
}: ControlDockProps) => {
  const isLocked = petState === 'FALLING' || petState === 'LYING' || petState === 'RECOVERING'

  return (
    <footer className="app-dock">
      {/* Voice status banner tooltip if recording or speaking */}
      {voiceStatus !== 'idle' && (
        <div className="voice-status-banner">
          <span className="voice-status-dot" />
          <span>{voiceMessage || voiceStatus}</span>
        </div>
      )}

      <nav className="dock-container" aria-label="Virtual pet interactions">
        {/* 1. Voice Repeater */}
        <button
          type="button"
          onClick={onTalk}
          className={`dock-btn ${voiceStatus === 'recording' ? 'dock-btn-active' : ''}`}
          disabled={isLocked}
          title="Talk with Pikachu"
          aria-label="Talk with Pikachu"
        >
          <span className="dock-btn-icon">🎤</span>
          <span className="dock-btn-label">
            {voiceStatus === 'recording' ? 'Listening...' : voiceStatus === 'speaking' ? 'Repeating' : 'Talk'}
          </span>
        </button>

        {/* 2. Pet */}
        <button
          type="button"
          onClick={onPet}
          className="dock-btn"
          disabled={isLocked}
          title="Pet Pikachu"
          aria-label="Pet Pikachu"
        >
          <span className="dock-btn-icon">💖</span>
          <span className="dock-btn-label">Pet</span>
        </button>

        {/* 3. Hit (P0 Hit/Fall/Recover) */}
        <button
          type="button"
          onClick={onHit}
          className="dock-btn dock-btn-danger"
          disabled={isLocked}
          title="Hit Pikachu"
          aria-label="Hit Pikachu"
        >
          <span className="dock-btn-icon">💥</span>
          <span className="dock-btn-label">Hit</span>
        </button>

        {/* 4. Milk */}
        <button
          type="button"
          onClick={onFeedMilk}
          className="dock-btn"
          disabled={isLocked || isSoccer}
          title="Feed Milk"
          aria-label="Feed Milk"
        >
          <span className="dock-btn-icon">🥛</span>
          <span className="dock-btn-label">Milk</span>
        </button>

        {/* 5. Fish */}
        <button
          type="button"
          onClick={onFeedFish}
          className="dock-btn"
          disabled={isLocked || isSoccer}
          title="Feed Fish"
          aria-label="Feed Fish"
        >
          <span className="dock-btn-icon">🐟</span>
          <span className="dock-btn-label">Fish</span>
        </button>

        {/* 6. Soccer Mini-Game */}
        <button
          type="button"
          onClick={onToggleSoccer}
          className={`dock-btn ${isSoccer ? 'dock-btn-highlight' : ''}`}
          disabled={isLocked}
          title={isSoccer ? 'Exit Soccer' : 'Play Head Soccer'}
          aria-label={isSoccer ? 'Exit Soccer' : 'Play Head Soccer'}
        >
          <span className="dock-btn-icon">⚽</span>
          <span className="dock-btn-label">{isSoccer ? 'Exit' : 'Soccer'}</span>
        </button>

        {/* 7. AR Camera Mode */}
        <button
          type="button"
          onClick={onToggleMode}
          className={`dock-btn ${mode === 'ar' ? 'dock-btn-ar' : ''}`}
          title={mode === 'normal' ? 'Switch to AR Mode' : 'Switch to 3D Mode'}
          aria-label={mode === 'normal' ? 'Switch to AR Mode' : 'Switch to 3D Mode'}
        >
          <span className="dock-btn-icon">📷</span>
          <span className="dock-btn-label">{mode === 'normal' ? 'AR' : '3D'}</span>
        </button>
      </nav>
    </footer>
  )
}
