import { useState } from 'react'
import { useApp } from '../lib/store'
import { WORKS } from '../data/content'

export default function Join() {
  const login = useApp((s) => s.login)
  const startOffline = useApp((s) => s.startOffline)
  const [work, setWork] = useState(null)
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const ok = work && name.trim() && /^\d{4}$/.test(pin)
  const submit = async (e) => {
    e.preventDefault()
    if (!ok) return
    setBusy(true); setMsg('')
    try { await login(name.trim(), work, pin) } catch (err) {
      setMsg(err.message)
      if (err.code === 'OFFLINE') setOffline(true)
    }
    setBusy(false)
  }
  return (
    <main className={'main ' + (work === 'tape' ? 'work-tape' : '')} style={{ maxWidth: 1080 }}>
      <div className="row" style={{ marginBottom: 18 }}>
        <img src="/favicon.svg" alt="" width="44" height="44" />
        <h1 className="display" style={{ fontSize: '1.9em' }}>발명 탐구 실험실</h1>
        <span className="grow" style={{ flex: 1 }} />
        <a className="tb-btn" href="#/teacher">선생님 화면</a>
      </div>
      <form className="panel" onSubmit={submit} aria-labelledby="join-t" style={{ padding: 28 }}>
        <h2 id="join-t" className="display" style={{ fontSize: '1.5em', marginBottom: 6 }}>내 발명품을 골라요</h2>
        <p className="muted" style={{ marginBottom: 16 }}>홍북초 5학년 발명 탐구 · 전문가 지도(12월 12일)까지 여섯 차시</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }} role="radiogroup" aria-label="발명품">
          {['rain', 'tape'].map((k) => (
            <button type="button" key={k} role="radio" aria-checked={work === k} onClick={() => setWork(k)}
              className={'work-' + k} style={{ textAlign: 'left', border: work === k ? '3px solid var(--p)' : '1.5px solid var(--line)', borderRadius: 24, padding: 18, background: work === k ? 'var(--ps)' : '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="row" style={{ gap: 10 }}>
                <img src={`/icons/mascot-${k}-smile.svg`} alt="" width="56" />
                <div>
                  <b className="display" style={{ fontSize: '1.35em', color: 'var(--pd)' }}>{WORKS[k].name}</b>
                  <p className="small muted">{WORKS[k].tag}</p>
                </div>
              </div>
              <img src={`/figs/${k}_overview.svg`} alt={`${WORKS[k].name} 구조 그림`} style={{ background: '#fff', borderRadius: 14 }} />
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 20 }}>
          <label className="stack" style={{ gap: 6 }}>
            <b>이름</b>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={20} placeholder="내 이름" />
          </label>
          <label className="stack" style={{ gap: 6 }}>
            <b>비밀번호 숫자 4자리</b>
            <input className="field" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" autoComplete="off" placeholder="● ● ● ●" style={{ letterSpacing: 8, fontWeight: 800 }} />
          </label>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>처음 들어오면 지금 적은 숫자가 내 비밀번호가 돼요. 잊어버리면 선생님께 말씀드려요.</p>
        {msg && <p className="fb no" role="alert">{msg}</p>}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" type="submit" disabled={!ok || busy}>{busy ? '확인하는 중' : '탐구 시작하기'}</button>
          {offline && <button className="btn ghost" type="button" onClick={() => startOffline(name, work, pin)}>인터넷 없이 시작</button>}
        </div>
      </form>
    </main>
  )
}
