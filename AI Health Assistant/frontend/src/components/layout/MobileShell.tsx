import type { PropsWithChildren } from 'react'

const MobileShell = ({ children }: PropsWithChildren) => (
  <div className="mx-auto min-h-screen max-w-[430px] bg-white shadow-sm">{children}</div>
)

export default MobileShell
