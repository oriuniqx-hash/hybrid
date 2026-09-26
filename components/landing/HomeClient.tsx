'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import LandingPage from './LandingPage'
import AuthModal from '../auth/AuthModal'

export default function HomeClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showAuth = searchParams.get('auth') === 'true'

  function closeAuth() {
    router.replace('/')
  }

  return (
    <>
      <LandingPage />
      {showAuth && <AuthModal onClose={closeAuth} />}
    </>
  )
}
