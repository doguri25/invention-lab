import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { SESSIONS } from '../data/content'
import { sequence, blockName, blockShort } from '../data/blocks'
import { blockState, sessionProgress, thinkItems, firstOpen } from '../lib/progress'
import { Section, Talk, Tools, Picks, RecordTable, Stairs, Think, Quiz, LineChart, SERIES, Learn, Callout, avgOf } from '../components/ui'
import { StepList, Fig, Create, BarChart, Wave, Cookie, Stamp, useNarrow } from '../components/extra'
import { LabFrame } from '../labs/LabFrame'
import { fmt } from '../lib/physics'
import { rich } from '../lib/rich'
import { Icon } from '../components/Icon'

const idOf = (t) => 'b-' + t.replace(':', '-')
const calm = () => document.documentElement.dataset.motion === '0' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
const scrollToBlock = (t, smooth = true) => {
  const el = document.getElementById(idOf(t))
  if (el) el.scrollIntoView({ behavior: smooth && !calm() ? 'smooth' : 'auto', block: 'start' })
}

/* 지난 시간 돌아보기 */
function Recall({ s, prev, data, set, records, work }) {
  const pd = records[prev.key] || {}
  const qi = useMemo(() => {
    if (data.recallqi !== undefined) return data.recallqi
    const wrong = prev.quiz.findIndex((q, i) => pd['quiz' + i] !== undefined && pd['quiz' + i] !== q.answer)
    return wrong >= 0 ? wrong : s.n % prev.quiz.length
  }, [s.key]) // eslint-disable-line
  const q = prev.quiz[qi]
  const v = data.recallq
  const rows = (s.recall || []).map((r) => ({ ...r, v: avgOf(records[r.from], r.id) }))
  return (
    <>
      <Talk work={work} expr="think" text={s.bridge} />
      <div className="recall-grid">
        <div className="recall-card">
          <b>{prev.n}차시에 내가 쓴 한 줄</b>
          {pd.oneline ? <p className="recall-line">{pd.oneline}</p> : <p className="muted">아직 비어 있어요. <a href={`#/s/${prev.n}/end`}>{prev.n}차시 마무리에 적으러 가기</a></p>}
        </div>
        {rows.map((r) => (
          <div className="recall-card" key={r.from + r.id}>
            <b>{r.label}</b>
            {Number.isFinite(r.v)
              ? <p className="recall-num">{fmt(r.v, 1)} <small>{r.unit}</small>{r.mul && <span className="recall-mul">{r.mulLabel} {fmt(r.v * r.mul, 1)} {r.unit}</span>}</p>
              : <p className="muted">아직 재지 않았어요. <a href={`#/s/${r.from.slice(1)}/record`}>{r.from.slice(1)}차시 기록표 보기</a></p>}
          </div>
        ))}
      </div>
      <div className="recall-q">
        <p className="quiz-q">기억나나요? {q.q}</p>
        <div className="picks">
          {q.options.map((o, j) => (
            <button key={o} type="button" className={'pick' + (v === j ? (j === q.answer ? ' right' : ' wrong') : '')} aria-pressed={v === j}
              onClick={() => { if (data.recallqi === undefined) set('recallqi', qi); set('recallq', j) }}>{o}</button>
          ))}
        </div>
        {v !== undefined && <p className={'fb ' + (v === q.answer ? 'ok' : 'no')}>{v === q.answer ? '잘 기억하고 있어요. ' : '다시 떠올려 봐요. '}{rich(q.why)}</p>}
      </div>
    </>
  )
}

/* 6차시: 내 실험 돌아보기 */
function Recap({ list, records, data, set }) {
  return (
    <>
      <p className="muted" style={{ marginBottom: 12 }}>다섯 번 동안 한 일을 한눈에 봐요. 비어 있는 칸은 그 차시로 가서 채울 수 있어요.</p>
      <ol className="recap">
        {list.slice(0, 5).map((x) => {
          const d = records[x.key] || {}
          const nums = x.record ? x.record.rows.filter((r) => !r.text).slice(0, 3).map((r) => [r.label, avgOf(d, r.id, x.record.cols.length)]).filter((r) => Number.isFinite(r[1])) : []
          return (
            <li key={x.key}>
              <a className="recap-n" href={`#/s/${x.n}`} aria-label={`${x.n}차시로 가기`}>{x.n}</a>
              <div>
                <b>{x.title}</b>
                <p className={d.oneline ? '' : 'muted'}>{d.oneline || '한 줄이 아직 비어 있어요.'}</p>
                {nums.length > 0 && <p className="small recap-nums">{nums.map(([l, v]) => <span key={l}>{l} <b>{fmt(v, 1)} {x.record.unit}</b></span>)}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      <label className="stack" style={{ gap: 6, marginTop: 14 }}>
        <b>가장 기억에 남는 실험과 까닭</b>
        <textarea className="field" style={{ minHeight: 72 }} value={data.recap || ''} onChange={(e) => set('recap', e.target.value)} placeholder="1분 설명의 넷째 칸에 쓸 이야기가 돼요" />
      </label>
    </>
  )
}

function DrainGraph({ data }) {
  const ys = [250, 200, 150, 100], rows = ['t250', 't200', 't150', 't100'], col = SERIES
  const series = [0, 1, 2].map((j) => ({ name: '병 ' + 'ABC'[j], color: col[j], pts: [[0, 300], ...rows.map((r, i) => [parseFloat(data[`${r}_${j}`]), ys[i]]).filter(([x]) => Number.isFinite(x))] }))
  const n = series.reduce((a, x) => a + x.pts.length - 1, 0)
  const xMax = Math.max(60, ...series.flatMap((x) => x.pts.map((p) => p[0])))
  return (
    <div className="graph">
      <p className="quiz-q">기록표로 그린 꺾은선그래프</p>
      {n === 0 && <p className="small muted">기록표에 시간을 적으면 점이 찍히고 선으로 이어져요.</p>}
      <LineChart series={series} xMax={Math.ceil(xMax / 30) * 30} yMax={300} xLabel="시간(초)" yLabel="남은 물(mL)" xUnit="초" yUnit="mL" />
    </div>
  )
}

function BandGraph({ data, records }) {
  const a180 = avgOf(records.s3, 'a180')
  const bars = ['b1', 'b2', 'b3'].map((id, i) => ({ name: `고무줄 ${i + 1}개`, v: avgOf(data, id), color: SERIES[1] }))
  return (
    <div className="graph">
      <p className="quiz-q">기록표로 그린 막대그래프</p>
      {!bars.some((b) => Number.isFinite(b.v)) && <p className="small muted">기록표에 무게를 적으면 막대가 올라가요.</p>}
      <BarChart bars={bars} unit="g" refs={[{ name: '진짜 테이프를 벗기는 힘', v: Number.isFinite(a180) ? a180 * 4.8 : NaN, color: SERIES[2] }]} />
      <p className="small muted">점선은 3차시에 잰 180° 평균에 4.8을 곱한 값이에요. 막대가 이 선보다 조금 높은 고무줄 개수를 찾아요.</p>
    </div>
  )
}

const BRING = ['계획서', '탐구일지', '이 앱의 기록(인쇄)', '실험 사진·영상', '실험에 쓴 도구 한두 개', '질문 목록', '필기구']

/* 위쪽에 붙어 다니는 구역 줄 */
function Strip({ seq, s, states, active, work, value }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current && ref.current.querySelector('[aria-current="true"]')
    if (el && ref.current) ref.current.scrollTo({ left: el.offsetLeft - ref.current.clientWidth / 2 + el.clientWidth / 2, behavior: calm() ? 'auto' : 'smooth' })
  }, [active])
  return (
    <div className="strip no-print">
      <Wave value={value} work={work} label={`${s.n}차시를 ${Math.round(value * 100)}% 했어요`} />
      <nav ref={ref} className="strip-row" aria-label="이 차시의 구역">
        {seq.map((t) => (
          <button key={t} type="button" className={'sb ' + states[t]} aria-current={active === t ? 'true' : undefined} onClick={() => scrollToBlock(t)}
            aria-label={`${blockShort(t, s)}${states[t] === 'done' ? ', 다 했어요' : states[t] === 'half' ? ', 하는 중' : ''}`}>
            <i aria-hidden="true" />{blockShort(t, s)}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function Session({ n, sec }) {
  const user = useApp((st) => st.user)
  const work = user.work
  const list = SESSIONS[work]
  const s = list[Math.min(5, Math.max(0, n - 1))]
  const records = useApp((st) => st.records)
  const data = records[s.key] || {}
  const sk = records['k' + s.n] || {}
  const fb = useApp((st) => st.feedback[s.key])
  const setField = useApp((st) => st.setField)
  const setLast = useApp((st) => st.setLast)
  const last = useApp((st) => st.last)
  const set = (k, v) => setField(s.key, k, v)
  const setSk = (k, v) => setField('k' + s.n, k, v)
  const narrow = useNarrow('(max-width: 1099px)') // 가로가 좁으면 3D 상자를 구역 안에 넣는다
  const [tipsOpen, setTipsOpen] = useState(false)
  const [peek, setPeek] = useState(false)
  const [flip, setFlip] = useState({})
  const [active, setActive] = useState('mission')
  const seq = useMemo(() => sequence(s), [s])
  const states = {}
  seq.forEach((t) => { states[t] = blockState(t, s, data, sk) })
  const value = sessionProgress(s, data)
  const prev = s.n > 1 ? list[s.n - 2] : null
  const speechParts = (s.speech || []).map((p) => ({ label: p.label, text: data[p.id] }))
  // 들어왔을 때 지난번에 하던 곳(이 화면에 처음 들어온 순간의 값만 쓴다)
  const resume = useRef(null)
  if (resume.current === null) resume.current = last && last.n === s.n && last.sec !== 'mission' && seq.includes(last.sec) ? last.sec : ''
  const [showResume, setShowResume] = useState(!sec && !!resume.current)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (sec && seq.includes(sec)) {
      // 그림이 늦게 떠서 자리가 밀릴 수 있어 몇 번 다시 맞춘다. 손을 대면 그만둔다.
      let stop = false
      const quit = () => { stop = true }
      const ids = [80, 450, 1100, 2000].map((ms) => setTimeout(() => { if (!stop) scrollToBlock(sec, false) }, ms))
      const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown']
      evs.forEach((e) => window.addEventListener(e, quit, { passive: true }))
      return () => { ids.forEach(clearTimeout); evs.forEach((e) => window.removeEventListener(e, quit)) }
    }
  }, [s.key, sec]) // eslint-disable-line

  // 지금 보고 있는 구역을 기억해 둔다
  useEffect(() => {
    const els = seq.map((t) => document.getElementById(idOf(t))).filter(Boolean)
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((ents) => {
      const hit = ents.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive(hit.target.dataset.block)
    }, { rootMargin: '-22% 0px -62% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [s.key, narrow]) // eslint-disable-line
  useEffect(() => { if (active !== 'mission') setLast(s.n, active) }, [active]) // eslint-disable-line

  const lab = s.lab && (
    <LabFrame sim={s.lab.sim} work={work} speechParts={speechParts} guide={s.lab.guide} title={s.lab.title} />
  )
  let firstSteps = true
  let num = 0
  const sect = (t, props, children) => (
    <Section key={t} n={++num} id={idOf(t)} title={props.title || blockName(t, s)} note={props.note} state={states[t]} block={t}>{children}</Section>
  )

  const render = (t) => {
    if (t.startsWith('think:')) {
      const it = s.think.find((x) => x.id === t.slice(6))
      return sect(t, { note: '도구 없이 손으로 먼저' }, <Think item={it} data={data} onChange={set} work={work} />)
    }
    switch (t) {
      case 'mission': return sect(t, { title: '오늘의 미션' }, <>
        <Talk work={work} expr={s.n === 6 ? 'wow' : 'smile'} text={s.bubble} />
        <p className="mission">{rich(s.mission)}</p>
        <p className="small muted" style={{ margin: '14px 0 8px' }}>오늘 준비물</p>
        <Tools items={s.tools} />
      </>)
      case 'recall': return sect(t, { note: '2분이면 돼요' }, <Recall s={s} prev={prev} data={data} set={set} records={records} work={work} />)
      case 'learn': return s.learn.length ? sect(t, { note: '시작하기 전에 읽어요' }, <>
        <Learn items={s.learn} />
        {!s.steps && <Callout tone="info" title="이렇게 하면 쉬워요" items={s.tips} />}
      </>) : null
      case 'predict': return s.lab && s.lab.predict ? sect(t, { note: '해 보기 전에 먼저' }, <div className="predict">
        <p className="quiz-q">{s.lab.predict.q}</p>
        <Picks options={s.lab.predict.options} value={data.predict} onChange={(o) => set('predict', o)} />
        <p className="small" style={{ marginTop: 10 }}>{data.predict ? '예상을 적었어요. 맞는지는 실험으로 확인해요. 결과가 달라도 괜찮아요. 왜 다른지 찾는 것이 탐구예요.' : '맞히지 않아도 돼요. 내 생각을 하나 골라요.'}</p>
      </div>) : null
      case 'steps': case 'steps2': {
        const st = s[t]
        const first = firstSteps; firstSteps = false
        return sect(t, { note: s.n === 1 ? '소리 내어 읽어요' : '그림을 누르면 크게 보여요' }, <>
          <Fig fig={st.fig} />
          <StepList items={st.items} />
          {first && <Callout tone="safe" title="안전" items={s.safety} />}
          {first && s.tips.length > 0 && (
            <div className="tips">
              <button type="button" className="tips-btn" aria-expanded={tipsOpen} onClick={() => setTipsOpen(!tipsOpen)}>
                <span>실험이 잘 안 되면</span><span aria-hidden="true">{tipsOpen ? '접기' : '펼치기'}</span>
              </button>
              {tipsOpen && <ul>{s.tips.map((x) => <li key={x}>{rich(x)}</li>)}</ul>}
            </div>
          )}
        </>)
      }
      case 'record': case 'record2': {
        const spec = s[t]
        const withGraph = s.graph && t === 'record'
        return sect(t, { note: '진짜 실험에서 잰 값을 적어요' }, <>
          <p className="quiz-q">{spec.title}</p>
          <RecordTable spec={spec} data={data} onChange={set} />
          {spec.avg && <p className="small muted" style={{ marginTop: 8 }}>평균은 저절로 계산돼요. 이상한 값이 나와도 지우지 말고 탐구일지에 까닭을 적어요.</p>}
          {withGraph && s.graph === 'drain' && <DrainGraph data={data} />}
          {withGraph && s.graph === 'bands' && <BandGraph data={data} records={records} />}
        </>)
      }
      case 'calc': return sect(t, { note: '빈칸을 채우면 바로 확인' }, <>
        {s.calcNote && <p className="calc-note">{rich(s.calcNote)}</p>}
        <Stairs items={s.calc} data={data} onChange={set} />
      </>)
      case 'lab': return sect(t, { title: '3D 실험실: ' + s.lab.title, note: narrow ? '' : '오른쪽 화면에서 해요' }, <>
        {narrow && lab}
        <ol className="guide-list">{s.lab.guide.map((g) => <li key={g}>{rich(g, { kw: false })}</li>)}</ol>
        {s.lab.observeQ && (
          <div className="observe">
            {s.lab.predict && <p className="small">내 예상: <b>{data.predict || '아직 고르지 않았어요'}</b></p>}
            <label className="stack" style={{ gap: 6 }}>
              <b>{s.lab.observeQ}</b>
              <textarea className="field" style={{ minHeight: 64 }} value={data.observe || ''} onChange={(e) => set('observe', e.target.value)} placeholder="본 것을 그대로 적어요" />
            </label>
            {s.lab.predict && data.predict && data.observe && (
              <p className={'fb ' + (data.predict === s.lab.predict.answer ? 'ok' : 'no')}>
                {data.predict === s.lab.predict.answer ? '예상이 맞았어요. ' : '예상과 달랐어요. 그래서 실험을 해 보는 거예요. '}확인한 결과: <b className="nv">{s.lab.predict.answer}</b>
              </p>
            )}
          </div>
        )}
      </>)
      case 'why': return s.why.length ? sect(t, { note: '실험 결과를 설명해 줘요' }, <Learn items={s.why} />) : null
      case 'think': {
        const items = thinkItems(s)
        return items.length ? sect(t, {}, <div className="stack" style={{ gap: 22 }}>{items.map((x) => <Think key={x.id} item={x} data={data} onChange={set} work={work} />)}</div>) : null
      }
      case 'create': return sect(t, { title: '창의 활동: ' + s.create.title, note: '시간이 남거나 집에서' }, <Create spec={s.create} data={data} set={set} sk={sk} setSk={setSk} />)
      case 'more': return s.more.length ? sect(t, { note: '골라서 해요' }, (
        <ul className="more-list">
          {s.more.map((x, i) => (
            <li key={x}>
              <button type="button" onClick={() => set('more' + i, !data['more' + i])} aria-pressed={!!data['more' + i]}>
                <span className="more-box" aria-hidden="true">{data['more' + i] && <Icon name="check" />}</span><span>{x}</span>
              </button>
            </li>
          ))}
        </ul>
      )) : null
      case 'recap': return sect(t, {}, <Recap list={list} records={records} data={data} set={set} />)
      case 'script': return sect(t, { note: '외우지 말고 내 말로' }, (
        <div className="stack">
          {s.speech.map((p, i) => (
            <label key={p.id} className="stack" style={{ gap: 6 }}>
              <b style={{ color: 'var(--pd)' }}>{i + 1}. {p.label}</b>
              <textarea className="field" style={{ minHeight: 64 }} value={data[p.id] || ''} onChange={(e) => set(p.id, e.target.value)} placeholder={peek ? '예: ' + p.sample : ''} />
            </label>
          ))}
          <button type="button" className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setPeek(!peek)}>{peek ? '예시 감추기' : '막히면 예시 보기'}</button>
        </div>
      ))
      case 'tries': return sect(t, { note: '3D 무대의 1분 타이머를 써요' }, <>
        <div className="auto-grid">
          {[1, 2, 3].map((i) => (
            <label key={i} className="stack" style={{ gap: 6 }}>
              <b>{i}번째 걸린 시간(초)</b>
              <input className="num" inputMode="numeric" value={data['try' + i] || ''} onChange={(e) => set('try' + i, e.target.value)} />
            </label>
          ))}
        </div>
        <textarea className="field" style={{ marginTop: 10, minHeight: 64 }} placeholder="친구의 한마디(잘한 점, 고칠 점)" aria-label="친구의 한마디" value={data.peer || ''} onChange={(e) => set('peer', e.target.value)} />
      </>)
      case 'judge': return sect(t, { note: '먼저 내 말로 답하고 카드를 눌러요' }, (
        <div className="flips">
          {s.judge.map(([q, a], i) => (
            <button key={i} type="button" className="flipcard" onClick={() => setFlip({ ...flip, [i]: !flip[i] })} aria-pressed={!!flip[i]}>
              <b>{q}</b><span>{flip[i] ? rich(a) : '눌러서 답의 방향 보기'}</span>
            </button>
          ))}
        </div>
      ))
      case 'questions': return sect(t, { note: '예상과 다르게 나온 결과가 가장 좋은 질문거리' }, (
        <div className="ideas">
          {[0, 1, 2, 3, 4].map((i) => (
            <label key={i} className="idea">
              <span className="idea-n" aria-hidden="true">{i + 1}</span>
              <input className="field" aria-label={`질문 ${i + 1}`} value={data['q' + i] || ''} onChange={(e) => set('q' + i, e.target.value)} placeholder={peek ? '예: ' + s.questions[i] : '질문을 적어요'} />
            </label>
          ))}
          <button type="button" className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setPeek(!peek)}>{peek ? '예시 감추기' : '막히면 예시 보기'}</button>
        </div>
      ))
      case 'bring': return sect(t, {}, (
        <div className="auto-grid">
          {BRING.map((b, i) => (
            <label key={b} className={'checkrow' + (data['b' + i] ? ' on' : '')}>
              <input type="checkbox" checked={!!data['b' + i]} onChange={(e) => set('b' + i, e.target.checked)} /><span>{b}</span>
            </label>
          ))}
        </div>
      ))
      case 'quiz': return sect(t, { note: '틀린 문제는 복습에 모여요' }, <Quiz items={s.quiz} data={data} onChange={set} />)
      case 'end': return sect(t, { title: '오늘의 한 줄과 스스로 점검' }, <>
        <label className="stack" style={{ gap: 6 }}>
          <b>오늘 새로 알게 된 것</b>
          <input className="field" value={data.oneline || ''} onChange={(e) => set('oneline', e.target.value)} placeholder="한 줄로 적어요. 다음 시간 첫머리에 다시 보여 줘요" />
        </label>
        <div className="stack" style={{ marginTop: 14, gap: 8 }}>
          {s.self.map((x, i) => (
            <button key={x} type="button" className="self-btn" onClick={() => set('self' + i, !data['self' + i])} aria-pressed={!!data['self' + i]}>
              <span className="star" aria-hidden="true"><Icon name="star" fill={!!data['self' + i]} /></span><span>{x}</span>
            </button>
          ))}
        </div>
        {s.journal.length > 0 && (
          <div className="journal-box">
            <b>탐구일지에 남길 것</b>
            <ul>{s.journal.map((x, i) => (
              <li key={x}><label><input type="checkbox" checked={!!data['j' + i]} onChange={(e) => set('j' + i, e.target.checked)} /><span>{x}</span></label></li>
            ))}</ul>
            <a className="btn tone small" href="#/journal">탐구일지 쓰러 가기</a>
          </div>
        )}
        {fb && (fb.stamp || fb.comment) && (
          <div className="stampbox" style={{ marginTop: 16 }}>
            {fb.stamp && <Stamp />}
            <div><b>선생님 한마디</b><p>{fb.comment || '도장을 받았어요!'}</p></div>
          </div>
        )}
        <div className="next-up">
          <b>오늘은 여기까지</b><p>{rich(s.next)}</p>
        </div>
      </>)
      default: return null
    }
  }

  const open = firstOpen(s, data, sk)
  return (
    <div>
      <div className="sess-head">
        <Cookie className="nbadge" size={72} aria-hidden="true">{s.n}</Cookie>
        <div className="sess-title">
          <span className={'chip ' + (s.kicker === '공통' ? 'green' : work)}>{s.n}차시 · {s.kicker}</span>
          <h1>{s.title}</h1>
        </div>
        <nav className="dots no-print" aria-label="차시 이동">
          {list.map((x) => <a key={x.n} href={`#/s/${x.n}`} className={x.n === s.n ? 'on' : ''} aria-current={x.n === s.n ? 'page' : undefined} aria-label={`${x.n}차시`}>{x.n}</a>)}
        </nav>
      </div>
      <Strip seq={seq} s={s} states={states} active={active} work={work} value={value} />
      {showResume && (
        <div className="resume no-print" role="status">
          <span>지난번에 「{blockName(resume.current, s)}」까지 봤어요.</span>
          <button type="button" className="btn small" onClick={() => { scrollToBlock(resume.current); setShowResume(false) }}>거기로 가기</button>
          <button type="button" className="btn ghost small" onClick={() => setShowResume(false)}>처음부터 볼래요</button>
        </div>
      )}
      <div className={'split' + (!s.lab || narrow ? ' solo' : '')}>
        <div className="flow">
          {seq.map(render)}
          <nav className="row no-print sess-nav">
            {s.n > 1 ? <a className="btn ghost" href={`#/s/${s.n - 1}`}>{s.n - 1}차시로</a> : <span />}
            {value < 0.8 && open !== 'mission' && <button type="button" className="btn tone" onClick={() => scrollToBlock(open)}>아직 안 한 곳: {blockShort(open, s)}</button>}
            {s.n < 6 ? <a className="btn" href={`#/s/${s.n + 1}`}>{s.n + 1}차시로</a> : <a className="btn" href="#/practice">면담 연습하러 가기</a>}
          </nav>
        </div>
        {s.lab && !narrow && <aside className="lab" aria-label="3D 실험실">{lab}</aside>}
      </div>
    </div>
  )
}
