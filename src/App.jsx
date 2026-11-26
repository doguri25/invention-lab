import { Suspense, lazy, useEffect, useRef, useState } from 'react'
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
import Review from './pages/Review'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ZoomLayer } from './components/extra'

// 교사 화면은 학생 태블릿에서 내려받지 않도록 따로 불러온다
const Teacher = lazy(() => import('./pages/Teacher'))
const Wait = () => <p className="muted" role="status" style={{ padding: 40, textAlign: 'center' }}>불러오는 중이에요…</p>

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
  return (
    <header className="topbar no-print">
      <a className="brand" href="#/"><img src="/favicon.svg" alt="" /><b>발명 탐구 실험실</b></a>
      <span className="grow" />
      <SaveBadge />
      <a className="tb-btn" href="#/words">낱말</a>
      <Prefs />
      <div style={{ position: 'relative' }}>
        <button className={'tb-btn who ' + user.work} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}><span className="who-n">{user.name}</span></button>
        {open && (
          <div role="menu" className="panel menu" onClick={() => setOpen(false)}>
            <p className="small muted" style={{ padding: '6px 12px' }}>{WORKS[user.work].name}</p>
            <a role="menuitem" href="#/words" className="btn ghost">낱말 사전</a>
            <a role="menuitem" href="#/journal" className="btn ghost">탐구일지 인쇄</a>
            <hr />
            <button role="menuitem" className="btn ghost out" onClick={() => { logout(); go('/') }}>나가기</button>
          </div>
        )}
      </div>
    </header>
  )
}

const ICON = {
  home: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z',
  lab: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9',
  journal: 'M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6zM6 3v18M10 8h5M10 12h5',
  review: 'M4 12a8 8 0 1 1 2.6 5.9M4 20v-5h5M12 8v4l3 2',
  talk: 'M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zM6 11v1a6 6 0 0 0 12 0v-1M12 18v3',
}
const DOCK = [['', 'home', '홈'], ['lab', 'lab', '실험실'], ['journal', 'journal', '일지'], ['review', 'review', '복습'], ['practice', 'talk', '면담']]

// 아래쪽에 떠 있는 메뉴. 글자를 적는 동안에는 숨는다.
function Dock({ at }) {
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const isField = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button'].includes(el.type)))
    const on = (e) => setTyping(isField(e.target))
    const off = () => setTimeout(() => setTyping(isField(document.activeElement)), 60)
    document.addEventListener('focusin', on); document.addEventListener('focusout', off)
    return () => { document.removeEventListener('focusin', on); document.removeEventListener('focusout', off) }
  }, [])
  const cur = at === 's' ? '' : at || ''
  return (
    <nav className={'dock no-print' + (typing ? ' away' : '')} aria-label="주 메뉴">
      {DOCK.map(([h, icon, label]) => (
        <a key={h} href={'#/' + h} className={cur === h && at !== 's' ? 'on' : ''} aria-current={cur === h && at !== 's' ? 'page' : undefined}>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d={ICON[icon]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>{label}</span>
        </a>
      ))}
    </nav>
  )
}

// 저장이 막혔을 때 알리는 띠
function SyncBanner() {
  const code = useApp((s) => s.syncCode)
  const sync = useApp((s) => s.sync)
  const dirty = useApp((s) => s.dirty)
  const relogin = useApp((s) => s.relogin)
  const retry = useApp((s) => s.retryDirty)
  const [pin, setPin] = useState('')
  const left = Object.values(dirty).filter(Boolean).length
  if (code === 'BAD_PIN') {
    return (
      <form className="banner warn no-print" onSubmit={(e) => { e.preventDefault(); if (pin.length >= 4) { relogin(pin); setPin('') } }}>
        <span><b>비밀번호가 바뀌었나요?</b> 선생님이 알려 준 새 숫자를 넣으면 이 태블릿에 적어 둔 기록이 그대로 올라가요.</span>
        <input className="field" type="password" inputMode="numeric" autoComplete="off" aria-label="새 비밀번호" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))} />
        <button className="btn small" type="submit" disabled={pin.length < 4}>다시 잇기</button>
      </form>
    )
  }
  if (code === 'LOCKED') return <div className="banner warn no-print" role="status"><span><b>잠깐 잠겼어요.</b> 비밀번호를 여러 번 틀렸어요. 적은 내용은 이 태블릿에 남아 있어요. 10분 뒤에 저절로 다시 보내요.</span></div>
  if ((sync === 'offline' || sync === 'error') && left > 0) {
    return (
      <div className="banner no-print" role="status">
        <span><b>인터넷이 끊겼어요.</b> 적은 내용은 이 태블릿에 저장해 뒀어요. 연결되면 저절로 올라가요.</span>
        <button type="button" className="btn ghost small" onClick={retry}>지금 다시 보내기</button>
      </div>
    )
  }
  return null
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
    if (!user) return
    const st = () => useApp.getState()
    const online = () => st().pull()
    // 화면을 닫거나 다른 앱으로 넘어가는 순간 기다리던 저장을 바로 보낸다
    // 다시 돌아왔을 때 못 보낸 것이 없으면 서버 기록(선생님 도장, 다른 기기에서 적은 것)을 받아 온다
    const hide = () => {
      if (document.visibilityState === 'hidden') st().flushNow()
      else if (!Object.values(st().dirty).some(Boolean)) st().pull()
    }
    const leave = () => st().flushNow()
    // 못 보낸 기록이 있으면 15초마다 다시 보낸다
    const id = setInterval(() => {
      const { sync, dirty, syncCode } = st()
      if (!Object.values(dirty).some(Boolean)) return
      if (syncCode === 'LOCKED' || sync === 'offline' || sync === 'error') (syncCode === 'LOCKED' ? st().pull() : st().retryDirty())
    }, 15000)
    window.addEventListener('online', online)
    window.addEventListener('pagehide', leave)
    document.addEventListener('visibilitychange', hide)
    return () => { clearInterval(id); window.removeEventListener('online', online); window.removeEventListener('pagehide', leave); document.removeEventListener('visibilitychange', hide) }
  }, [user?.name]) // eslint-disable-line

  // 화면이 바뀌면 키보드와 화면 읽기 프로그램이 새 화면 처음에서 이어 가게 한다
  const first = useRef(true)
  const where = route[0] === 's' ? 's/' + (route[1] || 1) : route[0] || ''
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const m = document.getElementById('main')
    if (m && !m.contains(document.activeElement)) m.focus({ preventScroll: true })
  }, [where])

  if (route[0] === 'teacher') return <div className="app"><ErrorBoundary resetKey={route.join('/')}><Suspense fallback={<Wait />}><Teacher route={route.slice(1)} /></Suspense></ErrorBoundary><ZoomLayer /></div>
  if (!user) return <div className="app"><Join /></div>
  let page
  switch (route[0]) {
    case 's': page = <Session key={route[1] || 1} n={+route[1] || 1} sec={route[2] ? decodeURIComponent(route[2]) : ''} />; break
    case 'lab': page = <LabPage />; break
    case 'journal': page = <Journal />; break
    case 'words': page = <Words />; break
    case 'practice': page = <Practice />; break
    case 'review': page = <Review />; break
    default: page = <Home />
  }
  return (
    <div className={'app work-' + user.work}>
      <StudentBar />
      <SyncBanner />
      <main className="main" id="main" tabIndex={-1}><ErrorBoundary resetKey={route.join('/')}>{page}</ErrorBoundary></main>
      <Dock at={route[0]} />
      <ZoomLayer />
    </div>
  )
}
