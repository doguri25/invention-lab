// 지도안 40분 흐름과 학생 화면 순서가 맞는지 점검
const R = new URL('../src/data/', import.meta.url).pathname
const { SESSIONS } = await import(R + 'content.js')
const { TEACH, pick } = await import(R + 'guide.js')
const { blockName, sequence } = await import(R + 'blocks.js')
const strip = (x) => x.replace(/[ ⁠]/g, (c) => (c === ' ' ? ' ' : ''))
let bad = 0
for (const w of ['rain', 'tape']) for (const s of SESSIONS[w]) {
  const seq = sequence(s), names = seq.map((t) => strip(blockName(t, s)))
  const rows = pick(TEACH[s.n].flow, w)
  let ptr = 0; const used = new Set(); let prevEnd = 0
  for (const r of rows) {
    const [a, b] = r[0].replace('분', '').split('~').map(Number)
    if (a !== prevEnd) { console.log(`TIME ${w} ${s.n}: ${r[0]} (앞 줄 끝 ${prevEnd})`); bad++ }
    prevEnd = b
    for (const nm of strip(r[3]).split(', ')) {
      let i = names.findIndex((x, k) => k >= ptr && (x === nm || x.startsWith(nm + '.')))
      if (i < 0) { console.log(`ORDER ${w} ${s.n}차시 ${r[0]}: 「${nm}」가 학생 화면에서 앞 순서이거나 없음 → 화면 순서: ${names.join(' > ')}`); bad++; continue }
      ptr = i; used.add(i)
    }
  }
  if (prevEnd !== 40) { console.log(`TIME ${w} ${s.n}: 40분에 끝나지 않음`); bad++ }
  seq.forEach((t, i) => { if (!used.has(i) && !['create', 'more', 'mission'].includes(t)) { console.log(`UNUSED ${w} ${s.n}차시: 학생 화면 「${names[i]}」가 지도안 흐름에 없음`); bad++ } })
  // 예상하기의 답이 그 앞 카드에 미리 나오는지
  const p = s.lab && s.lab.predict
  if (p && s.order.indexOf('learn') < s.order.indexOf('predict')) for (const c of s.learn) if (strip(c.d + (c.ex || '')).includes(strip(p.answer).replace('약 ', '')) && !p.options.every((o) => strip(c.d + (c.ex || '')).includes(strip(o).replace('약 ', '')))) { console.log(`SPOIL ${w} ${s.n}차시: 알아 두기 「${c.t}」에 예상하기 답(${p.answer})이 보임`); bad++ }
  // 겹치는 질문
  const qs = [p && p.q, ...(s.think || []).map((t) => t.q), ...s.quiz.map((q) => q.q)].filter(Boolean).map(strip)
  qs.forEach((q, i) => qs.forEach((q2, j) => { if (i < j && q === q2) { console.log(`DUP ${w} ${s.n}차시: "${q}"`); bad++ } }))
  // 평가 기준·탐구일지가 가리키는 것이 있는지(간단 점검: 그래프)
  if (s.self.some((x) => x.includes('그래프')) && !s.graph) { console.log(`SELF ${w} ${s.n}차시: 스스로 점검에 그래프가 있는데 그래프가 없음`); bad++ }
  // 기록표 id가 겹치지 않는지
  const ids = [...(s.record ? s.record.rows : []), ...(s.record2 ? s.record2.rows : []), ...(s.think || [])].map((x) => x.id)
  if (new Set(ids).size !== ids.length) { console.log(`ID ${w} ${s.n}: 겹치는 id`); bad++ }
  // 돌아보기가 가리키는 기록이 앞 차시에 있는지
  for (const rc of s.recall || []) { const src = SESSIONS[w].find((x) => x.key === rc.from); const rows = [...(src.record ? src.record.rows : []), ...(src.record2 ? src.record2.rows : [])]; if (!rows.some((x) => x.id === rc.id)) { console.log(`RECALL ${w} ${s.n}: ${rc.from}.${rc.id} 없음`); bad++ } }
  // 그림 파일
}
console.log(bad ? `문제 ${bad}개` : '지도안 흐름과 학생 화면 순서가 모두 맞음(12개 차시)')
if (bad) process.exitCode = 1
