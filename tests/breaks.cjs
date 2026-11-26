// 낱말 중간에서 줄이 바뀐 곳 찾기
const { chromium } = require('playwright')
const check = () => {
  const bad = []
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const r = document.createRange()
  let n
  while ((n = w.nextNode())) {
    const t = n.textContent
    if (t.trim().length < 2) continue
    const pe = n.parentElement
    if (!pe || pe.closest('canvas, svg, .lbl3d, input, textarea, select, script, style') || getComputedStyle(pe).visibility === 'hidden') continue
    let prevTop = null
    for (let i = 0; i < t.length; i++) {
      r.setStart(n, i); r.setEnd(n, i + 1)
      const rc = r.getClientRects()[0]
      if (!rc || rc.width === 0) continue
      if (prevTop !== null && rc.top > prevTop + 4) {
        const a = t[i - 1], b = t[i]
        if (a && b && !/\s/.test(a) && !/\s/.test(b) && !/[-/,·(]/.test(a) && !/[)]/.test(b)) bad.push(t.slice(Math.max(0, i - 8), i) + '|' + t.slice(i, i + 8))
      }
      prevTop = rc.top
    }
  }
  return bad
}
;(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  for (const vp of [{ width: 390, height: 844 }, { width: 1180, height: 820 }]) {
    const ctx = await b.newContext({ viewport: vp })
    const p = await ctx.newPage()
    await p.route('**/rest/v1/rpc/**', (rt) => { const u = rt.request().url(); rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(u.endsWith('inv_t_overview') ? [{ id: 'a', name: '김하늘', work: 'rain', records: {}, feedback: {}, last_seen: null }] : u.endsWith('inv_load') ? { student: {}, records: {}, feedback: {} } : { id: 'x', name: '김하늘', work: 'rain', at: 1 }) }) })
    await p.goto('http://localhost:4173/'); await p.waitForTimeout(400)
    await p.click('[role=radio] >> nth=0'); await p.fill('input[maxlength="20"]', '김하늘'); await p.fill('input[type=password]', '1234'); await p.click('button[type=submit]'); await p.waitForTimeout(900)
    for (const h of ['#/', '#/s/1', '#/s/2', '#/s/3', '#/s/4', '#/s/5', '#/s/6', '#/journal', '#/words', '#/practice', '#/lab', '#/review']) {
      await p.goto('http://localhost:4173/' + h); await p.waitForTimeout(700)
      const bad = await p.evaluate(check)
      if (bad.length) process.exitCode = 1
      if (bad.length) console.log(vp.width, h, bad.length, JSON.stringify(bad.slice(0, 6)))
    }
    await p.goto('http://localhost:4173/#/teacher'); await p.waitForTimeout(300)
    await p.fill('input[type=password]', '1324'); await p.click('button:has-text("열기")'); await p.waitForTimeout(700)
    for (const h of ['#/teacher', '#/teacher/plan/2', '#/teacher/plan/4', '#/teacher/guide', '#/teacher/s/a/3']) {
      await p.goto('http://localhost:4173/' + h); await p.waitForTimeout(700)
      const bad = await p.evaluate(check)
      if (bad.length) process.exitCode = 1
      if (bad.length) console.log(vp.width, h, bad.length, JSON.stringify(bad.slice(0, 6)))
    }
    await ctx.close()
  }
  await b.close(); console.log(process.exitCode ? 'FAIL 낱말 중간에서 줄이 바뀐 곳이 있음' : 'PASS 낱말 중간에서 줄이 바뀐 곳 없음')
})()
