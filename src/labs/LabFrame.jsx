import { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { LabSwitch } from './index'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { GESTURES, labHelp } from './help'
import { rich } from '../lib/rich'

const I = ({ d }) => <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>

// 3D 실험 상자 + 아래 도구 줄(사용법, 처음 시점으로, 크게 보기)
export function LabFrame({ sim, work, speechParts, guide = [], title, auto = true, children }) {
  const prefs = useApp((s) => s.prefs)
  const setPrefs = useApp((s) => s.setPrefs)
  const seen = prefs.help || {}
  const [help, setHelp] = useState(auto && !seen.first)
  const [full, setFull] = useState(false)
  const h = labHelp(sim, work)
  const box = useRef(null)
  useEffect(() => { if (help && box.current) box.current.focus({ preventScroll: true }) }, [help])
  useEffect(() => {
    if (!full) return
    const key = (e) => { if (e.key === 'Escape') setFull(false) }
    window.addEventListener('keydown', key)
    document.body.classList.add('lab-full')
    return () => { window.removeEventListener('keydown', key); document.body.classList.remove('lab-full') }
  }, [full])
  const close = () => { setHelp(false); setPrefs({ help: { ...seen, first: 1, [sim]: 1 } }) }
  const isNew = auto && !seen[sim]
  return (
    <div className={'lab-shell' + (full ? ' is-full' : '')}>
      <div className="labbox">
        <ErrorBoundary lab resetKey={sim + work}>{children || <LabSwitch key={sim + work} sim={sim} work={work} speechParts={speechParts} />}</ErrorBoundary>
        {help && (
          <div className="lab-help" role="dialog" aria-label="3D 실험실 사용법">
            <div className="lab-help-in" ref={box} tabIndex={-1}>
              <h3>{title ? `3D 실험실: ${title}` : '3D 실험실 사용법'}</h3>
              <div className="gest">
                {GESTURES.map(([a, b]) => <p key={a}><b>{a}</b><span>{b}</span></p>)}
              </div>
              {guide.length > 0 && <><b className="lab-help-t">이렇게 해 봐요</b><ol>{guide.map((g) => <li key={g}>{rich(g, { kw: false })}</li>)}</ol></>}
              <b className="lab-help-t">눈여겨볼 곳</b>
              <p>{rich(h.see)}</p>
              <b className="lab-help-t">진짜 실험과 다른 점</b>
              <p>{rich(h.real)}</p>
              <button type="button" className="btn" onClick={close}>알겠어요</button>
            </div>
          </div>
        )}
      </div>
      <div className="lab-tools no-print">
        <button type="button" className={'lt-btn' + (isNew ? ' new' : '')} onClick={() => setHelp(true)} aria-expanded={help}><I d="M12 17v.01M9.2 9.2a2.9 2.9 0 1 1 4.6 2.4c-.9.7-1.8 1.3-1.8 2.6M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />사용법</button>
        <button type="button" className="lt-btn" onClick={() => window.dispatchEvent(new Event('invlab:resetview'))}><I d="M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5" />처음 시점으로</button>
        <button type="button" className="lt-btn" onClick={() => setFull(!full)} aria-pressed={full}><I d={full ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} />{full ? '작게 보기' : '크게 보기'}</button>
      </div>
      {!full && <p className="lab-see"><b>눈여겨볼 곳</b> {rich(h.see)}</p>}
    </div>
  )
}
