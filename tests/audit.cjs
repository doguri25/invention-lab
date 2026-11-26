// 앱 전체 점검: axe(WCAG), 누르는 곳 크기, 작은 글자, 손가락 모양 커서, 글리프 아이콘, 가로 넘침
const { chromium } = require('playwright')
const fs = require('fs')
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const OUT = __dirname + '/out'; fs.mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:4173/'
const seed = {
  s1: { predict: '물병', oneline: '평형추가 40 g 더 무거워요', quiz0: 1, quiz1: 0, quiz2: 0 },
  s2: { w100_0: '100', w100_1: '99', w100_2: '101', oneline: '세 번 재서 평균을 내요', quiz0: 0, quiz1: 1 },
  s5: { t250_0: '12', t200_0: '27', t150_0: '45', t100_0: '70', b1_0: '60', b2_0: '110', b3_0: '170' },
  journal: { list: [{ id: 'a', date: '2026-11-24', did: '계획서 읽기', found: '90 g에 닫혀요', next: '' }] },
}
const students = [{ id: '11111111-1111-1111-1111-111111111111', name: '김하늘', work: 'rain', created_at: new Date().toISOString(), last_seen: new Date().toISOString(), records: Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, { data: v, at: new Date().toISOString() }])), feedback: { s1: { stamp: true, comment: '좋아요.', at: new Date().toISOString() } } }]
const STUDENT = ['#/', '#/s/1', '#/s/2', '#/s/3', '#/s/4', '#/s/5', '#/s/6', '#/lab', '#/journal', '#/review', '#/words', '#/practice']
const TEACHER = ['#/teacher', '#/teacher/s/11111111-1111-1111-1111-111111111111/1', '#/teacher/plan/3', '#/teacher/guide', '#/teacher/show/rain/5', '#/teacher/settings']
;(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const out = { axe: {}, small: {}, tiny: {}, cursor: {}, glyph: {}, overflow: {}, noalt: {} }
  const mk = async (work, vp) => {
    const ctx = await browser.newContext({ viewport: vp, locale: 'ko-KR' })
    const page = await ctx.newPage()
    await page.addInitScript(() => localStorage.setItem('invlab.v1.prefs', JSON.stringify({ size: 1, motion: true, help: { first: 1 } })))
    await page.route('**/rest/v1/rpc/**', (route) => { const fn = route.request().url().split('/').pop(); const body = JSON.parse(route.request().postData() || '{}'); const j = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
      if (fn === 'inv_load') return j({ student: { id: 'x', name: body.p_name, work }, records: seed, feedback: { s1: { stamp: true, comment: '좋아요.' } } })
      if (fn === 'inv_t_overview') return j(students)
      return j({ id: 'x', name: body.p_name, work, at: 1, ok: true }) })
    return { ctx, page }
  }
  const scan = async (page, key, deep) => {
    await page.waitForTimeout(deep ? 1500 : 700)
    const r = await page.evaluate(async (deep) => {
      const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('.sr') }
      const name = (e) => (e.className && typeof e.className === 'string' ? e.tagName.toLowerCase() + '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase())
      const res = { overflow: document.documentElement.scrollWidth - window.innerWidth }
      if (!deep) return res
      const click = [...document.querySelectorAll('button, a[href], select, input:not([type=hidden]), textarea, [role=button], summary, label.checkrow')].filter(vis)
      const cnt = (arr) => { const m = {}; arr.forEach((k) => { m[k] = (m[k] || 0) + 1 }); return m }
      res.small = cnt(click.filter((e) => { const r = e.getBoundingClientRect(); if (e.tagName === 'A' && getComputedStyle(e).display === 'inline') return false; if (e.tagName === 'INPUT' && (e.type === 'checkbox' || e.type === 'radio') && e.closest('label')) { const l = e.closest('label').getBoundingClientRect(); if (l.width >= 43.5 && l.height >= 43.5) return false } return r.width < 43.5 || r.height < 43.5 }).map((e) => { const r = e.getBoundingClientRect(); return name(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) }))
      res.cursor = cnt(click.filter((e) => ['BUTTON', 'SUMMARY', 'SELECT'].includes(e.tagName) && !e.disabled && getComputedStyle(e).cursor !== 'pointer').map(name))
      const texts = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      while (w.nextNode()) { const n = w.currentNode; if (n.textContent.trim() && n.parentElement && vis(n.parentElement) && !n.parentElement.closest('svg, canvas')) texts.push(n) }
      res.tiny = cnt(texts.filter((n) => parseFloat(getComputedStyle(n.parentElement).fontSize) < 12).map((n) => name(n.parentElement) + ' ' + parseFloat(getComputedStyle(n.parentElement).fontSize).toFixed(1)))
      res.glyph = cnt(texts.filter((n) => /[★☆✓✔✗✕×→←↑↓▶◀●○◐⤢▾▴]|\p{Extended_Pictographic}/u.test(n.textContent) && n.textContent.trim().length <= 3).map((n) => name(n.parentElement) + ' "' + n.textContent.trim() + '"'))
      res.noalt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length
      const a = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })
      res.axe = a.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 3).map((x) => x.target.join(' ').slice(0, 70) + (x.any[0] && x.any[0].data && x.any[0].data.contrastRatio ? ' [' + x.any[0].data.contrastRatio + ':1 ' + x.any[0].data.fgColor + ' on ' + x.any[0].data.bgColor + ']' : '')) }))
      return res
    }, deep)
    Object.keys(r).forEach((k) => { if (k === 'overflow') { if (r.overflow > 1) out.overflow[key] = r.overflow } else if (k === 'noalt') { if (r.noalt) out.noalt[key] = r.noalt } else if (k === 'axe') { if (r.axe.length) out.axe[key] = r.axe } else if (Object.keys(r[k]).length) out[k][key] = r[k] })
  }
  const login = async (page, work) => { await page.goto(BASE); await page.click(`[role=radio] >> nth=${work === 'rain' ? 0 : 1}`); await page.fill('input[maxlength="20"]', '김하늘'); await page.fill('input[type=password]', '1234'); await page.click('button[type=submit]'); await page.waitForSelector('text=탐구 지도') }
  const tlogin = async (page) => { await page.goto(BASE + '#/teacher'); await page.fill('input[type=password]', '1324'); await page.click('button:has-text("열기")'); await page.waitForTimeout(600) }
  // 깊은 점검(태블릿 가로)
  { const { ctx, page } = await mk('rain', { width: 1180, height: 820 }); await page.addInitScript(AXE)
    await page.goto(BASE); await scan(page, 'join', true)
    await login(page, 'rain'); for (const h of STUDENT) { await page.goto(BASE + h); await scan(page, 'rain ' + h, true) }
    await ctx.close() }
  { const { ctx, page } = await mk('tape', { width: 1180, height: 820 }); await page.addInitScript(AXE)
    await login(page, 'tape'); for (const h of ['#/', '#/s/3', '#/s/5', '#/lab']) { await page.goto(BASE + h); await scan(page, 'tape ' + h, true) }
    await ctx.close() }
  { const { ctx, page } = await mk('rain', { width: 1180, height: 820 }); await page.addInitScript(AXE)
    await page.goto(BASE + '#/teacher'); await scan(page, 'teacher login', true)
    await tlogin(page); for (const h of TEACHER) { await page.goto(BASE + h); await scan(page, h, true) }
    await ctx.close() }
  // 넘침(375, 768, 1024, 1440)
  for (const w of [375, 768, 1024, 1440]) {
    const { ctx, page } = await mk('rain', { width: w, height: 900 }); await login(page, 'rain')
    for (const h of STUDENT) { await page.goto(BASE + h); await scan(page, w + ' ' + h, false) }
    await tlogin(page); for (const h of TEACHER) { await page.goto(BASE + h); await scan(page, w + ' ' + h, false) }
    await ctx.close()
  }
  await browser.close()
  fs.writeFileSync(OUT + '/audit.json', JSON.stringify(out, null, 1))
  // 요약
  const agg = (obj) => { const m = {}; Object.entries(obj).forEach(([pg, v]) => Object.entries(v).forEach(([k, n]) => { m[k] = m[k] || { n: 0, pages: 0 }; m[k].n += n; m[k].pages++ })); return Object.entries(m).sort((a, b) => b[1].n - a[1].n) }
  const ax = {}; Object.entries(out.axe).forEach(([pg, vs]) => vs.forEach((v) => { ax[v.id] = ax[v.id] || { impact: v.impact, n: 0, pages: [], ex: new Set() }; ax[v.id].n += v.n; ax[v.id].pages.push(pg); v.ex.forEach((e) => ax[v.id].ex.add(e)) }))
  console.log('== axe 위반'); Object.entries(ax).forEach(([id, v]) => { console.log(`${id} [${v.impact}] ${v.n}곳, 화면 ${v.pages.length}개`); [...v.ex].slice(0, 14).forEach((e) => console.log('    ' + e)) })
  console.log('== 44px보다 작은 누르는 곳'); agg(out.small).slice(0, 30).forEach(([k, v]) => console.log(`  ${k}  ×${v.n} (화면 ${v.pages})`))
  console.log('== 12px보다 작은 글자'); agg(out.tiny).slice(0, 20).forEach(([k, v]) => console.log(`  ${k}  ×${v.n}`))
  console.log('== 손가락 커서가 아닌 버튼'); agg(out.cursor).slice(0, 25).forEach(([k, v]) => console.log(`  ${k}  ×${v.n}`))
  console.log('== 글자로 그린 아이콘'); agg(out.glyph).slice(0, 20).forEach(([k, v]) => console.log(`  ${k}  ×${v.n}`))
  console.log('== 가로 넘침', JSON.stringify(out.overflow)); console.log('== alt 없는 그림', JSON.stringify(out.noalt))
  const bad = Object.keys(out.axe).length + Object.keys(out.small).length + Object.keys(out.tiny).length + Object.keys(out.cursor).length + Object.keys(out.overflow).length + Object.keys(out.noalt).length
  console.log(bad ? 'FAIL 고칠 곳이 있는 화면 묶음 ' + bad + '개' : 'PASS 접근성 규칙, 누르는 곳 크기, 글자 크기, 가로 넘침 모두 통과')
  if (bad) process.exitCode = 1
})()
