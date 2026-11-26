// 기능 점검: 저장, 퀴즈, 일지, 오프라인 시작, 선생님 도장
const { chromium } = require('playwright')
const BASE = 'http://localhost:4173/'
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1 }

;(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const calls = []
  const records = {}
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.route('**/rest/v1/rpc/**', async (route) => {
    const fn = route.request().url().split('/').pop()
    const body = JSON.parse(route.request().postData() || '{}')
    calls.push([fn, body])
    const j = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
    if (fn === 'inv_join') return j({ id: 'x', name: body.p_name, work: body.p_work })
    if (fn === 'inv_load') return j({ student: { id: 'x', name: body.p_name, work: 'rain' }, records, feedback: {} })
    if (fn === 'inv_save') { records[body.p_key] = body.p_data; return j({ at: new Date().toISOString() }) }
    if (fn === 'inv_t_overview') return body.p_tpin === '1324' ? j([{ id: 'sid', name: '김하늘', work: 'rain', records: {}, feedback: {}, last_seen: null }]) : j({ error: 'BAD_PIN' })
    if (fn === 'inv_t_feedback') return j(null)
    return j(null)
  })
  await page.goto(BASE)
  await page.click('[role=radio] >> nth=0')
  await page.fill('input[maxlength="20"]', '김하늘')
  await page.fill('input[type=password]', '1234')
  await page.click('button[type=submit]')
  await page.waitForSelector('text=탐구 지도')
  ok(calls.some((c) => c[0] === 'inv_join' && c[1].p_pin === '1234'), '가입 호출에 이름과 숫자가 실림')

  await page.goto(BASE + '#/s/2')
  await page.waitForSelector('table.rec')
  { const b = page.locator('.lab-help .btn'); if (await b.count()) await b.first().click() }
  const cells = page.locator('table.rec input.num')
  await cells.nth(0).fill('100'); await cells.nth(1).fill('99'); await cells.nth(2).fill('101')
  await page.waitForTimeout(1500)
  ok(records.s2 && Object.values(records.s2).includes('99'), '기록표 값이 서버로 저장됨')
  const avgTxt = await page.locator('td.avg').first().innerText()
  ok(avgTxt.trim() === '100', '평균 자동 계산 = ' + avgTxt.trim())
  ok((await page.locator('.save.saved').count()) === 1, '저장됨 표시')

  // 계산 계단 빈칸
  const blanks = page.locator('input.blank')
  if (await blanks.count()) { await blanks.nth(0).fill('1'); await page.waitForTimeout(200) }
  // 퀴즈
  const quizBtn = page.locator('.quiz-item').first().locator('button.pick').first()
  await quizBtn.click()
  ok((await page.locator('.quiz-item').first().locator('.fb').count()) === 1, '퀴즈를 누르면 바로 풀이가 보임')

  // 일지
  await page.goto(BASE + '#/journal')
  await page.fill('textarea >> nth=0', '빨대 도르래를 만들었어요')
  await page.fill('textarea >> nth=1', '면실은 6 g에서 움직였어요')
  await page.click('button:has-text("일지에 넣기")')
  await page.waitForTimeout(1500)
  ok(records.journal && records.journal.list && records.journal.list.length === 1, '일지 한 쪽 저장')
  await page.click('text=모든 기록 모아 보기')
  ok(await page.locator('text=2차시').count() >= 0 && await page.locator('text=재는 법과 공정한 실험').count() === 1, '모아 보기에 차시 기록이 나옴')

  // 낱말 사전 알아요
  await page.goto(BASE + '#/words')
  await page.locator('button:has-text("내 말로 설명할 수 있나요?")').first().click()
  await page.waitForTimeout(1300)
  ok(records.words && Object.values(records.words).includes(true), '낱말 알아요 저장')

  // 연습 타이머
  await page.goto(BASE + '#/practice')
  await page.click('button:has-text("시작")')
  await page.waitForTimeout(3600)
  await page.click('button:has-text("멈추기")')
  const rec = page.locator('button:has-text("초 기록하기")')
  ok(await rec.count() === 1, '연습 시간 기록 버튼이 나옴')
  await rec.click(); await page.waitForTimeout(1300)
  ok(records.practice && records.practice.log && records.practice.log.length === 1, '연습 기록 저장')

  // 1분 무대(6차시)
  await page.goto(BASE + '#/s/6')
  await page.fill('#b-script textarea >> nth=0', '고추가 비에 젖었어요')
  await page.click('button:has-text("1분 설명 시작")')
  await page.waitForTimeout(1500)
  ok(await page.locator('text=고추가 비에 젖었어요').count() >= 1, '원고가 3D 무대 위 카드에 보임')

  // 나가기 → 선생님 화면
  await page.goto(BASE + '#/teacher')
  await page.fill('input[type=password]', '111111'); await page.click('button:has-text("열기")')
  await page.waitForTimeout(600)
  ok(await page.locator('text=선생님 비밀번호가 맞지 않아요').count() === 1, '틀린 선생님 비밀번호 안내')
  await page.fill('input[type=password]', '1324'); await page.click('button:has-text("열기")')
  await page.waitForSelector('text=학생 현황')
  await page.click('text=김하늘')
  await page.click('button.stamp-c')
  await page.fill('textarea[aria-label="선생님 한마디"]', '평균을 잘 냈어요')
  await page.click('button:has-text("저장")')
  await page.waitForTimeout(600)
  const fb = calls.find((c) => c[0] === 'inv_t_feedback')
  ok(fb && fb[1].p_stamp === true && fb[1].p_comment === '평균을 잘 냈어요' && fb[1].p_key === 's1', '도장과 한마디 저장 호출')
  await ctx.close()

  // 오프라인 시작
  const c2 = await browser.newContext({ viewport: { width: 1180, height: 820 } })
  const p2 = await c2.newPage()
  await p2.route('**/rest/v1/rpc/**', (r) => r.abort())
  await p2.goto(BASE)
  await p2.click('[role=radio] >> nth=1')
  await p2.fill('input[maxlength="20"]', '이도윤')
  await p2.fill('input[type=password]', '5678')
  await p2.click('button[type=submit]')
  await p2.waitForSelector('text=인터넷 없이 시작')
  await p2.click('text=인터넷 없이 시작')
  await p2.waitForSelector('text=탐구 지도')
  await p2.goto(BASE + '#/s/1')
  await p2.locator('.quiz-item').first().locator('button.pick').first().click()
  await p2.waitForTimeout(1300)
  ok(await p2.locator('.save.offline').count() === 1, '인터넷이 없으면 "이 기기에 저장됨"')
  const ls = await p2.evaluate(() => localStorage.getItem('invlab.v1.rec.이도윤'))
  ok(ls && ls.includes('quiz0'), '기기에 기록이 남음')
  await c2.close()
  await browser.close()
  ok(errs.length === 0, '페이지 오류 없음 ' + errs.join(' | '))
})()
