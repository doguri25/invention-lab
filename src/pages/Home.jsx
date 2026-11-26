import { useApp } from '../lib/store'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { WORKS, SESSIONS, SCHEDULE } from '../data/content'
import { blockName } from '../data/blocks'
import { sessionProgress, firstOpen } from '../lib/progress'
import { RainLab, TapeLab } from '../labs/InventionLab'
import { Talk } from '../components/ui'
import { Cookie, Wave } from '../components/extra'

function dday() {
  const now = new Date(); const t = new Date(2026, 11, 12)
  const d = Math.ceil((t - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
  return d > 0 ? `D-${d}` : d === 0 ? '오늘' : '끝'
}

export default function Home() {
  const user = useApp((s) => s.user)
  const records = useApp((s) => s.records)
  const feedback = useApp((s) => s.feedback)
  const last = useApp((s) => s.last)
  const W = WORKS[user.work]
  const list = SESSIONS[user.work]
  const prog = list.map((s) => sessionProgress(s, records[s.key]))
  const total = prog.reduce((a, b) => a + b, 0) / list.length
  // 이어서 할 곳: 마지막에 보던 곳이 있으면 거기, 없으면 아직 덜 한 첫 차시
  const open = list.find((s, i) => prog[i] < 0.8) || list[list.length - 1]
  const lastS = last && list[last.n - 1]
  const go = lastS && prog[last.n - 1] < 0.8 ? { s: lastS, sec: last.sec } : { s: open, sec: prog[open.n - 1] > 0 ? firstOpen(open, records[open.key], records['k' + open.n]) : 'mission' }
  const started = prog.some((p) => p > 0) || !!last
  const wrong = list.reduce((a, s) => a + s.quiz.filter((q, i) => { const v = (records[s.key] || {})['quiz' + i]; return v !== undefined && v !== q.answer && !((records.review || {}).fixed || {})[`${s.key}:${i}`] }).length, 0)
  const Lab = user.work === 'rain' ? RainLab : TapeLab
  return (
    <div className="stack" style={{ gap: 26 }}>
      <section className="hero">
        <div className="hero-card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <div className="stack" style={{ gap: 10, minWidth: 0 }}>
              <span className={'chip ' + user.work} style={{ alignSelf: 'flex-start' }}>{W.name}</span>
              <h1><span>{user.name}의</span> <span className="nobr">발명 탐구 실험실</span></h1>
            </div>
            <Cookie className="dday" size={96} role="img" aria-label={`전문가 지도 12월 12일, ${dday()}`}><small>12월 12일</small><b>{dday()}</b></Cookie>
          </div>
          <Talk work={user.work} text={W.hello} />
          <a className="go" href={`#/s/${go.s.n}/${go.sec}`}>
            <span className="go-k">{started ? '이어서 하기' : '시작하기'}</span>
            <b>{go.s.n}차시 {go.s.title}</b>
            <span className="go-sec">{go.sec === 'mission' ? '처음부터' : `「${blockName(go.sec, go.s)}」부터`}</span>
            <svg className="go-arrow" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
          <div>
            <Wave value={total} work={user.work} label={`여섯 차시 가운데 ${Math.round(total * 100)}% 했어요`} />
            <p className="small muted">여섯 차시 가운데 <b style={{ color: 'var(--pd)' }}>{Math.round(total * 100)}%</b> 했어요.</p>
          </div>
        </div>
        <div className="stage-card" aria-label={`${W.name} 3D 모형이 움직이는 모습`}>
          <div className="labbox" style={{ height: '100%', minHeight: 420, boxShadow: 'none', background: 'transparent' }}>
            <ErrorBoundary lab><Lab mode="demo" autoRotate /></ErrorBoundary>
          </div>
          <a className="btn stage-btn" href="#/lab">발명품 실험실 열기</a>
        </div>
      </section>

      <section aria-labelledby="map-t">
        <div className="sec-t"><h2 id="map-t">탐구 지도</h2><span className="note">한 칸을 마치면 선생님이 도장을 찍어 줘요</span></div>
        <div className="path">
          <svg className="path-line" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 36 C 60 36 60 36 100 36 S 220 84 300 84 S 420 36 500 36 S 620 84 700 84 S 820 36 900 36 S 1020 84 1100 84 S 1160 84 1200 84" className="wave-track" />
            <path d="M0 36 C 60 36 60 36 100 36 S 220 84 300 84 S 420 36 500 36 S 620 84 700 84 S 820 36 900 36 S 1020 84 1100 84 S 1160 84 1200 84" className="wave-fill" style={{ clipPath: `inset(-20px ${100 - Math.min(100, ((go.s.n - 0.5) / 6) * 100)}% -20px -20px)` }} />
          </svg>
          {list.map((s, i) => {
            const fb = feedback[s.key]
            const st = fb?.stamp ? 'stamped' : prog[i] >= 0.8 ? 'done' : prog[i] > 0 ? 'part' : ''
            return (
              <a key={s.key} href={`#/s/${s.n}`} className={'stop ' + st + (go.s.n === s.n ? ' here' : '')}
                aria-label={`${s.n}차시 ${s.title}, ${Math.round(prog[i] * 100)}% 했어요${fb?.stamp ? ', 도장 받음' : ''}`}>
                {go.s.n === s.n && <img className="stop-me" src={`/icons/mascot-${user.work}-wow.svg`} alt="" />}
                <Cookie className="stop-n" size={68}>{fb?.stamp ? <span className="stop-stamp">참 잘했어요</span> : s.n}</Cookie>
                <span className="k">{s.kicker === '공통' ? '공통' : W.short}</span>
                <span className="t">{s.title}</span>
                <span className="bar"><i style={{ width: Math.round(prog[i] * 100) + '%' }} /></span>
              </a>
            )
          })}
        </div>
      </section>

      <section className="tiles" aria-label="바로 가기">
        <a className="tile" href="#/review"><img src={`/icons/mascot-${user.work}-think.svg`} alt="" /><span>복습<small>{wrong ? `틀린 문제 ${wrong}개가 기다려요` : '섞어서 10문제, 핵심 카드'}</small></span></a>
        <a className="tile" href="#/journal"><img src="/icons/journal.svg" alt="" /><span>탐구일지<small>날짜별로 기록하고 인쇄해요</small></span></a>
        <a className="tile" href="#/words"><img src="/icons/plan.svg" alt="" /><span>낱말 사전<small>계획서의 어려운 말</small></span></a>
        <a className="tile" href="#/practice"><img src="/icons/timer.svg" alt="" /><span>면담 연습<small>1분 설명, 예상 질문</small></span></a>
      </section>

      <section className="panel" aria-labelledby="sch-t">
        <div className="sec-t"><h2 id="sch-t">대회 일정</h2></div>
        <ol className="sched">
          {SCHEDULE.map(([d, t], i) => (
            <li key={d} className={i === 0 ? 'on' : ''}><b>{t}</b><span className="small muted">{d}</span></li>
          ))}
        </ol>
      </section>
    </div>
  )
}
