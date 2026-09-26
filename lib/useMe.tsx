'use client'
import { createContext, useContext } from 'react'
import type { Profile } from './types'

export const MeContext = createContext<Profile | null>(null)
export function useMe() {
  const me = useContext(MeContext)
  if (!me) throw new Error('useMe must be used inside the app shell')
  return me
}
