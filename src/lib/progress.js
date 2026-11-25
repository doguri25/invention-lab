// 차시별로 얼마나 채웠는지(0~1)
export function sessionProgress(s, d = {}) {
  let need = 0, have = 0
  const has = (k) => d[k] !== undefined && d[k] !== '' && d[k] !== null
  const tbl = (spec) => { if (!spec) return; spec.rows.forEach((r) => spec.cols.forEach((_, j) => { need++; if (has(`${r.id}_${j}`)) have++ })) }
  tbl(s.record); tbl(s.record2)
  ;(s.calc || []).forEach((c) => c.parts.forEach((p) => { if (typeof p === 'object') { need++; if (has(p.b)) have++ } }))
  ;(s.think || []).forEach((t) => { need++; if (has(t.id) || has(t.id + '_a') || has(t.id + '_changed') || Object.keys(d).some((k) => k.startsWith(t.id + '_'))) have++ })
  ;(s.speech || []).forEach((p) => { need++; if (has(p.id)) have++ })
  ;(s.quiz || []).forEach((_, i) => { need++; if (has('quiz' + i)) have++ })
  need++; if (has('oneline')) have++
  return need ? Math.min(1, have / need) : 0
}
