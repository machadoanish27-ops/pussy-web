import { useState, useCallback } from 'react'
import type { AppMode } from './types'
import { AppShell } from './components/ui/AppShell.tsx'
import { StatusBar } from './components/ui/StatusBar.tsx'
import { ControlDock } from './components/controls/ControlDock.tsx'
import { PetSceneContainer } from './scenes/PetSceneContainer.tsx'

export function App() {
  const [mode, setMode] = useState<AppMode>('normal')

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'normal' ? 'ar' : 'normal'))
  }, [])

  return (
    <AppShell>
      <StatusBar mode={mode} />
      <PetSceneContainer mode={mode} />
      <ControlDock mode={mode} onToggleMode={toggleMode} />
    </AppShell>
  )
}

export default App
