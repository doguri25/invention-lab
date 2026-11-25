import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { GLOSSARY } from '../data/content'

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1])

function WordQuiz({ pool }) {
  const make = () => {
    const [q, ...rest] = shuffle(pool)
    return { q, opts: shuffle([q, ...shuffle(rest).slice(0, 2)]), pick: null }
  }
  const [s, setS] = useState(make)
  if (pool.length < 3) return null
  return (
    <section className="panel" style={{ background: 'var(--ps)', boxShadow: 'none' }}>
      <div className="sec-t"><h2>낱말 맞히기</h2><span className="note">설명을 읽고 알맞은 낱말을 골라요</span></div>
      <p style={{ fontWeight: 700, fontSize: '1.08em', marginBottom: 12 }}>{s.q[2]}</p>
      <div className="picks">
        {s.opts.map((o) => {
          let cls = 'pick'
          if (s.pick) { if (o[1] === s.q[1]) cls += ' right'; else if (o[1] === s.pick) cls += ' wrong' }
          return <button key={o[1]} className={cls} onClick={() => !s.pick && setS({ ...s, pick: o[1] })}>{o[1]}</button>
        })}
      </div>
      {s.pick && (
        <div className="row" style={{ marginTop: 12 }}>
          <p className={'fb ' + (s.pick === s.q[1] ? 'ok' : 'no')} style={{ margin: 0 }}>{s.pick === s.q[1] ? '맞았어요!' : `정답은 ‘${s.q[1]}’이에요.`}</p>
          <button className="btn small" onClick={() => setS(make())}>다음 문제</button>
        </div>
      )}
    </section>
  )
}

export default function Words() {
  const user = useApp((s) => s.user)
  const known = useApp((s) => s.records.words) || {}
  const setField = useApp((s) => s.setField)
  const mine = user.work === 'rain' ? '빗물' : '테이프'
  const [f, setF] = useState('mine')
  const [q, setQ] = useState('')
  const list = useMemo(() => GLOSSARY.filter(([w, t, d]) => (f === 'all' || (f === 'mine' ? w === mine || w === '공통' : w === '공통')) && (!q || (t + d).includes(q.trim()))), [f, q, mine])
  const pool = GLOSSARY.filter(([w]) => w === mine || w === '공통')
  const cnt = pool.filter(([, t]) => known[t]).length
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }} className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="display" style={{ fontSize: '1.9em' }}>낱말 사전</h1>
        <span className="chip">내 작품 낱말 {pool.length}개 중 {cnt}개를 알아요</span>
      </div>
      <div className="panel row">
        <input className="field" style={{ flex: '1 1 260px' }} placeholder="낱말이나 설명으로 찾기" value={q} onChange={(e) => setQ(e.target.value)} aria-label="낱말 찾기" />
        <div className="tabs" role="group" aria-label="낱말 고르기" style={{ boxShadow: 'none', background: '#f1f3f4' }}>
          <button aria-pressed={f === 'mine'} onClick={() => setF('mine')}>내 작품</button>
          <button aria-pressed={f === 'common'} onClick={() => setF('common')}>공통</button>
          <button aria-pressed={f === 'all'} onClick={() => setF('all')}>전체</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {list.map(([w, t, d, n]) => (
          <article key={t} className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 10, borderTop: `5px solid ${w === '공통' ? 'var(--green)' : w === '빗물' ? 'var(--rain)' : 'var(--tape)'}` }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 className="display" style={{ fontSize: '1.4em' }}>{t}</h2>
              <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                {n && <span className="chip gray">{n}차시</span>}
                <span className={'chip ' + (w === '공통' ? 'green' : w === '빗물' ? 'rain' : 'tape')}>{w}</span>
              </span>
            </div>
            <p style={{ flex: 1 }}>{d}</p>
            <button className={'btn small ' + (known[t] ? '' : 'ghost')} aria-pressed={!!known[t]} onClick={() => setField('words', t, !known[t])} style={{ alignSelf: 'flex-start' }}>
              {known[t] ? '★ 내 말로 설명할 수 있어요' : '☆ 내 말로 설명할 수 있나요?'}
            </button>
          </article>
        ))}
        {list.length === 0 && <p className="muted">찾는 낱말이 없어요. 다른 말로 찾아봐요.</p>}
      </div>
      <WordQuiz pool={pool} />
    </div>
  )
}
