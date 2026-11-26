// 저장을 보내는 사이에 더 적고 곧바로 화면을 닫아도 마지막 내용이 남는지
const { chromium } = require('playwright')
const BASE = 'http://localhost:4173/'
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1 }

;(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } })
  const page = await ctx.newPage()
  const server = {}; const saves = []
  await page.addInitScript(() => { if (!localStorage.getItem('invlab.v1.prefs')) localStorage.setItem('invlab.v1.prefs', JSON.stringify({ size: 1, motion: true, help: { first: 1, balance: 1 } })) })
  await page.route('**/rest/v1/rpc/**', async (route) => {
    const fn = route.request().url().split('/').pop()
    const body = JSON.parse(route.request().postData() || '{}')
    const j = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
    if (fn === 'inv_join') return j({ id: 'x', name: body.p_name, work: body.p_work })
    if (fn === 'inv_load') return j({ student: { id: 'x', name: body.p_name, work: 'rain' }, records: server, feedback: {} })
    if (fn === 'inv_save') {
      // 서버는 받은 순간의 내용을 적고, 답은 0.7초 늦게 돌려준다(느린 와이파이)
      server[body.p_key] = { ...(server[body.p_key] || {}), ...body.p_data }; saves.push(body.p_data.oneline)
      await new Promise((r) => setTimeout(r, 700))
      return j({ at: new Date().toISOString() })
    }
    return j({ ok: true })
  })
  await page.goto(BASE)
  await page.click('[role=radio] >> nth=0'); await page.fill('input[maxlength="20"]', '김하늘'); await page.fill('input[type=password]', '1234')
  await page.click('button[type=submit]'); await page.waitForSelector('text=탐구 지도')
  await page.goto(BASE + '#/s/1'); await page.waitForSelector('#b-end')
  const box = page.locator('#b-end input.field').first()
  await box.fill('처음 적은 말')
  await page.waitForTimeout(1000)            // 0.9초 뒤 첫 저장이 떠난다(답은 아직 안 옴)
  await box.fill('처음 적은 말에 더 적은 말')   // 답을 기다리는 사이에 더 적는다
  await page.waitForTimeout(750)             // 첫 저장의 답이 돌아온다. 둘째 저장(0.9초 뒤)은 아직 안 떠났다
  const dirty = await page.evaluate(() => JSON.parse(localStorage.getItem('invlab.v1.rec.김하늘')).dirty.s1)
  ok(dirty === true, '보내는 사이에 더 적은 내용은 「아직 못 보냄」으로 남는다')
  await page.reload(); await page.waitForSelector('#b-end')   // 곧바로 닫았다가 다시 연다
  await page.waitForTimeout(900)
  const v = await page.locator('#b-end input.field').first().inputValue()
  ok(v === '처음 적은 말에 더 적은 말', '다시 열어도 마지막에 적은 내용이 보인다: ' + v)
  ok(server.s1 && server.s1.oneline === '처음 적은 말에 더 적은 말', '서버에도 마지막 내용이 올라갔다: ' + (server.s1 && server.s1.oneline))
  await browser.close()
})()
