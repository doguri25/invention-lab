import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// 긴 문서의 구역 이동 메뉴.
//  - 위쪽: 스크롤해도 따라오는 가로 메뉴(옆으로 밀어 넘김). 지금 보는 구역이 채워진 알약으로 표시되고 가운데로 따라온다.
//  - 아래쪽: 이전·다음 구역, 몇 번째인지, 맨 위로.
// items: [[id, 짧은 이름], …]  base: 주소에 구역을 남길 때 앞부분(예: '/teacher/plan/3')  start: 처음 들어올 때 갈 구역
const calm = () => document.documentElement.dataset.motion === '0' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

const Chev = ({ left }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

export function SectionNav({ items, label, base, start, dep, children }) {
  const bar = useRef(null)
  const row = useRef(null)
  const lock = useRef(0) // 눌러서 이동하는 동안에는 스크롤 위치로 판단하지 않는다
  const picked = useRef('')
  const [list, setList] = useState(items)
  const [active, setActive] = useState(items[0][0])
  const [prog, setProg] = useState(0)
  const [edge, setEdge] = useState({ l: false, r: false })
  const [top, setTop] = useState(null)

  // 위쪽 줄의 높이가 화면 폭에 따라 달라지므로 재어서 바로 아래에 붙는다
  useEffect(() => {
    const tb = document.querySelector('.topbar')
    if (!tb) return
    // 좁은 화면에서는 위쪽 줄이 따라오지 않으므로 맨 위에 붙는다
    const fit = () => setTop(getComputedStyle(tb).position === 'sticky' ? Math.round(tb.getBoundingClientRect().height) : 0)
    fit()
    const ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null
    if (ro) ro.observe(tb)
    window.addEventListener('resize', fit)
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [])

  // 화면에 실제로 있는 구역만 남긴다(작품을 고르면 빠지는 구역이 있다)
  useLayoutEffect(() => { setList(items.filter(([id]) => document.getElementById(id))) }, [dep]) // eslint-disable-line

  const offset = () => (bar.current ? bar.current.getBoundingClientRect().bottom : 120) + 14

  const jump = (id, focus = true) => {
    const el = document.getElementById(id)
    if (!el) return
    lock.current = Date.now() + (calm() ? 150 : 900)
    picked.current = id
    setActive(id)
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset()), behavior: calm() ? 'auto' : 'smooth' })
    if (focus) {
      // 키보드와 화면 읽기 프로그램이 그 구역 제목에서 이어 가도록 초점을 옮긴다
      const h = el.querySelector('h2') || el
      h.setAttribute('tabindex', '-1')
      h.focus({ preventScroll: true })
    }
    if (base) window.history.replaceState(null, '', '#' + base + '/' + id)
  }

  // 지금 보는 구역 찾기 + 읽은 만큼
  useEffect(() => {
    let raf = 0
    const read = () => {
      raf = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      setProg(max > 0 ? Math.min(1, window.scrollY / max) : 0)
      // 초점이 메뉴 뒤로 숨지 않게 한다
      doc.style.scrollPaddingTop = Math.round(offset()) + 'px'
      doc.style.scrollPaddingBottom = '96px'
      if (Date.now() < lock.current) return
      const off = offset() + 10
      let cur = list[0] && list[0][0], curTop = 0
      list.forEach(([id]) => {
        const el = document.getElementById(id)
        if (!el) return
        const t = el.getBoundingClientRect().top
        if (t <= off) { cur = id; curTop = t }
      })
      if (max > 0 && window.scrollY >= max - 4 && list.length) cur = list[list.length - 1][0]
      // 나란히 놓인 두 구역은 방금 고른 쪽을 그대로 둔다
      const p = picked.current && document.getElementById(picked.current)
      if (p && cur !== picked.current && Math.abs(p.getBoundingClientRect().top - curTop) < 12) cur = picked.current
      else if (cur !== picked.current) picked.current = ''
      setActive(cur)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    read()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); document.documentElement.style.scrollPaddingTop = ''; document.documentElement.style.scrollPaddingBottom = '' }
  }, [list])

  // 주소에 구역이 있으면 거기로(그림이 늦게 떠서 밀릴 수 있어 한 번 더 맞춘다)
  useEffect(() => {
    if (!start || !document.getElementById(start)) return
    const ids = [60, 500].map((ms) => setTimeout(() => jump(start, false), ms))
    return () => ids.forEach(clearTimeout)
  }, [start]) // eslint-disable-line

  // 가로 메뉴: 지금 구역을 가운데로, 양 끝에 더 있는지 표시
  const edges = () => {
    const r = row.current
    if (r) setEdge({ l: r.scrollLeft > 6, r: r.scrollLeft + r.clientWidth < r.scrollWidth - 6 })
  }
  useEffect(() => {
    const r = row.current
    const el = r && r.querySelector('[aria-current="location"]')
    if (el) r.scrollTo({ left: el.offsetLeft - r.clientWidth / 2 + el.clientWidth / 2, behavior: calm() ? 'auto' : 'smooth' })
    const id = setTimeout(edges, 350)
    return () => clearTimeout(id)
  }, [active, list])
  useEffect(() => {
    edges()
    window.addEventListener('resize', edges)
    return () => window.removeEventListener('resize', edges)
  }, [list])
  const slide = (d) => row.current && row.current.scrollBy({ left: d * row.current.clientWidth * 0.7, behavior: calm() ? 'auto' : 'smooth' })
  // 화살표 키로 메뉴 안에서 옮겨 다닌다
  const keys = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
    const btns = [...row.current.querySelectorAll('button')]
    const i = btns.indexOf(document.activeElement)
    if (i < 0) return
    e.preventDefault()
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : Math.min(btns.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)))
    btns[n].focus()
  }

  const i = Math.max(0, list.findIndex(([id]) => id === active))
  const prev = list[i - 1], next = list[i + 1], now = list[i]
  return (
    <>
      <div className="snav no-print" ref={bar} style={top != null ? { top } : undefined}>
        <div className="snav-main">
        {children && <div className="snav-top">{children}</div>}
        <div className="snav-row">
          {edge.l && <button type="button" className="snav-arrow l" onClick={() => slide(-1)} aria-label="구역 메뉴를 왼쪽으로 넘기기"><Chev left /></button>}
          <nav ref={row} className="snav-chips" aria-label={label} onScroll={edges} onKeyDown={keys}>
            {list.map(([id, l], k) => (
              <button key={id} type="button" className="snav-chip" aria-current={id === active ? 'location' : undefined} onClick={() => jump(id)}>
                <i aria-hidden="true">{k + 1}</i>{l}
              </button>
            ))}
          </nav>
          {edge.r && <button type="button" className="snav-arrow r" onClick={() => slide(1)} aria-label="구역 메뉴를 오른쪽으로 넘기기"><Chev /></button>}
        </div>
        </div>
        <div className="snav-prog" aria-hidden="true"><i style={{ transform: `scaleX(${prog})` }} /></div>
      </div>
      <div className="pager no-print" role="group" aria-label="구역 넘기기">
        <button type="button" className="pg-btn icon" onClick={() => { picked.current = ''; window.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' }) }} aria-label="맨 위로" title="맨 위로" disabled={prog < 0.02}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M6 11l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="pg-btn" onClick={() => prev && jump(prev[0])} disabled={!prev} aria-label={prev ? `이전 구역: ${prev[1]}` : '이전 구역 없음'}><Chev left /><span>이전</span></button>
        <span className="pg-now" aria-live="off">
          <b aria-hidden="true">{i + 1} / {list.length}</b>
          <span aria-hidden="true">{now ? now[1] : ''}</span>
          <span className="sr">{now ? `${list.length}개 구역 가운데 ${i + 1}번째, ${now[1]}` : ''}</span>
        </span>
        <button type="button" className="pg-btn next" onClick={() => next && jump(next[0])} disabled={!next} aria-label={next ? `다음 구역: ${next[1]}` : '다음 구역 없음'}><span>{next ? next[1] : '끝'}</span><Chev /></button>
      </div>
    </>
  )
}
