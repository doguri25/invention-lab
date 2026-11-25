import { useState } from 'react'
import { useApp } from '../lib/store'
import { fmt } from '../lib/physics'

export function Section({ n, title, note, children, id }) {
  return (
    <section className="panel" id={id} aria-labelledby={id ? id + '-t' : undefined}>
      <div className="sec-t">
        {n != null && <span className="badge" aria-hidden="true">{n}</span>}
        <h2 id={id ? id + '-t' : undefined}>{title}</h2>
        {note && <span className="note">{note}</span>}
      </div>
      {children}
    </section>
  )
}

export function Talk({ work, expr = 'smile', text }) {
  return (
    <div className="talk">
      <img src={`/icons/mascot-${work}-${expr}.svg`} alt={work === 'rain' ? '안내 캐릭터 똑이' : '안내 캐릭터 돌돌이'} />
      <p className="bubble">{text}</p>
    </div>
  )
}

export function Tools({ items }) {
  return (
    <div className="tools" role="list" aria-label="준비물">
      {items.map(([icon, label]) => (
        <span className="tool" role="listitem" key={label}><img src={`/icons/${icon}.svg`} alt="" />{label}</span>
      ))}
    </div>
  )
}

export function Steps({ items }) {
  return (
    <ol className="steps" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map(([img, text], i) => (
        <li className="step" key={i}>
          <span className="n" aria-hidden="true">{i + 1}</span>
          <img src={`/steps/${img}.svg`} alt="" />
          <p>{text}</p>
        </li>
      ))}
    </ol>
  )
}

export function Picks({ options, value, onChange, answer, reveal }) {
  return (
    <div className="picks" role="group">
      {options.map((o) => {
        let cls = 'pick'
        if (reveal && value === o) cls += answer === undefined ? '' : o === answer ? ' right' : ' wrong'
        return (
          <button key={o} type="button" className={cls} aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>
        )
      })}
    </div>
  )
}

export function SaveBadge() {
  const sync = useApp((s) => s.sync)
  const msg = useApp((s) => s.syncMsg)
  const label = { idle: '저장 준비', saving: '저장 중', saved: '저장됨', offline: '이 기기에 저장됨', error: '저장 못 함' }[sync]
  return <span className={'save ' + sync} title={msg || label} role="status" aria-live="polite"><i /><span className="save-t">{label}</span></span>
}

const avg = (vals) => {
  const n = vals.map((v) => parseFloat(v)).filter((v) => Number.isFinite(v))
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : NaN
}

export function RecordTable({ spec, data = {}, onChange, readOnly, answers }) {
  const cols = spec.cols
  return (
    <div className="rec-wrap">
      <table className="rec">
        <caption className="sr">{spec.title}</caption>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left' }}>{spec.unit ? `단위: ${spec.unit}` : ''}</th>
            {cols.map((c) => <th scope="col" key={c}>{c}</th>)}
            {spec.avg && <th scope="col">평균</th>}
          </tr>
        </thead>
        <tbody>
          {spec.rows.map((r) => {
            const vals = cols.map((_, j) => data[`${r.id}_${j}`] ?? '')
            const a = avg(vals)
            return (
              <tr key={r.id}>
                <td className="h" scope="row">{r.label}</td>
                {cols.map((c, j) => (
                  <td key={c}>
                    {readOnly ? <span>{vals[j] === '' ? '·' : vals[j]}</span> : (
                      <input className="num" inputMode={r.text ? 'text' : 'decimal'} aria-label={`${r.label} ${c}`}
                        value={vals[j]} onChange={(e) => onChange(`${r.id}_${j}`, e.target.value)} placeholder={answers ? '' : ''} />
                    )}
                  </td>
                ))}
                {spec.avg && <td className="avg" aria-label={`${r.label} 평균`}>{Number.isFinite(a) ? fmt(a, 1) : '–'}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const near = (v, ans, tol) => {
  const x = parseFloat(String(v).replace(',', ''))
  if (!Number.isFinite(x)) return null
  const t = tol ?? Math.max(0.051, Math.abs(ans) * 0.02)
  return Math.abs(x - ans) <= t
}

export function Stairs({ items, data = {}, onChange, readOnly, showAnswers }) {
  const [hint, setHint] = useState({})
  return (
    <div className="stairs">
      {items.map((it, i) => {
        const blanks = it.parts.filter((p) => typeof p === 'object')
        const filled = blanks.every((b) => (data[b.b] ?? '') !== '')
        const ok = filled && blanks.every((b) => b.free || near(data[b.b], b.ans, b.tol))
        return (
          <div className={'stair' + (filled ? (ok ? ' is-ok' : ' is-no') : '')} key={it.id}>
            <span className="k" aria-hidden="true">{i + 1}</span>
            <div className="stair-body">
              {it.parts.map((p, j) => typeof p === 'string' ? <span key={j} className="stair-t">{p}</span> : (
                readOnly ? (
                  showAnswers && (data[p.b] ?? '') === '' ? (
                    <span key={j} className="blank key">{p.free ? '학생 값' : p.ans}</span>
                  ) : (
                    <span key={j} className={'blank ' + (p.free ? '' : near(data[p.b], p.ans, p.tol) ? 'ok' : 'no')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {data[p.b] || '·'}{showAnswers && !p.free && <small style={{ color: '#188038', marginLeft: 4 }}>({p.ans})</small>}
                    </span>
                  )
                ) : (
                  <input key={j} className={'blank ' + (data[p.b] === undefined || data[p.b] === '' ? '' : p.free ? '' : near(data[p.b], p.ans, p.tol) ? 'ok' : 'no')}
                    inputMode="decimal" aria-label={`${i + 1}번 빈칸`} value={data[p.b] ?? ''} onChange={(e) => onChange(p.b, e.target.value)} />
                )
              ))}
            </div>
            <div className="stair-side">
              {filled && !readOnly && <span className={'mark ' + (ok ? 'ok' : 'no')}>{ok ? '맞았어요' : '다시 계산해 봐요'}</span>}
              {it.hint && !readOnly && !ok && (
                <button type="button" className="hint-btn" aria-expanded={!!hint[i]} onClick={() => setHint({ ...hint, [i]: !hint[i] })}>힌트</button>
              )}
            </div>
            {it.hint && !readOnly && hint[i] && !ok && <p className="stair-hint" role="note">{it.hint}</p>}
          </div>
        )
      })}
    </div>
  )
}

// 알아 두기 카드
export function Learn({ items }) {
  if (!items || !items.length) return null
  return (
    <div className="learn">
      {items.map((c) => (
        <article className="learn-card" key={c.t}>
          <div className="learn-in">
            {c.img && <div className="learn-img"><img src={c.img} alt="" loading="lazy" /></div>}
            <div className="learn-body">
              <h3>{c.t}</h3>
              <p>{c.d}</p>
              {c.ex && <p className="learn-ex">{c.ex}</p>}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

// 안전·요령 같은 짧은 목록 상자
export function Callout({ tone = 'info', title, items, children }) {
  if (!children && (!items || !items.length)) return null
  return (
    <aside className={'callout ' + tone} aria-label={title}>
      <b className="callout-t">{title}</b>
      {items && <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>}
      {children}
    </aside>
  )
}

export function Think({ item, data = {}, onChange, readOnly, work }) {
  const v = data[item.id]
  if (item.type === 'pick') {
    return (
      <div>
        <p className="quiz-q">{item.q}</p>
        {readOnly ? <p>{v || '·'}</p> : <Picks options={item.options} value={v} onChange={(o) => onChange(item.id, o)} answer={item.answer} reveal={!!v} />}
        {v && item.answer && !readOnly && (
          <p className={'fb ' + (v === item.answer ? 'ok' : 'no')}>{v === item.answer ? (item.why || '좋아요!') : '실험 결과를 다시 떠올려 볼까요?'}</p>
        )}
        <textarea className="field" style={{ marginTop: 10, minHeight: 64 }} placeholder="그렇게 생각한 까닭" aria-label={item.q + ' 까닭'}
          value={data[item.id + '_why'] || ''} onChange={(e) => onChange(item.id + '_why', e.target.value)} readOnly={readOnly} />
      </div>
    )
  }
  if (item.type === 'frame') {
    const [a, b] = [data[item.id + '_a'] || '', data[item.id + '_b'] || '']
    return (
      <div>
        <p className="quiz-q">{item.q}</p>
        <div className="row" style={{ alignItems: 'center' }}>
          <span>{item.parts[0]}</span>
          <input className="field" style={{ flex: '1 1 220px' }} aria-label="언제" placeholder="언제" value={a} readOnly={readOnly} onChange={(e) => onChange(item.id + '_a', e.target.value)} />
          <span>{item.parts[2]}</span>
          <input className="field" style={{ flex: '1 1 260px' }} aria-label="무엇을 해 주는" placeholder="무엇을 해 주는" value={b} readOnly={readOnly} onChange={(e) => onChange(item.id + '_b', e.target.value)} />
          <span>{item.parts[4]}</span>
        </div>
      </div>
    )
  }
  if (item.type === 'fair') {
    const f = [['changed', '바꾼 것'], ['same', '같게 한 것'], ['measured', '잰 것']]
    return (
      <div>
        <p className="quiz-q">{item.q}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {f.map(([k, l]) => (
            <label key={k} className="stack" style={{ gap: 6 }}>
              <b style={{ color: 'var(--pd)' }}>{l}</b>
              <input className="field" value={data[item.id + '_' + k] || ''} readOnly={readOnly} onChange={(e) => onChange(item.id + '_' + k, e.target.value)} />
            </label>
          ))}
        </div>
      </div>
    )
  }
  if (item.type === 'table') {
    const opts = { 0: ['○', '×'], 1: ['○', '×'], 2: ['1', '2', '3', '4', '5'] }
    return (
      <div>
        <p className="quiz-q">{item.q}</p>
        <div className="rec-wrap">
          <table className="rec">
            <thead><tr><th style={{ textAlign: 'left' }}>벗긴 방법</th>{item.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {item.rows.map((r, i) => (
                <tr key={r}>
                  <td className="h">{r}</td>
                  {item.cols.map((c, j) => (
                    <td key={c}>
                      <div className="picks" style={{ justifyContent: 'center', gap: 6 }}>
                        {opts[j].map((o) => {
                          const k = `${item.id}_${i}_${j}`
                          return <button key={o} type="button" className="pick" style={{ minHeight: 42, padding: '0 12px' }} aria-pressed={data[k] === o} aria-label={`${r} ${c} ${o}`}
                            disabled={readOnly} onClick={() => onChange(k, o)}>{o}</button>
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
  return (
    <div>
      <p className="quiz-q">{item.q}</p>
      {item.hint && <p className="small muted" style={{ marginBottom: 8 }}>{item.hint}</p>}
      <textarea className="field" aria-label={item.q} value={v || ''} readOnly={readOnly} onChange={(e) => onChange(item.id, e.target.value)} />
    </div>
  )
}

export function Quiz({ items, data = {}, onChange }) {
  const score = items.filter((q, i) => data['quiz' + i] === q.answer).length
  const done = items.every((q, i) => data['quiz' + i] !== undefined)
  return (
    <div>
      {items.map((q, i) => {
        const v = data['quiz' + i]
        return (
          <div className="quiz-item" key={i}>
            <p className="quiz-q">{i + 1}. {q.q}</p>
            <div className="picks">
              {q.options.map((o, j) => {
                let cls = 'pick'
                if (v !== undefined && v === j) cls += j === q.answer ? ' right' : ' wrong'
                return <button key={o} type="button" className={cls} aria-pressed={v === j} onClick={() => onChange('quiz' + i, j)}>{o}</button>
              })}
            </div>
            {v !== undefined && <p className={'fb ' + (v === q.answer ? 'ok' : 'no')}>{v === q.answer ? '맞았어요. ' : '다시 생각해 봐요. '}{q.why}</p>}
          </div>
        )
      })}
      {done && <p className="fb ok" style={{ marginTop: 16, fontWeight: 700 }}>{items.length}문제 중 {score}문제를 맞혔어요.</p>}
    </div>
  )
}

export function LineChart({ series, xMax, yMax, xLabel, yLabel, height = 220, marks = [], w = 520 }) {
  const W = w, H = height, l = 48, r = 14, t = 16, b = 34
  const x = (v) => l + (v / (xMax || 1)) * (W - l - r)
  const y = (v) => H - b - (v / (yMax || 1)) * (H - t - b)
  const ticks = 5
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`${yLabel}와 ${xLabel} 그래프`}>
      {Array.from({ length: ticks + 1 }, (_, i) => (
        <g key={i}>
          <line x1={l} x2={W - r} y1={y((yMax * i) / ticks)} y2={y((yMax * i) / ticks)} stroke="#e8eaed" />
          <text x={l - 8} y={y((yMax * i) / ticks) + 4} fontSize="12" textAnchor="end" fill="#5f6368">{Math.round((yMax * i) / ticks)}</text>
        </g>
      ))}
      {Array.from({ length: ticks + 1 }, (_, i) => (
        <text key={i} x={x((xMax * i) / ticks)} y={H - b + 18} fontSize="12" textAnchor="middle" fill="#5f6368">{Math.round((xMax * i) / ticks)}</text>
      ))}
      {marks.map((m) => <line key={m.y} x1={l} x2={W - r} y1={y(m.y)} y2={y(m.y)} stroke={m.color} strokeDasharray="5 4" strokeWidth="1.5" />)}
      {series.map((s) => (
        <polyline key={s.name} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" points={s.pts.map(([a, c]) => `${x(a)},${y(c)}`).join(' ')} />
      ))}
      <text x={l} y={11} fontSize="12" fontWeight="700" fill="#3c4043">{yLabel}</text>
      <text x={W - r} y={H - 4} fontSize="12" fontWeight="700" textAnchor="end" fill="#3c4043">{xLabel}</text>
    </svg>
  )
}
