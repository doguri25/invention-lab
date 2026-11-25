import { useEffect, useRef, useState } from 'react'
import { RainLab, TapeLab, ExploreLab } from './InventionLab'
import { PulleySim, TraySim, PeelSim, MagnetSim, RampSim, DrainSim, ClutchSim } from './Sims'

export function PresentLab({ work, parts = [] }) {
  const [sec, setSec] = useState(0)
  const [run, setRun] = useState(false)
  const t0 = useRef(0)
  useEffect(() => {
    if (!run) return
    t0.current = Date.now() - sec * 1000
    const id = setInterval(() => {
      const s = (Date.now() - t0.current) / 1000
      setSec(s)
      if (s >= 60) { setRun(false); setSec(60) }
    }, 200)
    return () => clearInterval(id)
  }, [run]) // eslint-disable-line
  const idx = Math.min(4, Math.floor(sec / 12))
  const Lab = work === 'rain' ? RainLab : TapeLab
  const p = parts[idx]
  return (
    <>
      <Lab mode="demo" autoRotate mascot={false} bare />
      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, zIndex: 6, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div className="glass" style={{ textAlign: 'center', minWidth: 120 }}>
          <small style={{ fontWeight: 700, color: 'var(--sub)' }}>남은 시간</small>
          <div className="display" style={{ fontSize: '2.2em', lineHeight: 1, color: sec > 50 ? 'var(--red)' : 'var(--ink)' }} aria-live="off">{Math.max(0, Math.ceil(60 - sec))}초</div>
        </div>
        {p && (
          <div className="glass" style={{ flex: 1 }}>
            <small style={{ fontWeight: 700, color: 'var(--pd)' }}>{idx + 1}. {p.label}</small>
            <p style={{ fontWeight: 700, fontSize: '1.1em' }}>{p.text || '원고 칸에 적은 내용이 여기에 보여요'}</p>
          </div>
        )}
      </div>
      <div className="lab-bottom" style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <button className="btn" onClick={() => { if (sec >= 60) setSec(0); setRun(!run) }}>{run ? '멈추기' : sec > 0 && sec < 60 ? '이어서' : '1분 설명 시작'}</button>
        <button className="btn ghost" onClick={() => { setRun(false); setSec(0) }}>처음으로</button>
      </div>
    </>
  )
}

export function LabSwitch({ sim, work, speechParts }) {
  switch (sim) {
    case 'explore': return <ExploreLab work={work} />
    case 'pulley': return <PulleySim work={work} />
    case 'tray': return <TraySim />
    case 'peel': return <PeelSim />
    case 'magnet': return <MagnetSim />
    case 'ramp': return <RampSim />
    case 'drain': return <DrainSim />
    case 'clutch': return <ClutchSim />
    case 'present': return <PresentLab work={work} parts={speechParts} />
    case 'full': return work === 'rain' ? <RainLab mode="full" /> : <TapeLab mode="full" />
    default: return null
  }
}
