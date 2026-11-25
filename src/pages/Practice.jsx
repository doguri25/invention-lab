import { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { SESSIONS, WORKS } from '../data/content'

const MODES = {
  one: { label: '1분 설명', sec: 60, tip: '부품을 가리키며 다섯 덩어리를 차례로 말해요.' },
  three: { label: '3분 설명(대회)', sec: 180, tip: '대회처럼 3분. 실험 이야기에 숫자를 하나씩 넣어요.' },
  qa: { label: '질문 5분', sec: 300, tip: '질문을 뽑고, 그림이나 기록을 보여 주며 답해요.' },
}

function Ring({ left, total }) {
  const R = 92, C = 2 * Math.PI * R
  const p = Math.max(0, left) / total
  const warn = left <= Math.min(10, total * 0.15)
  const m = Math.floor(Math.max(0, Math.ceil(left)) / 60), s = Math.max(0, Math.ceil(left)) % 60
  return (
    <svg viewBox="0 0 220 220" width="220" height="220" role="timer" aria-label={`남은 시간 ${m}분 ${s}초`}>
      <circle cx="110" cy="110" r={R} fill="#fff" stroke="var(--line2)" strokeWidth="14" />
      <circle cx="110" cy="110" r={R} fill="none" stroke={warn ? 'var(--red)' : 'var(--p)'} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 110 110)" style={{ transition: 'stroke-dashoffset .25s linear' }} />
      <text x="110" y="122" textAnchor="middle" fontFamily="Jua, sans-serif" fontSize="46" fill={warn ? 'var(--red)' : '#1f1f1f'}>{m}:{String(s).padStart(2, '0')}</text>
    </svg>
  )
}

export default function Practice() {
  const user = useApp((s) => s.user)
  const s6 = SESSIONS[user.work][5]
  const d6 = useApp((s) => s.records.s6) || {}
  const log = (useApp((s) => s.records.practice) || {}).log || []
  const setField = useApp((s) => s.setField)
  const [mode, setMode] = useState('one')
  const [left, setLeft] = useState(MODES.one.sec)
  const [run, setRun] = useState(false)
  const [q, setQ] = useState(null)
  const [show, setShow] = useState(false)
  const end = useRef(0)
  const M = MODES[mode]

  useEffect(() => {
    if (!run) return
    end.current = Date.now() + left * 1000
    const id = setInterval(() => {
      const l = (end.current - Date.now()) / 1000
      setLeft(l)
      if (l <= 0) { setRun(false); setLeft(0) }
    }, 200)
    return () => clearInterval(id)
  }, [run]) // eslint-disable-line

  const pick = (m) => { setMode(m); setRun(false); setLeft(MODES[m].sec); setQ(null); setShow(false) }
  const used = Math.round(M.sec - Math.max(0, left))
  const saveTry = () => {
    if (used < 3) return
    setField('practice', 'log', [{ at: Date.now(), mode, sec: used }, ...log].slice(0, 30))
    setRun(false); setLeft(M.sec)
  }
  const judge = s6.judge
  const draw = () => {
    let next
    do { next = Math.floor(Math.random() * judge.length) } while (judge.length > 1 && next === q)
    setQ(next); setShow(false)
  }
  const parts = s6.speech
  const idx = Math.min(parts.length - 1, Math.floor(((M.sec - left) / M.sec) * parts.length))

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="display" style={{ fontSize: '1.9em' }}>면담 연습</h1>
        <div className="tabs" role="group" aria-label="연습 고르기">
          {Object.entries(MODES).map(([k, v]) => <button key={k} aria-pressed={mode === k} onClick={() => pick(k)}>{v.label}</button>)}
        </div>
      </div>
      <div className="split" style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)' }}>
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 28 }}>
          <p className="muted" style={{ textAlign: 'center' }}>{M.tip}</p>
          <Ring left={left} total={M.sec} />
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => { if (left <= 0) setLeft(M.sec); setRun(!run) }}>{run ? '멈추기' : left < M.sec && left > 0 ? '이어서' : '시작'}</button>
            <button className="btn ghost" onClick={() => { setRun(false); setLeft(M.sec) }}>처음으로</button>
            {used >= 3 && !run && <button className="btn tone" onClick={saveTry}>{used}초 기록하기</button>}
          </div>
          {mode !== 'qa' ? (
            <div className="stack" style={{ width: '100%', gap: 8 }}>
              {parts.map((p, i) => {
                const on = (run || left < M.sec) && i === idx
                return (
                  <div key={p.id} style={{ padding: '12px 16px', borderRadius: 16, background: on ? 'var(--p)' : '#f8f9fa', color: on ? '#fff' : 'var(--ink)', transition: 'background .3s' }}>
                    <small style={{ fontWeight: 800, opacity: 0.8 }}>{i + 1}. {p.label}</small>
                    <p style={{ fontWeight: 600 }}>{d6[p.id] || <span style={{ opacity: 0.7 }}>6차시 원고 칸이 비어 있어요. 예: {p.sample}</span>}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="stack" style={{ width: '100%' }}>
              <button className="btn" onClick={draw} style={{ alignSelf: 'center' }}>심사위원 질문 뽑기</button>
              {q !== null && (
                <div className="panel" style={{ background: 'var(--ps)', boxShadow: 'none' }}>
                  <p className="display" style={{ fontSize: '1.45em', lineHeight: 1.35 }}>{judge[q][0]}</p>
                  {show ? <p className="fb ok">{judge[q][1]}</p> : <button className="btn ghost small" style={{ marginTop: 12 }} onClick={() => setShow(true)}>답의 방향 보기</button>}
                </div>
              )}
            </div>
          )}
        </section>
        <aside className="stack" style={{ gap: 16 }}>
          <section className="panel">
            <div className="sec-t"><h2>가리키며 말할 그림</h2></div>
            <img src={`/figs/${user.work}_overview.svg`} alt={`${WORKS[user.work].name} 구조 그림`} style={{ width: '100%', borderRadius: 14, background: '#fff' }} />
          </section>
          <section className="panel">
            <div className="sec-t"><h2>내 연습 기록</h2><span className="note">대회 설명은 3분이에요</span></div>
            {log.length === 0 ? <p className="muted">연습을 마치고 ‘기록하기’를 누르면 여기에 쌓여요.</p> : (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }} className="stack">
                {log.slice(0, 8).map((l) => {
                  const lim = MODES[l.mode]?.sec || 60
                  return (
                    <li key={l.at} className="row" style={{ justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, background: '#f8f9fa' }}>
                      <span>{new Date(l.at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} · {MODES[l.mode]?.label}</span>
                      <b style={{ color: l.sec > lim ? 'var(--red)' : 'var(--green)' }}>{Math.floor(l.sec / 60) ? `${Math.floor(l.sec / 60)}분 ` : ''}{l.sec % 60}초</b>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
          <section className="panel">
            <div className="sec-t"><h2>내가 준비한 질문</h2></div>
            {[0, 1, 2, 3, 4].some((i) => d6['q' + i])
              ? <ol style={{ paddingLeft: 22, margin: 0 }}>{[0, 1, 2, 3, 4].map((i) => d6['q' + i] && <li key={i}>{d6['q' + i]}</li>)}</ol>
              : <p className="muted">6차시에서 전문가 선생님께 물을 질문을 적으면 여기서도 볼 수 있어요. <a href="#/s/6">6차시로 가기</a></p>}
          </section>
        </aside>
      </div>
    </div>
  )
}
