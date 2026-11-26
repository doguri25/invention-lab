import { useState } from 'react'
import { useApp } from '../lib/store'
import { fmt } from '../lib/physics'
import { rich } from '../lib/rich'
import { IdeaList, Fig, Pic } from './extra'

const STATE = { done: '다 했어요', half: '하는 중' }
export function Section({ n, title, note, children, id, state, block }) {
  return (
    <section className={'panel' + (state ? ' st-' + state : '')} id={id} data-block={block} aria-labelledby={id ? id + '-t' : undefined}>
      <div className="sec-t">
        {n != null && <span className="badge" aria-hidden="true">{n}</span>}
        <h2 id={id ? id + '-t' : undefined}>{title}</h2>
        {STATE[state] && <span className={'sec-st ' + state}>{STATE[state]}</span>}
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
      <p className="bubble">{rich(text)}</p>
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
  const label = { idle: '저장 준비', saving: '저장 중', saved: '저장됨', offline: '이 기기에 저장됨', error: '이 기기에 저장됨' }[sync]
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
                {spec.avg && <td className="avg" aria-label={`${r.label} 평균`}>{Number.isFinite(a) ? fmt(a, 1) : ''}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
      {spec.note && !readOnly && <p className="small muted rec-note">{spec.note}</p>}
    </div>
  )
}

export const avgOf = (data = {}, id, n = 3) => avg(Array.from({ length: n }, (_, j) => data[`${id}_${j}`]))

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
            {c.img && <Pic src={c.img} alt={c.t} className="learn-img" />}
            <div className="learn-body">
              <h3>{c.t}</h3>
              <p>{rich(c.d)}</p>
              {c.ex && <p className="learn-ex">{rich(c.ex, { kw: false })}</p>}
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
      {items && <ul>{items.map((t) => <li key={t}>{rich(t)}</li>)}</ul>}
      {children}
    </aside>
  )
}

export function Think({ item, data = {}, onChange, readOnly, work }) {
  const v = data[item.id]
  if (item.type === 'list') return <IdeaList item={item} data={data} onChange={onChange} readOnly={readOnly} />
  if (item.type === 'pick') {
    return (
      <div>
        <p className="quiz-q">{item.q}</p>
        {readOnly ? <p>{v || '·'}</p> : <Picks options={item.options} value={v} onChange={(o) => onChange(item.id, o)} answer={item.answer} reveal={!!v} />}
        {v && item.answer && !readOnly && (
          <p className={'fb ' + (v === item.answer ? 'ok' : 'no')}>{v === item.answer ? rich(item.why || '좋아요!') : '실험 결과를 다시 떠올려 볼까요?'}</p>
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
        {item.fig && !readOnly && <Fig fig={item.fig} />}
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
                          return <button key={o} type="button" className="pick" style={{ minHeight: 44, padding: '0 12px' }} aria-pressed={data[k] === o} aria-label={`${r} ${c} ${o}`}
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
            {v !== undefined && <p className={'fb ' + (v === q.answer ? 'ok' : 'no')}>{v === q.answer ? '맞았어요. ' : '다시 생각해 봐요. '}{rich(q.why)}</p>}
          </div>
        )
      })}
      {done && <p className="fb ok" style={{ marginTop: 16, fontWeight: 700 }}>{items.length}문제 중 {score}문제를 맞혔어요.</p>}
    </div>
  )
}

// 그래프 색: 색을 잘 구분하지 못해도 갈리도록 검사해서 고른 파랑·주황·청록
export const SERIES = ['#1967d2', '#d56e0c', '#00897b']
const SHAPES = ['circle', 'square', 'triangle']
function Dot({ shape, x, y, color, r = 5 }) {
  if (shape === 'square') return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx="1.5" fill={color} stroke="#fff" strokeWidth="2" />
  if (shape === 'triangle') return <path d={`M${x} ${y - r - 1.5}L${x + r + 1} ${y + r}H${x - r - 1}Z`} fill={color} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
  return <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth="2" />
}

// compact: 3D 실험실 안에 작게 넣을 때(안내 글 줄을 뺀다). 점이 12개를 넘는 선은 끝점에만 표시를 단다.
export function LineChart({ series, xMax, yMax, xLabel, yLabel, xUnit = '', yUnit = '', height = 230, marks = [], w = 520, compact, tags: showTags = true }) {
  const [tip, setTip] = useState(null)
  const W = w, H = height, l = 48, r = showTags ? 46 : 14, t = 18, b = 34
  const x = (v) => l + (v / (xMax || 1)) * (W - l - r)
  const y = (v) => H - b - (v / (yMax || 1)) * (H - t - b)
  const ticks = 5
  const r1 = (v) => Math.round(v * 10) / 10
  const dense = (s) => s.pts.length > 12
  // 단위 붙이기: 초·° 는 붙여 쓰고 mL·g 은 한 칸 띈다
  const u = (v, unit) => r1(v) + (unit ? (/^[가-힣°]/.test(unit) ? '' : '\u00a0') + unit : '')
  // 선 끝 이름표: 세로축 위의 외톨이 점에는 달지 않고, 서로 겹치면 아래로 민다
  const tags = series.map((s, i) => { const last = s.pts[s.pts.length - 1]; return last && showTags && series.length > 1 && !(s.pts.length === 1 && last[0] === 0) ? { i, x: Math.min(W - r + 8, x(last[0]) + 10), y: y(last[1]) + 4 } : null }).filter(Boolean).sort((a, b) => a.y - b.y)
  tags.forEach((g, k) => { const up = tags.slice(0, k).filter((o) => Math.abs(o.x - g.x) < 44); up.forEach((o) => { if (g.y - o.y < 13) g.y = o.y + 13 }) })
  const tagOf = (i) => tags.find((g) => g.i === i)
  const say = (s) => (dense(s) ? [s.pts[0], s.pts[s.pts.length - 1]] : s.pts).map(([a, c]) => `${u(a, xUnit)}에 ${u(c, yUnit)}`).join(', ')
  const pts = series.flatMap((s, si) => s.pts.map(([a, c], pi) => ({ s, si, pi, a, c })))
  // 손가락이나 마우스에서 가장 가까운 점
  const near = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W, py = ((e.clientY - box.top) / box.height) * H
    let best = null, bd = Infinity
    pts.forEach((p) => { const d = (x(p.a) - px) ** 2 + (y(p.c) - py) ** 2; if (d < bd) { bd = d; best = p } })
    setTip(best)
  }
  return (
    <div className="chart">
      {series.length > 1 && (
        <div className="legend" aria-hidden="true">
          {series.map((s, i) => <span key={s.name}><svg width="16" height="16" viewBox="0 0 16 16"><Dot shape={SHAPES[i % 3]} x={8} y={8} color={s.color} /></svg>{s.name}</span>)}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' }} role="img"
        aria-label={`${yLabel}와 ${xLabel} 꺾은선그래프. ` + series.filter((s) => s.pts.length).map((s) => `${s.name}: ` + say(s)).join('. ')}
        onPointerMove={near} onPointerDown={near} onPointerLeave={() => setTip(null)}>
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
        {series.map((s, i) => {
          const last = s.pts[s.pts.length - 1]
          if (!last) return null
          return (
            <g key={s.name}>
              <polyline fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={s.pts.map(([a, c]) => `${x(a)},${y(c)}`).join(' ')} />
              {(dense(s) ? [last] : s.pts).map(([a, c], k) => <Dot key={k} shape={SHAPES[i % 3]} x={x(a)} y={y(c)} color={s.color} r={4.5} />)}
              {tagOf(i) && <text x={tagOf(i).x} y={tagOf(i).y} fontSize="12" fontWeight="700" fill="#3c4043" stroke="#fff" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">{s.name}</text>}
            </g>
          )
        })}
        {tip && (
          <g pointerEvents="none">
            <line x1={x(tip.a)} x2={x(tip.a)} y1={t} y2={H - b} stroke="#9aa0a6" strokeDasharray="3 3" />
            <circle cx={x(tip.a)} cy={y(tip.c)} r="9" fill="none" stroke={tip.s.color} strokeWidth="2.5" />
          </g>
        )}
        <text x={l} y={11} fontSize="12" fontWeight="700" fill="#3c4043">{yLabel}</text>
        <text x={W - r} y={H - 4} fontSize="12" fontWeight="700" textAnchor="end" fill="#3c4043">{xLabel}</text>
      </svg>
      {(!compact || tip) && <p className="chart-tip" aria-live="polite">{tip ? <><b>{tip.s.name}</b> {u(tip.a, xUnit)}일 때 {u(tip.c, yUnit)}</> : pts.length > series.length ? '그래프에 손을 대면 값이 보여요.' : ''}</p>}
    </div>
  )
}
