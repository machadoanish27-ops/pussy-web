import { useState } from 'react'
import type { AppMode, PetState, PetStats } from '../../types'
import { SoundEffects } from '../../systems/audio/SoundEffects.ts'

interface StatusBarProps {
  mode: AppMode
  petState: PetState
  stats: PetStats
  level: number
  isSoccer: boolean
  soccerScore?: number
}

export const StatusBar = ({
  mode,
  petState,
  stats,
  level,
  isSoccer,
  soccerScore = 0,
}: StatusBarProps) => {
  const [muted, setMuted] = useState(SoundEffects.isMuted())

  const handleToggleMute = () => {
    const next = SoundEffects.toggleMute()
    setMuted(next)
  }

  return (
    <header className="app-header">
      {/* Brand & Mode Badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="brand-badge">
            <span className="brand-dot" aria-hidden="true" />
            <span className="brand-title">PUSSY</span>
          </div>

          <div
            className="mode-badge"
            style={{
              color: petState === 'HIT' || petState === 'FALLING' || petState === 'LYING' ? '#ef4444' : '#22c55e',
              borderColor: petState === 'HIT' || petState === 'FALLING' || petState === 'LYING' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.3)',
              background: petState === 'HIT' || petState === 'FALLING' || petState === 'LYING' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.12)',
            }}
          >
            {petState}
          </div>

          {mode === 'ar' && (
            <div className="mode-badge" style={{ color: '#ec4899', borderColor: 'rgba(236, 72, 153, 0.4)' }}>
              AR
            </div>
          )}
        </div>

        {/* Live Soccer Match Indicator */}
        {isSoccer && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#f59e0b',
            }}
          >
            <span>⚽ GOALS: {soccerScore}</span>
          </div>
        )}
      </div>

      {/* Stats Cluster & Sound Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Core Stats Bar */}
        <div className="stats-cluster">
          {/* Hunger */}
          <div className="stat-pill" title={`Hunger: ${stats.hunger}%`}>
            <span>🍗</span>
            <span className="stat-val">{stats.hunger}%</span>
          </div>

          {/* Happiness */}
          <div className="stat-pill" title={`Happiness: ${stats.happiness}%`}>
            <span>💖</span>
            <span className="stat-val">{stats.happiness}%</span>
          </div>

          {/* Energy */}
          <div className="stat-pill" title={`Energy: ${stats.energy}%`}>
            <span>⚡</span>
            <span className="stat-val">{stats.energy}%</span>
          </div>

          {/* Level / Coins */}
          <div className="stat-pill" title={`Level ${level} • ${stats.coins} Coins`}>
            <span style={{ color: '#f59e0b' }}>🪙</span>
            <span className="stat-val">{stats.coins}</span>
          </div>
        </div>

        {/* Mute Toggle Button */}
        <button
          type="button"
          onClick={handleToggleMute}
          className="icon-circle-btn"
          title={muted ? 'Unmute Audio' : 'Mute Audio'}
          aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </header>
  )
}
