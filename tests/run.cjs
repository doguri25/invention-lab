// 점검을 한 번에 돌린다: npm test   (하나만: npm test -- flow2)
// 준비: npm run build, 그리고 playwright(npm i -g playwright && npx playwright install chromium)
const { spawn, spawnSync, execSync } = require('child_process')
const http = require('http')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const ALL = ['check-flow', 'flow', 'flow2', 'save-race', 'no-webgl', 'nav', 'breaks', 'audit']
const pick = process.argv.slice(2)
const list = pick.length ? ALL.filter((t) => pick.includes(t)) : ALL
const up = () => new Promise((res) => { http.get('http://localhost:4173/', (r) => { r.resume(); res(true) }).on('error', () => res(false)) })

;(async () => {
  let server = null
  if (!(await up())) {
    server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
    for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 250))
  }
  let globalMods = ''
  try { globalMods = execSync('npm root -g').toString().trim() } catch (e) { /* 없으면 그냥 둔다 */ }
  const env = { ...process.env, NODE_PATH: [path.join(ROOT, 'node_modules'), globalMods, process.env.NODE_PATH].filter(Boolean).join(path.delimiter) }
  const failed = []
  for (const t of list) {
    console.log('\n━━ ' + t)
    const file = t === 'check-flow' ? path.join(ROOT, 'scripts', 'check-flow.mjs') : path.join(__dirname, t + '.cjs')
    const r = spawnSync('node', [file], { cwd: ROOT, env, stdio: 'inherit' })
    if (r.status !== 0) failed.push(t)
  }
  if (server) server.kill()
  console.log('\n' + (failed.length ? '실패: ' + failed.join(', ') : `모두 통과(${list.length}묶음)`))
  process.exit(failed.length ? 1 : 0)
})()
