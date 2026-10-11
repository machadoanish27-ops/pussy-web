import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

export const AppShell = ({ children }: AppShellProps) => {
  return <div className="app-shell">{children}</div>
}
