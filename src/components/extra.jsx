import { useEffect, useMemo, useRef, useState } from 'react'
import { THINK_CARDS } from '../data/content'

/* 그림 크게 보기 */
let openZoom = null
export const zoom = (src, alt) => openZoom && openZoom({ src, alt })

export function ZoomLayer() {
  const [z, setZ] = useState(null)
  const btn = useRef(null)
  useEffect(() => { openZoom = setZ; return () => { openZoom = null } }, [])
  useEffect(() => {
    if (!z) return
    const key = (e) => { if (e.key === 'Escape') setZ(null) }
    window.addEventListener('keydown', key)
    btn.current && btn.current.focus()
    return () => window.removeEventListener('keydown', key)
  }, [z])
  if (!z) return null
  return (
    <div className="zoom" role="dialog" aria-modal="true" aria-label="그림 크게 보기" onClick={() => setZ(null)}>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={z.src} alt={z.alt || ''} />
        {z.alt && <figcaption>{z.alt}</figcaption>}
      </figure>
      <button ref={btn} type="button" className="btn zoom-x" onClick={() => setZ(null)}>닫기</button>
    </div>
  )
}

const ZoomIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10V4h6M20 14v6h-6M4 4l7 7M20 20l-7-7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

// 누르면 크게 보이는 그림
export function Pic({ src, alt, className = '' }) {
  return (
    <button type="button" className={'pic ' + className} onClick={() => zoom(src, alt)} aria-label={(alt || '그림') + ' 크게 보기'}>
      <img src={src} alt="" loading="lazy" />
      <span className="pic-zoom" aria-hidden="true"><ZoomIcon />크게</span>
    </button>
  )
}

// 실험 장치 그림과 설명
export function Fig({ fig }) {
  if (!fig) return null
  return (
    <figure className="fig">
      <Pic src={fig[0]} alt={fig[1]} />
      <figcaption>{fig[1]}</figcaption>
    </figure>
  )
}

const stepSrc = (img) => (img.startsWith('/') ? img : `/steps/${img}.svg`)

// 실험 순서: 그림, 한 줄 제목, 자세한 설명
export function StepList({ items }) {
  return (
    <ol className="steps2">
      {items.map(([img, title, detail], i) => (
        <li className="step2" key={i}>
          <Pic src={stepSrc(img)} alt={`${i + 1}. ${title}`} className="step2-pic" />
          <div className="step2-body">
            <span className="step2-n" aria-hidden="true">{i + 1}</span>
            <h3>{title}</h3>
            <p>{detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/* 물결 진행 줄: 캐릭터가 한 만큼 앞으로 간다 */
export function Wave({ value = 0, work, label }) {
  const v = Math.min(1, Math.max(0, value))
  const d = useMemo(() => {
    let p = 'M4 14'
    for (let i = 0; i < 12; i++) p += ` q 12.33 ${i % 2 ? 12 : -12} 24.66 0`
    return p
  }, [])
  return (
    <div className="wave" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label || '한 만큼'}>
      <svg viewBox="0 0 304 28" preserveAspectRatio="none" aria-hidden="true">
        <path d={d} className="wave-track" />
        <path d={d} className="wave-fill" style={{ clipPath: `inset(-20px ${100 - v * 100}% -20px -20px)` }} />
      </svg>
      {work && <img className="wave-rider" src={`/icons/mascot-${work}-smile.svg`} alt="" style={{ left: `calc(${v * 100}% * 0.94 + 3%)` }} />}
    </div>
  )
}

/* 쿠키 모양(가장자리가 올록볼록한 동그라미) */
const cookiePath = (() => {
  const n = 12, R = 46, r = 40, c = 50
  let p = ''
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2
    const rad = i % 2 ? r : R
    const x = c + rad * Math.cos(a), y = c + rad * Math.sin(a)
    if (i === 0) p += `M${x.toFixed(1)} ${y.toFixed(1)}`
    else {
      const am = (Math.PI * (i - 0.5)) / n - Math.PI / 2
      const rm = (i % 2 ? R : r) * 0.5 + rad * 0.5 + (i % 2 ? 1.5 : -1.5)
      p += ` Q${(c + rm * Math.cos(am)).toFixed(1)} ${(c + rm * Math.sin(am)).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
    }
  }
  return p + 'Z'
})()

export function Cookie({ children, className = '', size = 64, ...rest }) {
  return (
    <span className={'cookie ' + className} style={{ width: size, height: size }} {...rest}>
      <svg viewBox="0 0 100 100" aria-hidden="true"><path d={cookiePath} /></svg>
      <span className="cookie-in">{children}</span>
    </span>
  )
}

export function Stamp({ small }) {
  return <Cookie className={'stamp' + (small ? ' sm' : '')} size={small ? 58 : 92} role="img" aria-label="참 잘했어요 도장"><span>참 잘했어요</span></Cookie>
}

/* 막대그래프 */
export function BarChart({ bars, refs = [], unit = '', height = 220 }) {
  const W = 520, H = height, l = 46, r = 14, t = 18, b = 44
  const max = Math.max(10, ...bars.map((x) => x.v || 0), ...refs.map((x) => x.v || 0)) * 1.15
  const y = (v) => H - b - (v / max) * (H - t - b)
  const bw = (W - l - r) / bars.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img"
      aria-label={'막대그래프. ' + bars.map((x) => `${x.name} ${Number.isFinite(x.v) ? x.v.toFixed(1) + unit : '아직 없음'}`).join(', ')}>
      {[0, 0.25, 0.5, 0.75, 1].map((k) => (
        <g key={k}>
          <line x1={l} x2={W - r} y1={y(max * k)} y2={y(max * k)} stroke="#e8eaed" />
          <text x={l - 8} y={y(max * k) + 4} fontSize="12" textAnchor="end" fill="#5f6368">{Math.round(max * k)}</text>
        </g>
      ))}
      {bars.map((x, i) => {
        const v = Number.isFinite(x.v) ? x.v : 0
        return (
          <g key={x.name}>
            <rect x={l + bw * i + bw * 0.22} y={y(v)} width={bw * 0.56} height={H - b - y(v)} rx="8" fill={x.color || '#1a73e8'} />
            {Number.isFinite(x.v) && <text x={l + bw * (i + 0.5)} y={y(v) - 6} fontSize="13" fontWeight="700" textAnchor="middle" fill="#1f1f1f">{x.v.toFixed(1)}</text>}
            <text x={l + bw * (i + 0.5)} y={H - b + 18} fontSize="13" fontWeight="600" textAnchor="middle" fill="#3c4043">{x.name}</text>
          </g>
        )
      })}
      {refs.filter((x) => Number.isFinite(x.v)).map((x) => (
        <g key={x.name}>
          <line x1={l} x2={W - r} y1={y(x.v)} y2={y(x.v)} stroke={x.color} strokeDasharray="6 5" strokeWidth="2" />
          <text x={l + 6} y={y(x.v) - 7} fontSize="12" fontWeight="700" fill={x.color} stroke="#fff" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">{x.name} {x.v.toFixed(1)} {unit}</text>
        </g>
      ))}
      <text x={l} y={12} fontSize="12" fontWeight="700" fill="#3c4043">{unit}</text>
    </svg>
  )
}

/* 여러 칸에 떠올린 것 적기 */
export function IdeaList({ item, data = {}, onChange, readOnly, peek }) {
  const n = item.n || 3
  return (
    <div>
      <p className="quiz-q">{item.q}</p>
      {item.hint && <p className="small muted" style={{ marginBottom: 8 }}>{item.hint}</p>}
      <div className="ideas">
        {Array.from({ length: n }, (_, i) => (
          <label key={i} className="idea">
            <span className="idea-n" aria-hidden="true">{i + 1}</span>
            <input className="field" aria-label={`${item.q} ${i + 1}번째`} value={data[`${item.id}_${i}`] || ''} readOnly={readOnly}
              placeholder={readOnly ? '' : peek && item.sample ? '예: ' + item.sample[i] : item.ph || ''} onChange={(e) => onChange(`${item.id}_${i}`, e.target.value)} />
          </label>
        ))}
      </div>
      {item.link && !readOnly && <a className="btn tone small" style={{ marginTop: 10 }} href={item.link[0]}>{item.link[1]}</a>}
    </div>
  )
}

/* 생각 카드: 하나 골라 아이디어 쓰기 */
export function CardPick({ item, data = {}, onChange, readOnly, peek }) {
  const picked = data[item.id + '_card']
  const card = THINK_CARDS.find((c) => c[0] === picked)
  return (
    <div>
      <p className="quiz-q">{item.q}</p>
      <div className="tcards" role="group" aria-label="생각 카드">
        {THINK_CARDS.map(([name, prompt]) => (
          <button key={name} type="button" className="tcard" aria-pressed={picked === name} disabled={readOnly} onClick={() => onChange(item.id + '_card', name)}>
            <b>{name}</b><span>{prompt}</span>
          </button>
        ))}
      </div>
      <textarea className="field" style={{ marginTop: 10, minHeight: 72 }} readOnly={readOnly} aria-label={item.q}
        placeholder={peek && item.sample ? '예: ' + item.sample : card ? card[1] : '카드를 하나 고르고 아이디어를 적어요'}
        value={data[item.id] || ''} onChange={(e) => onChange(item.id, e.target.value)} />
    </div>
  )
}

/* 그림판: 손가락이나 펜으로 그린 선을 좌표로 저장한다 */
const PENS = [['#1f1f1f', '검정'], ['#1a73e8', '파랑'], ['#d93025', '빨강'], ['#188038', '초록']]
const MAX_PTS = 9000
const count = (s) => s.reduce((a, x) => a + x.p.length / 2, 0)

export function Sketch({ value, onChange, panels = 1, readOnly, label = '그림판' }) {
  const strokes = (value && value.s) || []
  const H = panels > 1 ? 400 : 560
  const [color, setColor] = useState(PENS[0][0])
  const [thick, setThick] = useState(false)
  const [live, setLive] = useState(null)
  const [sure, setSure] = useState(false)
  const cur = useRef(null)
  const svg = useRef(null)
  const full = count(strokes) > MAX_PTS
  const pt = (e) => {
    const r = svg.current.getBoundingClientRect()
    return [Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * H)]
  }
  const down = (e) => {
    if (readOnly || full) return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* 일부 기기 */ }
    cur.current = { c: color, w: thick ? 12 : 5, p: pt(e) }
    setLive({ ...cur.current })
    setSure(false)
  }
  const move = (e) => {
    const c = cur.current
    if (!c) return
    const [x, y] = pt(e), n = c.p.length
    if ((x - c.p[n - 2]) ** 2 + (y - c.p[n - 1]) ** 2 < 30) return
    c.p.push(x, y)
    setLive({ ...c, p: c.p.slice() })
  }
  const up = () => {
    const c = cur.current
    if (!c) return
    cur.current = null
    setLive(null)
    if (c.p.length === 2) c.p.push(c.p[0] + 1, c.p[1] + 1)
    onChange({ v: 1, s: [...strokes, c] })
  }
  const line = (s, i) => <polyline key={i} points={s.p.reduce((a, v, j) => a + (j % 2 ? ',' : ' ') + v, '').trim()} fill="none" stroke={s.c} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" />
  return (
    <div className={'sketch' + (readOnly ? ' ro' : '')}>
      {!readOnly && (
        <div className="sketch-bar">
          <div className="sketch-pens" role="group" aria-label="펜 색">
            {PENS.map(([c, n]) => <button key={c} type="button" className="pen" aria-pressed={color === c} aria-label={n} title={n} onClick={() => setColor(c)}><i style={{ background: c }} /></button>)}
          </div>
          <button type="button" className="sk-btn" aria-pressed={thick} onClick={() => setThick(!thick)}>{thick ? '굵은 펜' : '가는 펜'}</button>
          <span style={{ flex: 1 }} />
          <button type="button" className="sk-btn" disabled={!strokes.length} onClick={() => onChange({ v: 1, s: strokes.slice(0, -1) })}>한 획 지우기</button>
          <button type="button" className={'sk-btn' + (sure ? ' warn' : '')} disabled={!strokes.length}
            onClick={() => { if (sure) { onChange({ v: 1, s: [] }); setSure(false) } else setSure(true) }}>{sure ? '정말 다 지울까요?' : '모두 지우기'}</button>
        </div>
      )}
      <svg ref={svg} className="sketch-pad" viewBox={`0 0 1000 ${H}`} role="img" aria-label={`${label}. 선 ${strokes.length}개를 그렸어요.`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
        {Array.from({ length: panels - 1 }, (_, i) => <line key={i} x1={(1000 / panels) * (i + 1)} x2={(1000 / panels) * (i + 1)} y1="16" y2={H - 16} stroke="#c4cad3" strokeWidth="3" strokeDasharray="10 10" />)}
        {panels > 1 && Array.from({ length: panels }, (_, i) => (
          <g key={i}><circle cx={(1000 / panels) * i + 40} cy="40" r="22" fill="#e8eaed" /><text x={(1000 / panels) * i + 40} y="49" fontSize="26" fontWeight="700" textAnchor="middle" fill="#5f6368">{i + 1}</text></g>
        ))}
        {strokes.map(line)}
        {live && line(live, 'live')}
        {!strokes.length && !live && !readOnly && <text x="500" y={H / 2 + 8} fontSize="30" textAnchor="middle" fill="#9aa0a6">여기에 손가락이나 펜으로 그려요</text>}
        {!strokes.length && readOnly && <text x="500" y={H / 2 + 8} fontSize="28" textAnchor="middle" fill="#9aa0a6">아직 그림이 없어요</text>}
      </svg>
      {full && !readOnly && <p className="small" style={{ color: 'var(--red)', marginTop: 6 }}>그림판이 가득 찼어요. 몇 획을 지우면 더 그릴 수 있어요.</p>}
    </div>
  )
}

/* 창의 활동 한 토막 */
export function Create({ spec, data = {}, set, sk = {}, setSk, readOnly }) {
  const [peek, setPeek] = useState(false)
  return (
    <div className="create">
      <p className="create-intro">{spec.intro}</p>
      <div className="stack" style={{ gap: 24 }}>
        {spec.items.map((it) => {
          if (it.type === 'list') return <IdeaList key={it.id} item={it} data={data} onChange={set} readOnly={readOnly} peek={peek} />
          if (it.type === 'cards') return <CardPick key={it.id} item={it} data={data} onChange={set} readOnly={readOnly} peek={peek} />
          if (it.type === 'sketch') return (
            <div key={it.id}>
              <p className="quiz-q">{it.q}</p>
              {it.hint && <p className="small muted" style={{ marginBottom: 8 }}>{it.hint}</p>}
              <Sketch value={sk[it.id]} onChange={(v) => setSk(it.id, v)} panels={it.panels || 1} readOnly={readOnly} label={it.q} />
            </div>
          )
          return (
            <div key={it.id}>
              <p className="quiz-q">{it.q}</p>
              {it.hint && <p className="small muted" style={{ marginBottom: 8 }}>{it.hint}</p>}
              <textarea className="field" style={{ minHeight: 72 }} aria-label={it.q} readOnly={readOnly} placeholder={peek && it.sample ? '예: ' + it.sample : ''}
                value={data[it.id] || ''} onChange={(e) => set(it.id, e.target.value)} />
            </div>
          )
        })}
      </div>
      {!readOnly && (
        <div className="row" style={{ marginTop: 14 }}>
          <button type="button" className="btn ghost small" onClick={() => setPeek(!peek)}>{peek ? '예시 감추기' : '생각이 안 나면 예시 보기'}</button>
          <span className="small muted">정답이 없어요. 엉뚱한 생각도 좋아요.</span>
        </div>
      )}
    </div>
  )
}

// 화면이 좁은지(세로 태블릿, 휴대폰)
export function useNarrow(q = '(max-width: 960px)') {
  const [m, setM] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on)
    return () => (mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on))
  }, [q])
  return m
}
