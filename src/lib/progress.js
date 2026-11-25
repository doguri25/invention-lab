// 차시 토막마다 얼마나 했는지. [채울 칸 수, 채운 칸 수]를 돌려준다. 채울 것이 없는 읽기 토막은 [0, 0].
import { sequence } from '../data/blocks.js'

const has = (d, k) => d[k] !== undefined && d[k] !== '' && d[k] !== null && d[k] !== false

function tbl(spec, d) {
  let need = 0, have = 0
  spec.rows.forEach((r) => spec.cols.forEach((_, j) => { need++; if (has(d, `${r.id}_${j}`)) have++ }))
  return [need, have]
}

export function thinkDone(t, d) {
  if (t.type === 'frame') return has(d, t.id + '_a') && has(d, t.id + '_b')
  if (t.type === 'fair') return ['changed', 'same', 'measured'].every((k) => has(d, `${t.id}_${k}`))
  if (t.type === 'table' || t.type === 'list') return Object.keys(d).some((k) => k.startsWith(t.id + '_') && has(d, k))
  return has(d, t.id)
}

// 「생각해요」에 남는 질문(따로 떼어 낸 질문은 뺀다)
export function thinkItems(s) {
  const apart = s.order.filter((t) => t.startsWith('think:')).map((t) => t.slice(6))
  return (s.think || []).filter((t) => !apart.includes(t.id))
}

export function blockCount(token, s, d = {}, sk = {}) {
  if (token.startsWith('think:')) { const it = (s.think || []).find((t) => t.id === token.slice(6)); return [1, it && thinkDone(it, d) ? 1 : 0] }
  switch (token) {
    case 'recall': return [1, has(d, 'recallq') ? 1 : 0]
    case 'predict': return s.lab && s.lab.predict ? [1, has(d, 'predict') ? 1 : 0] : [0, 0]
    case 'record': return s.record ? tbl(s.record, d) : [0, 0]
    case 'record2': return s.record2 ? tbl(s.record2, d) : [0, 0]
    case 'calc': { let n = 0, h = 0; (s.calc || []).forEach((c) => c.parts.forEach((p) => { if (typeof p === 'object') { n++; if (has(d, p.b)) h++ } })); return [n, h] }
    case 'lab': return s.lab && s.lab.observeQ ? [1, has(d, 'observe') ? 1 : 0] : [0, 0]
    case 'think': { const it = thinkItems(s); return [it.length, it.filter((t) => thinkDone(t, d)).length] }
    case 'create': {
      const it = (s.create && s.create.items) || []
      const ok = (x) => (x.type === 'sketch' ? !!(sk[x.id] && sk[x.id].s && sk[x.id].s.length) : x.type === 'list' ? Object.keys(d).some((k) => k.startsWith(x.id + '_') && has(d, k)) : has(d, x.id))
      return [it.length, it.filter(ok).length]
    }
    case 'recap': return [1, has(d, 'recap') ? 1 : 0]
    case 'script': return [(s.speech || []).length, (s.speech || []).filter((p) => has(d, p.id)).length]
    case 'tries': return [3, [1, 2, 3].filter((i) => has(d, 'try' + i)).length]
    case 'questions': return [5, [0, 1, 2, 3, 4].filter((i) => has(d, 'q' + i)).length]
    case 'bring': return [1, [0, 1, 2, 3, 4, 5, 6].some((i) => has(d, 'b' + i)) ? 1 : 0]
    case 'quiz': return [s.quiz.length, s.quiz.filter((_, i) => has(d, 'quiz' + i) || d['quiz' + i] === 0).length]
    case 'end': return [1, has(d, 'oneline') ? 1 : 0]
    default: return [0, 0]
  }
}

// 'done' | 'half' | 'none' | 'read'(채울 것이 없는 토막)
export function blockState(token, s, d, sk) {
  const [need, have] = blockCount(token, s, d, sk)
  if (!need) return 'read'
  return have >= need ? 'done' : have > 0 ? 'half' : 'none'
}

// 차시 전체(0~1). 창의 활동과 돌아보기는 골라서 하는 것이라 셈에서 뺀다.
const OPTIONAL = ['create', 'recall', 'bring', 'tries']
export function sessionProgress(s, d = {}) {
  let need = 0, have = 0
  sequence(s).forEach((t) => { if (OPTIONAL.includes(t)) return; const [n, h] = blockCount(t, s, d); need += n; have += h })
  return need ? Math.min(1, have / need) : 0
}

// 아직 다 하지 않은 첫 토막
export function firstOpen(s, d = {}, sk = {}) {
  return sequence(s).find((t) => { const st = blockState(t, s, d, sk); return st === 'none' || st === 'half' }) || 'mission'
}
