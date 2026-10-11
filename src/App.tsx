import { useState, useCallback, useMemo } from 'react'
import type { AppMode, PetState } from './types'
import { AppShell } from './components/ui/AppShell.tsx'
import { StatusBar } from './components/ui/StatusBar.tsx'
import { ControlDock } from './components/controls/ControlDock.tsx'
import { PetSceneContainer } from './scenes/PetSceneContainer.tsx'
import { PetAnimationController, PetInteractionController } from './systems/pet'

export function App() {
  const [mode, setMode] = useState<AppMode>('normal')
  const [petState] = useState<PetState>('IDLE')

  // Core decoupled engine controllers
  const animationController = useMemo(
    () => new PetAnimationController({ defaultState: 'IDLE' }),
    []
  )
  const interactionController = useMemo(
    () => new PetInteractionController(),
    []
  )

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'normal' ? 'ar' : 'normal'))
  }, [])

  const handlePetTap = useCallback(() => {
    interactionController.handleTap()
  }, [interactionController])

  return (
    <AppShell>
      <StatusBar mode={mode} petState={petState} />
      <PetSceneContainer
        mode={mode}
        animationController={animationController}
        interactionController={interactionController}
        onTap={handlePetTap}
      />
      <ControlDock
        mode={mode}
        onToggleMode={toggleMode}
        onTapPet={handlePetTap}
      />
    </AppShell>
  )
}

export default App
