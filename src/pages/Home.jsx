import { useApp } from '../lib/store'
import { WORKS, SESSIONS, SCHEDULE } from '../data/content'
import { sessionProgress } from '../lib/progress'
import { RainLab, TapeLab } from '../labs/InventionLab'
import { Talk } from '../components/ui'

function dday() {
  const now = new Date(); const t = new Date(2026, 11, 12)
  const d = Math.ceil((t - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
  return d > 0 ? `D-${d}` : d === 0 ? '오늘!' : '지났어요'
}

export default function Home() {
  const user = useApp((s) => s.user)
  const records = useApp((s) => s.records)
  const feedback = useApp((s) => s.feedback)
  const W = WORKS[user.work]
  const list = SESSIONS[user.work]
  const prog = list.map((s) => sessionProgress(s, records[s.key]))
  const next = list.find((s, i) => prog[i] < 0.8) || list[list.length - 1]
  const Lab = user.work === 'rain' ? RainLab : TapeLab
  return (
    <div className="stack" style={{ gap: 22 }}>
      <section className="hero">
        <div className="hero-card">
          <span className={'chip ' + user.work}>{W.name}</span>
          <h1>{user.name}의<br />발명 탐구 실험실</h1>
          <Talk work={user.work} text={W.hello} />
          <div className="row" style={{ marginTop: 'auto' }}>
            <a className="btn" href={`#/s/${next.n}`}>{next.n}차시 이어서 하기</a>
            <a className="btn ghost" href="#/lab">발명품 실험실</a>
          </div>
          <p className="small muted">전문가 지도 12월 12일(토) · <b style={{ color: 'var(--pd)' }}>{dday()}</b></p>
        </div>
        <div className="stage-card" aria-label={`${W.name} 3D 모형이 움직이는 모습`}>
          <div className="labbox" style={{ height: '100%', minHeight: 420, boxShadow: 'none', background: 'transparent' }}>
            <Lab mode="demo" autoRotate />
          </div>
        </div>
      </section>

      <section aria-labelledby="map-t">
        <div className="sec-t"><h2 id="map-t">탐구 지도</h2><span className="note">한 칸씩 끝나면 선생님이 도장을 찍어 줘요</span></div>
        <div className="map">
          {list.map((s, i) => {
            const fb = feedback[s.key]
            return (
              <a key={s.key} href={`#/s/${s.n}`} className={'stop ' + (prog[i] >= 0.8 ? 'done' : '')} aria-label={`${s.n}차시 ${s.title}, ${Math.round(prog[i] * 100)}% 했어요${fb?.stamp ? ', 도장 받음' : ''}`}>
                <span className="num">{s.n}</span>
                <span className="k">{s.kicker}</span>
                <span className="t">{s.title}</span>
                {fb?.stamp && <span className="stampmark">참 잘<br />했어요</span>}
                <span className="bar"><i style={{ width: Math.round(prog[i] * 100) + '%' }} /></span>
              </a>
            )
          })}
        </div>
      </section>

      <section className="tiles" aria-label="바로 가기">
        <a className="tile" href="#/lab"><img src={`/icons/mascot-${user.work}-wow.svg`} alt="" /><span>발명품 실험실<small>내 발명품을 3D로 움직여 봐요</small></span></a>
        <a className="tile" href="#/journal"><img src="/icons/journal.svg" alt="" /><span>탐구일지<small>날짜별로 기록하고 인쇄해요</small></span></a>
        <a className="tile" href="#/words"><img src="/icons/plan.svg" alt="" /><span>낱말 사전<small>계획서의 어려운 말</small></span></a>
        <a className="tile" href="#/practice"><img src="/icons/timer.svg" alt="" /><span>면담 연습<small>1분 설명, 예상 질문</small></span></a>
      </section>

      <section className="panel" aria-labelledby="sch-t">
        <div className="sec-t"><h2 id="sch-t">대회 일정</h2></div>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          {SCHEDULE.map(([d, t], i) => (
            <li key={d} style={{ padding: '12px 14px', borderRadius: 14, background: i === 0 ? 'var(--ps)' : '#f8f9fa' }}>
              <b style={{ display: 'block', color: i === 0 ? 'var(--pd)' : 'var(--ink)' }}>{t}</b>
              <span className="small muted">{d}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
