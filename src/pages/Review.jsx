import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { SESSIONS, GLOSSARY, WORKS } from '../data/content'
import { Stamp, Wave } from '../components/extra'
import { rich } from '../lib/rich'

const shuffle = (arr, seed) => {
  const a = arr.slice(); let x = seed || 1
  for (let i = a.length - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor((x / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// 차시 퀴즈와 낱말 문제를 한 모양으로 모은다
function bank(work) {
  const list = SESSIONS[work]
  const quiz = list.flatMap((s) => s.quiz.map((q, i) => ({ id: `${s.key}:${i}`, n: s.n, from: `${s.n}차시`, q: q.q, options: q.options, answer: q.answer, why: q.why, key: s.key, qi: i })))
  const mine = GLOSSARY.filter((g) => g[0] === '공통' || g[0] === (work === 'rain' ? '빗물' : '테이프'))
  const words = mine.map((g, i) => {
    const others = shuffle(mine.filter((x) => x[1] !== g[1]), i + 7).slice(0, 2).map((x) => x[1])
    const options = shuffle([g[1], ...others], i + 3)
    return { id: 'w:' + g[1], n: g[3], from: '낱말', q: `「${g[2]}」 어떤 낱말일까요?`, options, answer: options.indexOf(g[1]), why: `${g[1]}: ${g[2]}` }
  })
  return { quiz, words }
}

function Runner({ items, title, onDone, onAnswer, work }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState({})
  const q = items[i]
  const v = picked[i]
  const score = items.filter((x, j) => picked[j] === x.answer).length
  const finished = i >= items.length
  if (finished) {
    const all = score === items.length
    return (
      <section className="panel rv-result">
        {all ? <Stamp /> : <img src={`/icons/mascot-${work}-${score >= items.length * 0.6 ? 'smile' : 'think'}.svg`} alt="" width="96" height="96" />}
        <h2 className="display">{items.length}문제 가운데 {score}문제를 맞혔어요</h2>
        <p className="muted">{all ? '모두 맞혔어요. 전문가 선생님 앞에서도 자신 있게 말할 수 있겠어요.' : '틀린 문제는 「틀린 문제」에 모아 뒀어요. 한 번 더 풀면 사라져요.'}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn" onClick={() => onDone(score, items.length, true)}>복습 첫 화면으로</button>
        </div>
      </section>
    )
  }
  return (
    <section className="panel rv-run" aria-live="polite">
      <div className="rv-top">
        <span className="chip gray">{title}</span>
        <span className="chip tag">{q.from}</span>
        <span className="rv-count">{i + 1} / {items.length}</span>
      </div>
      <Wave value={i / items.length} work={work} label={`${items.length}문제 가운데 ${i}문제를 풀었어요`} />
      <h2 className="rv-q">{q.q}</h2>
      <div className="rv-opts">
        {q.options.map((o, j) => (
          <button key={o} type="button" className={'pick' + (v !== undefined && j === q.answer ? ' right' : v === j ? ' wrong' : '')} aria-pressed={v === j} disabled={v !== undefined}
            onClick={() => { setPicked({ ...picked, [i]: j }); onAnswer(q, j === q.answer) }}>{o}</button>
        ))}
      </div>
      {v !== undefined && (
        <>
          <p className={'fb ' + (v === q.answer ? 'ok' : 'no')}>{v === q.answer ? '맞았어요. ' : '아쉬워요. '}{rich(q.why)}</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" autoFocus onClick={() => { if (i + 1 >= items.length) onDone(score, items.length, false); setI(i + 1) }}>{i + 1 >= items.length ? '결과 보기' : '다음 문제'}</button>
          </div>
        </>
      )}
    </section>
  )
}

function Cards({ work }) {
  const cards = useMemo(() => SESSIONS[work].flatMap((s) => [...s.learn, ...s.why].map((c) => ({ ...c, n: s.n }))), [work])
  const [open, setOpen] = useState({})
  const [n, setN] = useState(0)
  const shown = n ? cards.filter((c) => c.n === n) : cards
  return (
    <section className="panel">
      <div className="sec-t"><h2>핵심 카드</h2><span className="note">제목을 보고 스스로 설명한 뒤 눌러서 확인해요</span></div>
      <div className="tabs sm rv-tabs" role="group" aria-label="차시 고르기">
        <button type="button" aria-pressed={n === 0} onClick={() => setN(0)}>모두</button>
        {[1, 2, 3, 4, 5, 6].map((k) => <button key={k} type="button" aria-pressed={n === k} onClick={() => setN(k)}>{k}차시</button>)}
      </div>
      <div className="kcards">
        {shown.map((c) => {
          const k = c.n + c.t
          return (
            <button key={k} type="button" className={'kcard' + (open[k] ? ' on' : '')} aria-expanded={!!open[k]} onClick={() => setOpen({ ...open, [k]: !open[k] })}>
              <span className="kcard-n">{c.n}차시</span>
              <b>{c.t}</b>
              {open[k] ? <><span className="kcard-d">{rich(c.d)}</span>{c.ex && <span className="kcard-ex">{rich(c.ex, { kw: false })}</span>}</> : <span className="kcard-hint">눌러서 확인</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function Review() {
  const user = useApp((s) => s.user)
  const records = useApp((s) => s.records)
  const setField = useApp((s) => s.setField)
  const rv = records.review || {}
  const work = user.work
  const { quiz, words } = useMemo(() => bank(work), [work])
  const [run, setRun] = useState(null) // {title, items, mode}
  const [seed, setSeed] = useState(1)

  // 틀린 문제: 차시 퀴즈에서 틀린 것 + 복습에서 틀린 것 - 복습에서 다시 맞힌 것
  const wrongIds = useMemo(() => {
    const w = { ...(rv.wrong || {}) }
    quiz.forEach((q) => { const v = (records[q.key] || {})['quiz' + q.qi]; if (v !== undefined && v !== q.answer && !(rv.fixed || {})[q.id]) w[q.id] = true })
    return Object.keys(w).filter((k) => w[k])
  }, [records, quiz]) // eslint-disable-line
  const all = [...quiz, ...words]
  const wrongItems = all.filter((q) => wrongIds.includes(q.id))
  const log = rv.log || []

  const start = (mode, title, items) => { if (items.length) { setRun({ mode, title, items }); window.scrollTo(0, 0) } }
  const onAnswer = (q, ok) => {
    const st = useApp.getState().records.review || {}
    const wrong = { ...(st.wrong || {}) }, fixed = { ...(st.fixed || {}) }
    if (ok) { wrong[q.id] = false; fixed[q.id] = true } else { wrong[q.id] = true; fixed[q.id] = false }
    setField('review', 'wrong', wrong); setField('review', 'fixed', fixed)
  }
  const onDone = (score, total, leave) => {
    if (leave) { setRun(null); setSeed(seed + 1); return }
    const st = useApp.getState().records.review || {}
    const entry = { at: Date.now(), mode: run.mode, score, total }
    setField('review', 'log', [...(st.log || []), entry].slice(-40))
    if (run.mode === 'mix') setField('review', 'best', Math.max(st.best || 0, score))
  }

  if (run) {
    return (
      <div className="rv">
        <div className="row" style={{ marginBottom: 14 }}><button type="button" className="btn ghost small" onClick={() => setRun(null)}>그만하고 돌아가기</button></div>
        <Runner key={run.mode + seed} items={run.items} title={run.title} onDone={onDone} onAnswer={onAnswer} work={work} />
      </div>
    )
  }
  const lastMix = log.filter((l) => l.mode === 'mix').slice(-1)[0]
  return (
    <div className="rv stack" style={{ gap: 20 }}>
      <header className="rv-head">
        <img src={`/icons/mascot-${work}-think.svg`} alt="" width="84" height="84" />
        <div>
          <h1 className="display">복습</h1>
          <p className="muted">{WORKS[work].name}에서 배운 것을 다시 꺼내 봐요. 지금까지 {log.length}번 했어요{rv.best ? `. 섞어서 10문제 가장 좋은 점수는 ${rv.best}점이에요` : ''}.</p>
        </div>
      </header>
      <div className="rv-modes">
        <button type="button" className="rv-mode a" data-big={wrongItems.length} disabled={!wrongItems.length} onClick={() => start('wrong', '틀린 문제', shuffle(wrongItems, seed + 11))}>
          <b>틀린 문제</b>
          <span>{wrongItems.length ? `${wrongItems.length}문제가 기다려요. 맞히면 여기서 빠져요.` : '지금은 없어요. 퀴즈에서 틀리면 여기에 모여요.'}</span>
        </button>
        <button type="button" className="rv-mode b" data-big="10" onClick={() => start('mix', '섞어서 10문제', shuffle(all, Date.now() % 9973).slice(0, 10))}>
          <b>섞어서 10문제</b>
          <span>모든 차시 퀴즈와 낱말 문제를 섞어서 내요.{lastMix ? ` 지난번 ${lastMix.score}점` : ''}</span>
        </button>
      </div>
      <section className="panel">
        <div className="sec-t"><h2>차시별로 다시 풀기</h2><span className="note">차시를 골라요</span></div>
        <div className="rv-sess">
          {SESSIONS[work].map((s) => {
            const items = quiz.filter((q) => q.key === s.key)
            const d = records[s.key] || {}
            const right = items.filter((q) => d['quiz' + q.qi] === q.answer).length
            return (
              <button key={s.key} type="button" className="rv-s" onClick={() => start('s' + s.n, `${s.n}차시`, items)}>
                <span className="rv-s-n">{s.n}</span>
                <b>{s.title}</b>
                <small>{items.length}문제 · 차시 퀴즈에서 {right}문제 맞힘</small>
              </button>
            )
          })}
          <button type="button" className="rv-s" onClick={() => start('words', '낱말', shuffle(words, seed + 5).slice(0, 8))}>
            <span className="rv-s-n">가</span>
            <b>낱말 문제</b>
            <small>풀이를 보고 낱말 고르기 · 8문제</small>
          </button>
        </div>
      </section>
      <Cards work={work} />
    </div>
  )
}
