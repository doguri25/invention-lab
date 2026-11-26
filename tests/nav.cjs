// 지도안·길잡이 구역 이동 메뉴 점검
const { chromium } = require('playwright')
const fs = require('fs')
const OUT = __dirname + '/out/nav'; fs.mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:4173/'
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1 }
;(async () => {
  const browser = await chromium.launch()
  const errs = []
  const open = async (vp, touch) => {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: !!touch, locale: 'ko-KR' })
    const page = await ctx.newPage(); page.on('pageerror', (e) => errs.push(e.message))
    await page.route('**/rest/v1/rpc/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(route.request().url().endsWith('inv_t_overview') ? [] : { ok: true }) }))
    await page.goto(BASE + '#/teacher'); await page.fill('input[type=password]', '1324'); await page.click('button:has-text("열기")'); await page.waitForTimeout(700)
    return { ctx, page }
  }
  const cur = (page) => page.locator('.snav-chip[aria-current="location"]').innerText().then((t) => t.replace(/^\d+\s*/, '').trim())
  // ── 태블릿 가로
  let { ctx, page } = await open({ width: 1180, height: 820 }, true)
  await page.goto(BASE + '#/teacher/plan/3'); await page.waitForSelector('.snav-chip')
  await page.screenshot({ path: OUT + '/tab_top.png' })
  ok(await cur(page) === '목표', '처음에는 첫 구역이 표시됨')
  await page.evaluate(() => window.scrollTo(0, 2600)); await page.waitForTimeout(400)
  const geo = await page.evaluate(() => { const b = document.querySelector('.snav').getBoundingClientRect(), t = document.querySelector('.topbar').getBoundingClientRect(); return { navTop: b.top, barBottom: t.bottom, navBottom: b.bottom } })
  ok(Math.abs(geo.navTop - geo.barBottom) < 2, `스크롤해도 메뉴가 위쪽 줄 바로 아래에 붙어 있음(${Math.round(geo.navTop)} / ${Math.round(geo.barBottom)})`)
  const a1 = await cur(page)
  const vis = await page.evaluate((nb) => { const ids = [...document.querySelectorAll('.plan .sec-t[id]')]; let last = ''; ids.forEach((e) => { if (e.getBoundingClientRect().top <= nb + 24) last = e.querySelector('h2').textContent }); return last }, geo.navBottom)
  console.log('   지금 표시:', a1, '| 화면 맨 위 구역 제목:', vis)
  ok(a1 !== '목표', '스크롤하면 표시가 따라 바뀜')
  await page.screenshot({ path: OUT + '/tab_scrolled.png' })
  // 메뉴를 눌러 이동
  await page.locator('.snav-chip:has-text("발문")').click(); await page.waitForTimeout(1100)
  const t1 = await page.evaluate(() => { const h = document.querySelector('#p-ask h2').getBoundingClientRect(), n = document.querySelector('.snav').getBoundingClientRect(); return { gap: h.top - n.bottom, focused: document.activeElement === document.querySelector('#p-ask h2'), hash: location.hash } })
  ok(t1.gap > 4 && t1.gap < 60, `누른 구역 제목이 메뉴 바로 아래에 보임(간격 ${Math.round(t1.gap)}px)`)
  ok(t1.focused, '초점이 그 구역 제목으로 옮겨 감')
  ok(await cur(page) === '발문', '누른 구역이 표시됨')
  ok(t1.hash === '#/teacher/plan/3/p-ask', '주소에 구역이 남음: ' + t1.hash)
  // 아래쪽 넘기기
  const nextLabel = await page.locator('.pg-btn.next').getAttribute('aria-label')
  await page.click('.pg-btn.next'); await page.waitForTimeout(1100)
  ok(nextLabel === '다음 구역: 과학 배경' && await cur(page) === '과학 배경', '「다음」이 다음 구역으로 감 (' + nextLabel + ')')
  ok((await page.locator('.pg-now b').innerText()).trim() === '8 / 12', '몇 번째인지 표시: ' + await page.locator('.pg-now b').innerText())
  await page.click('.pg-btn[aria-label^="이전 구역"]'); await page.waitForTimeout(1100)
  ok(await cur(page) === '발문', '「이전」이 앞 구역으로 감')
  await page.screenshot({ path: OUT + '/tab_jump.png' })
  // 나란히 놓인 구역(준비 / 준비물)에서 표시가 흔들리지 않는지
  await page.locator('.snav-chip:has-text("준비")').first().click(); await page.waitForTimeout(1500)
  ok(await cur(page) === '준비', '누른 뒤에도 표시가 그대로: ' + await cur(page))
  // 작품 고르기와 차시 고르기가 메뉴에 붙어 다니는지
  await page.evaluate(() => window.scrollTo(0, 3000)); await page.waitForTimeout(300)
  await page.locator('.snav .tabs button:has-text("테이프 감개")').click(); await page.waitForTimeout(300)
  ok(await page.locator('.snav .tabs button[aria-pressed="true"]').innerText() === '테이프 감개' && await page.evaluate(() => window.scrollY > 1000), '아래에서도 작품을 바꿀 수 있고 자리가 유지됨')
  await page.selectOption('.snav-pick select', '5'); await page.waitForTimeout(600)
  ok(await page.evaluate(() => location.hash) === '#/teacher/plan/5' && await page.locator('h1').innerText().then((t) => t.includes('물구멍')), '메뉴에서 차시를 바꿀 수 있음')
  // 주소로 바로 들어오기
  await page.goto(BASE + '#/teacher/plan/4/p-flow'); await page.waitForTimeout(1300)
  ok(await cur(page) === '40분 흐름', '주소에 적힌 구역으로 바로 감: ' + await cur(page))
  // 맨 위로
  await page.click('.pg-btn.icon'); await page.waitForTimeout(1000)
  ok(await page.evaluate(() => window.scrollY) < 5 && await cur(page) === '목표', '「맨 위로」')
  // 키보드
  await page.locator('.snav-chip').first().focus()
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
  ok(await page.evaluate(() => document.activeElement.textContent.replace(/^\d+/, '')) === '앞뒤 연결', '화살표 키로 메뉴 안에서 옮겨 다님')
  await page.keyboard.press('Enter'); await page.waitForTimeout(1100)
  ok(await cur(page) === '앞뒤 연결', 'Enter로 이동')
  // 누르는 곳 크기
  const small = await page.evaluate(() => [...document.querySelectorAll('.snav button, .snav select, .pager button')].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 8) || e.getAttribute('aria-label'), Math.round(r.width), Math.round(r.height)] }).filter((x) => x[1] < 44 || x[2] < 44))
  ok(small.length === 0, '누르는 곳이 모두 44px 이상 ' + JSON.stringify(small))
  // 길잡이
  await page.goto(BASE + '#/teacher/guide'); await page.waitForSelector('.snav-chip')
  await page.evaluate(() => window.scrollTo(0, 3500)); await page.waitForTimeout(400)
  ok(await cur(page) !== '대회 한눈에', '길잡이에도 같은 메뉴: ' + await cur(page))
  await page.screenshot({ path: OUT + '/tab_guide.png' })
  await ctx.close()
  // ── 휴대폰
  ;({ ctx, page } = await open({ width: 390, height: 844 }, true))
  await page.goto(BASE + '#/teacher/plan/3'); await page.waitForSelector('.snav-chip')
  await page.evaluate(() => window.scrollTo(0, 5200)); await page.waitForTimeout(500)
  const g2 = await page.evaluate(() => { const b = document.querySelector('.snav').getBoundingClientRect(), t = document.querySelector('.topbar').getBoundingClientRect(); const row = document.querySelector('.snav-chips'), a = row.querySelector('[aria-current]').getBoundingClientRect(); return { stick: Math.abs(b.top) < 2, inView: a.left >= 0 && a.right <= window.innerWidth, over: document.documentElement.scrollWidth - window.innerWidth, arrows: document.querySelectorAll('.snav-arrow').length, navH: Math.round(b.height), barH: Math.round(t.height) } })
  ok(g2.stick, `휴대폰: 위쪽 줄은 올라가고 메뉴만 맨 위에 붙음(메뉴 높이 ${g2.navH}px)`)
  ok(g2.inView, '휴대폰: 지금 구역 알약이 메뉴 안에 보이게 따라옴')
  ok(g2.over <= 0, '휴대폰: 화면이 옆으로 넘치지 않음')
  ok(g2.arrows >= 1, '휴대폰: 더 있다는 화살표가 보임(' + g2.arrows + '개)')
  await page.screenshot({ path: OUT + '/phone_scrolled.png' })
  // 손가락으로 메뉴만 옆으로 밀기(본문은 그대로)
  const before = await page.evaluate(() => [document.querySelector('.snav-chips').scrollLeft, window.scrollY])
  { const bx = await page.locator('.snav-arrow.l, .snav-arrow.r').last().boundingBox(); await page.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2) }
  await page.waitForTimeout(700)
  const after = await page.evaluate(() => [document.querySelector('.snav-chips').scrollLeft, window.scrollY])
  ok(after[0] !== before[0] && after[1] === before[1], '화살표를 누르면 메뉴만 옆으로 넘어감 ' + JSON.stringify([before, after]))
  const small2 = await page.evaluate(() => [...document.querySelectorAll('.snav button, .snav select, .pager button')].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 8) || e.getAttribute('aria-label'), Math.round(r.width), Math.round(r.height)] }).filter((x) => x[1] < 44 || x[2] < 44))
  ok(small2.length === 0, '휴대폰: 누르는 곳이 모두 44px 이상 ' + JSON.stringify(small2))
  await ctx.close()
  // ── 세로 태블릿, 전자칠판
  ;({ ctx, page } = await open({ width: 820, height: 1180 }, true))
  await page.goto(BASE + '#/teacher/plan/3/p-talk'); await page.waitForTimeout(1400); await page.screenshot({ path: OUT + '/portrait.png' }); await ctx.close()
  ;({ ctx, page } = await open({ width: 1920, height: 1080 }))
  await page.goto(BASE + '#/teacher/plan/3/p-sci'); await page.waitForTimeout(1400); await page.screenshot({ path: OUT + '/board.png' }); await ctx.close()
  await browser.close()
  ok(errs.length === 0, '페이지 오류 없음 ' + errs.slice(0, 3).join(' | '))
})()
