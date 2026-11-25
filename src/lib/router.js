import { useEffect, useState } from 'react'

export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const on = () => { setHash(window.location.hash.slice(1) || '/'); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash.split('/').filter(Boolean)
}

export const go = (path) => { window.location.hash = path }
