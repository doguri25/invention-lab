// SVG 그림을 손그림 느낌으로 바꾼다: 도형은 rough.js로 다시 그리고, 글자는 손글씨 글꼴의 윤곽선으로 바꾼다.
// 쓰는 법: npm i --no-save svg2roughjs opentype.js @expo-google-fonts/gaegu playwright
//          node scripts/sketchify.cjs art/original public [파일 이름 일부]
// 원본 그림(art/original)을 고친 뒤 다시 돌리면 public 아래 그림이 손그림으로 바뀐다.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path')
const [SRC, OUT, ONLY] = process.argv.slice(2)
const FONT = (w) => fs.readFileSync(require.resolve(`@expo-google-fonts/gaegu/${w}/Gaegu_${w}.ttf`)).toString('base64')
const FALLBACK = fs.readFileSync(require.resolve('pretendard/dist/public/static/alternative/Pretendard-Bold.ttf')).toString('base64')
;(async () => {
  const b = await chromium.launch(); const p = await b.newPage()
  await p.setContent('<html><body></body></html>')
  await p.addScriptTag({ path: require.resolve('svg2roughjs/dist/svg2roughjs.umd.min.js') })
  await p.addScriptTag({ path: require.resolve('opentype.js/dist/opentype.min.js') })
  await p.evaluate(([r, bd, fb]) => {
    const buf = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer
    window.F = { r: opentype.parse(buf(r)), b: opentype.parse(buf(bd)), f: opentype.parse(buf(fb)) }
  }, [FONT('400Regular'), FONT('700Bold'), FALLBACK])
  for (const dir of ['steps', 'figs', 'icons']) {
    fs.mkdirSync(path.join(OUT, dir), { recursive: true })
    for (const f of fs.readdirSync(path.join(SRC, dir)).filter((x) => x.endsWith('.svg') && (!ONLY || x.includes(ONLY)))) {
      const src = fs.readFileSync(path.join(SRC, dir, f), 'utf8')
      const kind = dir === 'icons' ? (f.startsWith('mascot') ? 'mascot' : 'icon') : dir
      const out = await p.evaluate(async ([src, kind, seed, pre]) => {
        document.body.innerHTML = '<div id="in"></div><div id="out"></div>'
        document.getElementById('in').innerHTML = src
        const svg = document.querySelector('#in svg')
        const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number)
        svg.setAttribute('width', vb[2]); svg.setAttribute('height', vb[3])
        // 0) 화살촉(marker)을 삼각형으로 바꾼다
        svg.querySelectorAll('[marker-end]').forEach((el) => {
          let x2, y2, x1, y1
          if (el.tagName === 'line') { x1 = +el.getAttribute('x1'); y1 = +el.getAttribute('y1'); x2 = +el.getAttribute('x2'); y2 = +el.getAttribute('y2') }
          else { const L = el.getTotalLength(), a = el.getPointAtLength(Math.max(0, L - 2)), e = el.getPointAtLength(L); x1 = a.x; y1 = a.y; x2 = e.x; y2 = e.y }
          const sw = parseFloat(el.getAttribute('stroke-width') || 1), col = el.getAttribute('stroke') || '#202124'
          const ang = Math.atan2(y2 - y1, x2 - x1), L = 5.2 * sw + 2, W = L / 2
          const tip = [x2 + Math.cos(ang) * L * 0.2, y2 + Math.sin(ang) * L * 0.2], base = [tip[0] - Math.cos(ang) * L, tip[1] - Math.sin(ang) * L]
          const pts = [tip, [base[0] - Math.sin(ang) * W, base[1] + Math.cos(ang) * W], [base[0] + Math.sin(ang) * W, base[1] - Math.cos(ang) * W]]
          const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
          poly.setAttribute('points', pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ')); poly.setAttribute('fill', col); poly.setAttribute('stroke', col); poly.setAttribute('stroke-width', Math.max(1, sw * 0.6)); poly.setAttribute('stroke-linejoin', 'round')
          el.removeAttribute('marker-end'); el.parentNode.insertBefore(poly, el.nextSibling)
        })
        svg.querySelectorAll('marker').forEach((m) => m.remove())
        // 1) 글자를 손글씨 윤곽선으로(같은 글자는 한 번만 정의해 다시 쓴다)
        const texts = [], defs = {}; let gid = 0
        svg.querySelectorAll('text').forEach((t) => {
          const raw = parseFloat(t.getAttribute('font-size') || getComputedStyle(t).fontSize)
          const size = raw * 1.18
          const bold = parseInt(t.getAttribute('font-weight') || '400', 10) >= 600 || raw <= 13
          const str = t.textContent
          const glyphs = [...str].map((c) => { const main = bold ? F.b : F.r; const font = c === ' ' || main.charToGlyph(c).index ? main : F.f; return { c, font, key: (font === F.f ? 'f' : bold ? 'b' : 'r') + c, adv: font.getAdvanceWidth(c, font === F.f ? raw : size) } })
          const w = glyphs.reduce((a, g) => a + g.adv, 0)
          const anchor = t.getAttribute('text-anchor') || 'start'
          let x = parseFloat(t.getAttribute('x') || 0); const y = parseFloat(t.getAttribute('y') || 0)
          if (anchor === 'middle') x -= w / 2; else if (anchor === 'end') x -= w
          const m = t.getCTM(), rm = svg.getCTM().inverse().multiply(m)
          const tr = [rm.a, rm.b, rm.c, rm.d, rm.e, rm.f].map((v) => +v.toFixed(3))
          const uses = []
          for (const g of glyphs) {
            if (g.c !== ' ') {
              if (!defs[g.key]) defs[g.key] = { id: pre + (gid++), d: g.font.getPath(g.c, 0, 0, 200).commands.map((c) => c.type + [c.x1, c.y1, c.x2, c.y2, c.x, c.y].filter((v) => v !== undefined).map((v) => Math.round(v)).join(' ')).join('') }
              const sc = (g.font === F.f ? raw : size) / 200
              uses.push(`<use href="#${defs[g.key].id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(3)})"/>`)
            }
            x += g.adv
          }
          texts.push(`<g fill="${t.getAttribute('fill') || '#202124'}"${tr.join(' ') === '1 0 0 1 0 0' ? '' : ` transform="matrix(${tr.join(' ')})"`}>${uses.join('')}</g>`)
          t.remove()
        })
        const defsHtml = '<defs>' + Object.values(defs).map((g) => `<path id="${g.id}" d="${g.d}"/>`).join('') + '</defs>'
        // 2) 도형을 손으로 그린 선으로
        const k = Math.max(vb[2], vb[3]) / 200
        const cfg = { steps: [1.0, 0.9], figs: [0.55, 0.7], icon: [0.75, 0.6], mascot: [0.5, 0.5] }[kind]
        const outSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        document.getElementById('out').appendChild(outSvg)
        const s2r = new svg2roughjs.Svg2Roughjs(outSvg, svg2roughjs.OutputType.SVG, { roughness: cfg[0] * k, bowing: cfg[1], fillStyle: 'solid', seed, preserveVertices: false, disableMultiStroke: kind === 'icon' })
        s2r.randomize = false; s2r.backgroundColor = undefined; s2r.pencilFilter = false; s2r.sketchPatterns = false; s2r.fontFamily = null
        s2r.svg = svg
        await s2r.sketch()
        outSvg.removeAttribute('width'); outSvg.removeAttribute('height'); outSvg.removeAttribute('style')
        outSvg.setAttribute('viewBox', vb.join(' ')); outSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        let html = new XMLSerializer().serializeToString(outSvg)
        html = html.replace(/(\d+\.\d)\d+/g, '$1') // 소수 자리 줄이기
        return html.replace(/<\/svg>\s*$/, texts.length ? `${defsHtml}<g>${texts.join('')}</g></svg>` : '</svg>')
      }, [src, kind, 7 + f.length * 13, (dir[0] + f.replace('.svg', '').replace(/[^a-zA-Z0-9]/g, '')) + '_'])
      fs.writeFileSync(path.join(OUT, dir, f), out)
      console.log(dir + '/' + f, Math.round(src.length / 1024) + 'k →', Math.round(out.length / 1024) + 'k')
    }
  }
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
