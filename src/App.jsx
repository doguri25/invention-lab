import { useEffect, useState } from 'react'
import { useApp } from './lib/store'
import { useRoute, go } from './lib/router'
import { SaveBadge } from './components/ui'
import { WORKS } from './data/content'
import Join from './pages/Join'
import Home from './pages/Home'
import Session from './pages/Session'
import LabPage from './pages/LabPage'
import Journal from './pages/Journal'
import Words from './pages/Words'
import Practice from './pages/Practice'
import Teacher from './pages/Teacher'

function Prefs() {
  const prefs = useApp((s) => s.prefs)
  const setPrefs = useApp((s) => s.setPrefs)
  return (
    <>
      <button className="tb-btn icon" title="글자 크기" aria-label={`글자 크기 바꾸기(지금 ${prefs.size}단계)`} onClick={() => setPrefs({ size: (prefs.size % 3) + 1 })}>
        <span className="display" style={{ fontSize: 13 + prefs.size * 3 }}>가</span>
      </button>
      <button className="tb-btn icon" title={prefs.motion ? '움직임 줄이기' : '움직임 켜기'} aria-pressed={!prefs.motion} aria-label="움직임 줄이기" onClick={() => setPrefs({ motion: !prefs.motion })}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d={prefs.motion ? 'M8 5v14l11-7z' : 'M7 5h4v14H7zm6 0h4v14h-4z'} fill="currentColor" /></svg>
      </button>
    </>
  )
}

function StudentBar() {
  const user = useApp((s) => s.user)
  const logout = useApp((s) => s.logout)
  const [open, setOpen] = useState(false)
  const links = [['#/', '탐구 지도'], ['#/lab', '발명품 실험실'], ['#/journal', '탐구일지'], ['#/words', '낱말 사전'], ['#/practice', '면담 연습']]
  return (
    <header className="topbar no-print">
      <a className="brand" href="#/"><img src="/favicon.svg" alt="" /><b>발명 탐구 실험실</b></a>
      {user && <span className={'chip ' + user.work}>{WORKS[user.work].short} · {user.name}</span>}
      <span className="grow" />
      <SaveBadge />
      <Prefs />
      <div style={{ position: 'relative' }}>
        <button className="tb-btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>메뉴</button>
        {open && (
          <div role="menu" className="panel" style={{ position: 'absolute', right: 0, top: 52, width: 220, padding: 8, zIndex: 40 }} onClick={() => setOpen(false)}>
            {links.map(([h, l]) => <a key={h} role="menuitem" href={h} className="btn ghost" style={{ width: '100%', justifyContent: 'flex-start', border: 0 }}>{l}</a>)}
            <hr style={{ border: 0, borderTop: '1px solid var(--line2)', margin: '6px 0' }} />
            <button role="menuitem" className="btn ghost" style={{ width: '100%', justifyContent: 'flex-start', border: 0, color: 'var(--red)' }} onClick={() => { logout(); go('/') }}>나가기</button>
          </div>
        )}
      </div>
    </header>
  )
}

export default function App() {
  const route = useRoute()
  const user = useApp((s) => s.user)
  const pull = useApp((s) => s.pull)
  const prefs = useApp((s) => s.prefs)
  useEffect(() => { document.documentElement.dataset.size = prefs.size; document.documentElement.dataset.motion = prefs.motion ? '1' : '0' }, [prefs])
  useEffect(() => { if (user) pull() }, []) // eslint-disable-line
  useEffect(() => { window.scrollTo(0, 0) }, [user?.name])
  useEffect(() => {
    const on = () => user && pull()
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  }, [user]) // eslint-disable-line

  if (route[0] === 'teacher') return <div className="app"><Teacher route={route.slice(1)} /></div>
  if (!user) return <div className="app"><Join /></div>
  let page
  switch (route[0]) {
    case 's': page = <Session n={+route[1] || 1} />; break
    case 'lab': page = <LabPage />; break
    case 'journal': page = <Journal />; break
    case 'words': page = <Words />; break
    case 'practice': page = <Practice />; break
    default: page = <Home />
  }
  return (
    <div className={'app work-' + user.work}>
      <StudentBar />
      <main className="main" id="main">{page}</main>
    </div>
  )
}
