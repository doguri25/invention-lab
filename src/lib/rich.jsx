// 글에서 중요한 곳을 굵고 색 있게 보여 준다.
//  **이렇게** 감싼 말  → 형광펜을 그은 핵심 문장(.em)
//  숫자와 단위(90 g)   → 보라색 굵은 글씨(.nv)
//  낱말 사전의 낱말      → 주제색 굵은 글씨(.kw), 한 글에 한 번만
import { GLOSSARY } from '../data/content'

const UNIT = '(?:mm|cm|mL|kg|g|m|L|N|°|초|분|시간|배|%|장|개|바퀴|방울)'
const NUM = new RegExp(`\\d[\\d,]*(?:\\.\\d+)?(?:\\s?~\\s?\\d[\\d,]*(?:\\.\\d+)?)?[\\s\\u2060]?${UNIT}(?![A-Za-z])`, 'g')
// 너무 흔해서 다 칠하면 어지러운 낱말은 뺀다
const SKIP = ['탐구일지', '계획서', '모형', 'N(뉴턴)']
const WORDS = GLOSSARY.map((g) => g[1]).filter((w) => !SKIP.includes(w)).sort((a, b) => b.length - a.length)

function plain(text, kw, key) {
  // 낱말 한 개(가장 먼저 나오는 것)를 찾아 둔다
  let hit = null
  if (kw) {
    WORDS.forEach((w) => { const i = text.indexOf(w); if (i >= 0 && (!hit || i < hit[0])) hit = [i, w] })
  }
  const out = []
  let last = 0, n = 0
  const push = (s) => { if (s) out.push(s) }
  const marks = []
  text.replace(NUM, (m, i) => { marks.push([i, i + m.length, 'nv']); return m })
  if (hit && !marks.some(([a, b]) => hit[0] < b && hit[0] + hit[1].length > a)) marks.push([hit[0], hit[0] + hit[1].length, 'kw'])
  marks.sort((a, b) => a[0] - b[0])
  marks.forEach(([a, b, c]) => {
    if (a < last) return
    push(text.slice(last, a))
    out.push(<b className={c} key={key + '-' + n++}>{text.slice(a, b)}</b>)
    last = b
  })
  push(text.slice(last))
  return out
}

export function rich(text, { kw = true } = {}) {
  if (typeof text !== 'string' || !text) return text
  const parts = text.split('**')
  if (parts.length === 1) return plain(text, kw, 'r')
  return parts.flatMap((p, i) => (i % 2 ? [<b className="em" key={'e' + i}>{p}</b>] : plain(p, kw, 'p' + i)))
}

// 표시(**)를 뺀 글. 그림 설명처럼 꾸밈 없이 써야 할 때
export const bare = (text) => (typeof text === 'string' ? text.replace(/\*\*/g, '') : text)
