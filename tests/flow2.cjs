// 새 기능 점검: 끊겨도 이어지는지, 돌아보기, 복습, 그림판, 그림 크게 보기, 3D 도움말
const { chromium } = require('playwright')
const BASE = 'http://localhost:4173/'
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1 }
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']

;(async () => {
  const browser = await chromium.launch({ args: ARGS })
  const errs = []
  const mk = async (state) => {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => errs.push(e.message))
    await page.route('**/rest/v1/rpc/**', async (route) => {
      const fn = route.request().url().split('/').pop()
      const body = JSON.parse(route.request().postData() || '{}')
      state.calls.push([fn, body, Date.now()])
      if (state.down) return route.abort()
      const j = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
      if (state.pin && body.p_pin && body.p_pin !== state.pin) return j({ error: 'BAD_PIN' })
      if (fn === 'inv_join') return j({ id: 'x', name: body.p_name, work: body.p_work })
      if (fn === 'inv_load') return j({ student: { id: 'x', name: body.p_name, work: state.work }, records: state.records, feedback: {} })
      if (fn === 'inv_save') { state.records[body.p_key] = body.p_data; return j({ at: new Date().toISOString() }) }
      return j({ ok: true })
    })
    return { ctx, page }
  }
  const login = async (page, work, name, pin = '1234') => {
    await page.goto(BASE)
    await page.click(`[role=radio] >> nth=${work === 'rain' ? 0 : 1}`)
    await page.fill('input[maxlength="20"]', name); await page.fill('input[type=password]', pin)
    await page.click('button[type=submit]'); await page.waitForSelector('text=탐구 지도')
  }
  const closeHelp = async (page) => { const b = page.locator('.lab-help .btn'); if (await b.count()) await b.first().click() }

  // ── 1. 0.9초가 지나기 전에 화면을 닫아도 저장되는지
  const A = { calls: [], records: { s2: { w100_0: '100', w100_1: '98', w100_2: '102', base_0: '3', base_1: '4', base_2: '5', oneline: '세 번 재서 평균을 내요', quiz0: 0, quiz1: 1 } }, work: 'rain' }
  const { ctx, page } = await mk(A)
  await login(page, 'rain', '김하늘')
  await page.goto(BASE + '#/s/3'); await page.waitForSelector('#b-calc'); await closeHelp(page)
  ok(await page.locator('.lab-help').count() === 0, '3D 도움말은 「알겠어요」로 닫힘')
  A.calls.length = 0
  const t0 = Date.now()
  await page.fill('#b-calc input.blank >> nth=0', '900')
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await page.waitForTimeout(350)
  const sv = A.calls.find((c) => c[0] === 'inv_save' && c[1].p_key === 's3')
  ok(sv && sv[2] - t0 < 700 && sv[1].p_data.area === '900', '적자마자 화면을 닫아도 바로 저장을 보냄(' + (sv ? sv[2] - t0 : '-') + 'ms)')

  // ── 2. 지난 시간 돌아보기
  const recall = await page.locator('#b-recall').innerText()
  ok(recall.includes('세 번 재서 평균을 내요'), '지난 차시에 쓴 한 줄이 보임')
  ok(recall.includes('100') && recall.includes('4'), '지난 차시에 잰 평균이 보임(100 g, 4 g)')
  ok(recall.includes('빈 컵을 올리고 0 버튼을 누르면'), '지난 차시 퀴즈에서 틀린 문제가 복습 문제로 나옴')
  await page.locator('#b-recall .recall-q .pick >> nth=1').click(); await page.waitForTimeout(200)
  ok(await page.locator('#b-recall .fb.ok').count() === 1, '돌아보기 문제를 맞히면 풀이가 나옴')

  // ── 3. 그림 크게 보기
  await page.locator('#b-steps .fig .pic').click()
  ok(await page.locator('.zoom[role=dialog] img').count() === 1, '그림을 누르면 크게 보임')
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  ok(await page.locator('.zoom').count() === 0, 'Esc로 닫힘')

  // ── 4. 3D 도구 줄
  await page.click('.lt-btn:has-text("사용법")')
  ok(await page.locator('.lab-help').innerText().then((t) => t.includes('눈여겨볼 곳') && t.includes('한 손가락으로 끌기')), '사용법에 손짓과 눈여겨볼 곳이 나옴')
  await closeHelp(page)
  await page.click('.lt-btn:has-text("처음 시점으로")')
  await page.click('.lt-btn:has-text("크게 보기")')
  ok(await page.locator('.lab-shell.is-full').count() === 1, '크게 보기')
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  ok(await page.locator('.lab-shell.is-full').count() === 0, 'Esc로 작게')

  // ── 5. 하던 곳 기억
  await page.evaluate(() => document.getElementById('b-record').scrollIntoView())
  await page.waitForTimeout(700)
  const last = await page.evaluate(() => JSON.parse(localStorage.getItem('invlab.v1.last.김하늘')))
  ok(last && last.n === 3 && ['record', 'steps', 'lab'].includes(last.sec), '보고 있던 구역을 기억함(' + (last && last.sec) + ')')
  await page.goto(BASE + '#/'); await page.waitForSelector('.go')
  const href = await page.locator('.go').getAttribute('href')
  ok(href === `#/s/3/${last.sec}`, '첫 화면 「이어서 하기」가 그 구역으로 감: ' + href)
  await page.click('.go'); await page.waitForTimeout(900)
  const top = await page.evaluate((id) => document.getElementById('b-' + id).getBoundingClientRect().top, last.sec)
  ok(top > 60 && top < 400, '눌렀더니 그 구역이 화면 위쪽에 옴(top ' + Math.round(top) + ')')
  await page.reload(); await page.waitForSelector('#b-calc')
  await page.goto(BASE + '#/s/2'); await page.waitForTimeout(300); await page.goto(BASE + '#/s/3'); await page.waitForTimeout(500)
  ok(await page.locator('.resume').count() === 1, '다시 들어오면 「지난번에 …까지 봤어요」 안내가 뜸')

  // ── 6. 인터넷이 끊긴 채 적고, 새로 고쳐도 남아 있다가, 연결되면 올라가는지
  A.down = true
  await page.fill('#b-record input.num >> nth=0', '23')
  await page.waitForTimeout(1300)
  ok(await page.locator('.save.offline').count() === 1 && await page.locator('.banner').count() === 1, '끊기면 「이 기기에 저장됨」과 알림 띠가 뜸')
  await page.reload(); await page.waitForSelector('#b-record')
  ok(await page.locator('#b-record input.num >> nth=0').inputValue() === '23', '새로 고쳐도 적은 값이 남아 있음')
  ok(!(A.records.s3 && A.records.s3.spray_0 === '23'), '아직 서버에는 없음')
  A.down = false
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await page.waitForTimeout(1200)
  ok(A.records.s3 && A.records.s3.spray_0 === '23' && A.records.s3.area === '900', '다시 연결되면 저절로 올라감')
  ok(await page.locator('.banner').count() === 0 && await page.locator('.save.saved').count() === 1, '알림 띠가 사라지고 「저장됨」')

  // ── 7. 선생님이 비밀번호를 바꾼 경우
  A.pin = '7777'
  await page.fill('#b-record input.num >> nth=1', '19'); await page.waitForTimeout(1400)
  ok(await page.locator('.banner.warn input[type=password]').count() === 1, '비밀번호가 바뀌면 새 숫자를 넣으라는 안내가 뜸')
  await page.fill('.banner.warn input[type=password]', '7777'); await page.click('.banner.warn button[type=submit]'); await page.waitForTimeout(1500)
  ok(A.records.s3.spray_1 === '19' && await page.locator('.banner').count() === 0, '새 숫자를 넣으면 그동안 적은 값이 올라감')

  // ── 8. 그림판
  await page.goto(BASE + '#/s/1'); await page.waitForSelector('#b-create .sketch-pad')
  const pad = page.locator('#b-create .sketch-pad'); await pad.scrollIntoViewIfNeeded()
  const bx = await pad.boundingBox()
  await page.mouse.move(bx.x + 40, bx.y + 60); await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(bx.x + 40 + i * 12, bx.y + 60 + Math.sin(i) * 20)
  await page.mouse.up(); await page.waitForTimeout(1400)
  const k1 = A.records.k1
  ok(k1 && k1.sketch && k1.sketch.s.length === 1 && k1.sketch.s[0].p.length >= 10, '그림판에 그린 선이 좌표로 저장됨(점 ' + (k1 ? k1.sketch.s[0].p.length / 2 : 0) + '개)')
  await page.reload(); await page.waitForSelector('#b-create .sketch-pad')
  ok(await page.locator('#b-create .sketch-pad polyline').count() === 1, '다시 열어도 그림이 그대로 있음')
  await page.click('#b-create .sk-btn:has-text("한 획 지우기")'); await page.waitForTimeout(200)
  ok(await page.locator('#b-create .sketch-pad polyline').count() === 0, '한 획 지우기')
  await page.locator('#b-create .tcard, #b-create .idea input').first().scrollIntoViewIfNeeded()
  await page.fill('#b-create .idea input >> nth=0', '빨래 건조대'); await page.waitForTimeout(1300)
  ok(A.records.s1 && A.records.s1.other_0 === '빨래 건조대', '창의 활동 답 저장')
  ok(await page.locator('.sb.half:has-text("창의")').count() === 1, '구역 줄에 「하는 중」 표시')

  // ── 9. 복습
  await page.goto(BASE + '#/review'); await page.waitForSelector('.rv-mode')
  const wtxt = await page.locator('.rv-mode.a').innerText()
  ok(/1문제가 기다려요/.test(wtxt), '차시 퀴즈에서 틀린 문제가 「틀린 문제」에 모임: ' + wtxt.replace(/\n/g, ' '))
  await page.click('.rv-mode.a'); await page.waitForSelector('.rv-q')
  await page.locator('.rv-opts .pick:has-text("물 무게만 나와요")').click(); await page.waitForTimeout(200)
  await page.click('button:has-text("결과 보기")'); await page.waitForTimeout(200)
  ok(await page.locator('.rv-result').innerText().then((t) => t.includes('1문제 가운데 1문제')), '맞히면 결과가 나옴')
  await page.click('button:has-text("복습 첫 화면으로")'); await page.waitForTimeout(1300)
  ok(await page.locator('.rv-mode.a').isDisabled(), '맞힌 문제는 「틀린 문제」에서 빠짐')
  ok(A.records.review && A.records.review.log.length === 1 && A.records.review.fixed['s2:0'], '복습 기록 저장')
  await page.click('.rv-mode.b'); await page.waitForSelector('.rv-q')
  ok(await page.locator('.rv-count').innerText().then((t) => t.includes('/ 10')), '섞어서 10문제')
  await page.click('button:has-text("그만하고 돌아가기")')
  await page.locator('.kcard').first().click()
  ok(await page.locator('.kcard.on .kcard-d').count() === 1, '핵심 카드를 누르면 설명이 보임')

  // ── 10. 일지 쓰다 만 글
  await page.goto(BASE + '#/journal'); await page.fill('textarea >> nth=0', '쟁반에 물을 뿌렸어요'); await page.waitForTimeout(1300)
  await page.goto(BASE + '#/'); await page.goto(BASE + '#/journal'); await page.waitForTimeout(300)
  ok(await page.locator('textarea >> nth=0').inputValue() === '쟁반에 물을 뿌렸어요', '일지를 쓰다 다른 화면에 다녀와도 글이 남아 있음')
  await ctx.close()

  // ── 11. 세로 태블릿: 3D 상자가 「3D 실험실」 구역 안에 있는지
  const B = { calls: [], records: {}, work: 'tape' }
  const c2 = await browser.newContext({ viewport: { width: 820, height: 1180 } })
  const p2 = await c2.newPage(); p2.on('pageerror', (e) => errs.push(e.message))
  await p2.route('**/rest/v1/rpc/**', (route) => { const fn = route.request().url().split('/').pop(); const body = JSON.parse(route.request().postData() || '{}'); const j = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) }); if (fn === 'inv_load') return j({ student: { id: 'x', name: body.p_name, work: 'tape' }, records: {}, feedback: {} }); return j({ id: 'x', name: body.p_name, work: 'tape', at: 1 }) })
  await login(p2, 'tape', '이도윤')
  await p2.goto(BASE + '#/s/3'); await p2.waitForSelector('#b-lab')
  ok(await p2.locator('#b-lab .labbox').count() === 1 && await p2.locator('aside.lab').count() === 0, '좁은 화면에서는 3D 상자가 순서대로 「3D 실험실」 구역에 나옴')
  const order = await p2.$$eval('.flow > .panel h2', (els) => els.map((e) => e.textContent))
  console.log('   구역 순서:', order.join(' → '))
  ok(order.indexOf('손으로 먼저 벗겨 보기') < order.indexOf('물컵으로 벗기는 힘 재기') && order.indexOf('기록해요') < order.indexOf('계산해요'), '테이프 3차시 순서가 지도안과 같음')
  await c2.close()
  await browser.close()
  ok(errs.length === 0, '페이지 오류 없음 ' + errs.slice(0, 3).join(' | '))
})()
