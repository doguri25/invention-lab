import { useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stage } from '../three/Stage'
import { Mascot3D } from '../three/Mascot3D'
import { RainCoverModel, useRainSim, RainDriver, clock } from '../three/RainCover'
import { TapeWinderModel, useTapeSim, TapeDriver, START } from '../three/TapeWinder'
import { PARTS } from '../data/content'
import { fmt } from '../lib/physics'

function Gauge({ g }) {
  const max = 120
  const pct = Math.min(100, (g / max) * 100)
  return (
    <div className="glass" style={{ minWidth: 230 }} aria-label={`물병에 모인 물 ${fmt(g, 1)} g`}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <small style={{ fontWeight: 700, color: 'var(--sub)' }}>물병에 모인 물</small>
        <b className="display" style={{ fontSize: '1.3em' }}>{g >= 1000 ? fmt(g / 1000, 2) + ' kg' : fmt(g, 1) + ' g'}</b>
      </div>
      <div style={{ position: 'relative', height: 14, borderRadius: 999, background: '#e8eaed', marginTop: 6, overflow: 'visible' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#8ab4f8,#1a73e8)' }} />
        {[[10, '열림 10 g'], [90, '닫힘 90 g']].map(([v, l]) => (
          <div key={v} style={{ position: 'absolute', left: (v / max) * 100 + '%', top: -4, bottom: -4, width: 2, background: v === 90 ? '#d93025' : '#188038' }}>
            <span style={{ position: 'absolute', top: 20, left: -24, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', color: v === 90 ? '#d93025' : '#188038' }}>{l}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 14 }} />
    </div>
  )
}

const RATES = [[0, '그침'], [1, '이슬비'], [5, '보통 비'], [30, '소나기']]

export function RainLab({ mode = 'full', onPart, highlight, labelsDefault = false, autoRotate = false, mascot = true, bare = false }) {
  const sim = useRainSim({ initRate: mode === 'demo' ? 5 : 0 })
  const [labels, setLabels] = useState(labelsDefault)
  const v = sim.view
  const last = v.events[v.events.length - 1]
  // 데모: 닫히면 비를 그치게 하고, 열리면 다시 비
  useEffect(() => {
    if (mode !== 'demo') return
    if (v.closed && sim.rate > 0) sim.setRate(0)
    if (!v.closed && v.water < 10 && sim.rate === 0 && v.t > 5) sim.setRate(5)
  }, [v.closed, v.water, mode]) // eslint-disable-line
  useEffect(() => { if (mode === 'demo') sim.setSpeed(60) }, [mode]) // eslint-disable-line
  return (
    <>
      <Stage camera={[2.6, 2.2, 4.3]} target={[0.3, 0.88, 0]} minD={2.2} maxD={10} autoRotate={autoRotate} label="빗물 건조망 덮개 3D 모형">
        <RainDriver sim={sim} />
        <RainCoverModel c={v.c} water={v.water} rate={sim.rate} draining={v.closed && v.water > 10} labels={labels} onPart={onPart} highlight={highlight} />
        {mascot && <Mascot3D kind="rain" position={[-1.5, 0, 0.75]} scale={0.5} cheer={v.events.length} rotationY={0.5} mood={v.closed ? 'wow' : 'smile'} />}
      </Stage>
      {!bare && (
        <div className="lab-top">
          <span className={'state ' + (v.closed ? '' : 'idle')} role="status">{v.closed ? '덮개 닫힘' : '덮개 열림'}</span>
          {mode === 'full' && <span className="glass small" style={{ padding: '6px 12px', fontWeight: 700 }}>{clock(v.t)}</span>}
          <span style={{ flex: 1 }} />
          {mode !== 'demo' && <button className="btn ghost small" onClick={() => setLabels(!labels)} aria-pressed={labels}>{labels ? '이름 숨기기' : '부품 이름 보기'}</button>}
          {mode === 'full' && <button className="btn ghost small" onClick={sim.reset}>처음으로</button>}
        </div>
      )}
      {!bare && mode !== 'explore' && (
        <div className="lab-bottom">
          {last && mode === 'full' && <div className="glass small" aria-live="polite" style={{ alignSelf: 'flex-start', fontWeight: 700 }}>{clock(last.t)} {last.e}</div>}
          <div style={{ alignSelf: 'flex-start' }}><Gauge g={v.water} /></div>
          {mode === 'full' && (
            <div className="glass">
              <div className="ctrl">
                <label htmlFor="rr">비</label>
                <div className="tabs sm" role="group" aria-label="비 세기">
                  {RATES.map(([r, l]) => <button key={l} aria-pressed={sim.rate === r} onClick={() => sim.setRate(r)}>{l}</button>)}
                </div>
                <input id="rr" type="range" min="0" max="40" step="1" value={sim.rate} onChange={(e) => sim.setRate(+e.target.value)} aria-label="비 세기(mm/시)" style={{ minWidth: 110 }} />
                <b style={{ minWidth: 80, textAlign: 'right' }}>{sim.rate} mm/시</b>
              </div>
              <div className="ctrl" style={{ marginTop: 6 }}>
                <label>빠르기</label>
                <div className="tabs sm" role="group" aria-label="시간 빠르기">
                  {[[1, '1배'], [10, '10배'], [60, '60배']].map(([s, l]) => <button key={l} aria-pressed={sim.speed === s} onClick={() => sim.setSpeed(s)}>{l}</button>)}
                </div>
                <label>물구멍</label>
                <div className="tabs sm" role="group" aria-label="물구멍 지름">
                  {[1.0, 1.2, 1.4].map((h) => <button key={h} aria-pressed={sim.holeMm === h} onClick={() => sim.setHole(h)}>{h.toFixed(1)} mm</button>)}
                </div>
                <button className="btn ghost small" aria-pressed={sim.dew} onClick={() => sim.setDew(!sim.dew)}>{sim.dew ? '이슬 끄기' : '밤 이슬'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

const CLUTCH = [[0, '약하게'], [1, '알맞게'], [2, '세게']]

// 감개가 상자 위를 지나가는 동안 카메라가 옆에서 따라간다
function FollowX({ x }) {
  const { camera, controls } = useThree()
  useFrame((_, dt) => {
    if (!controls) return
    const dx = (x - controls.target.x) * Math.min(1, dt * 3)
    if (Math.abs(dx) < 1e-4) return
    controls.target.x += dx
    camera.position.x += dx
    controls.update()
  })
  return null
}

export function TapeLab({ mode = 'full', onPart, highlight, labelsDefault = false, autoRotate = false, mascot = true, bare = false }) {
  const sim = useTapeSim()
  const [labels, setLabels] = useState(labelsDefault)
  useEffect(() => {
    if (mode !== 'demo') return
    sim.setPlaying(true)
  }, [mode]) // eslint-disable-line
  useEffect(() => {
    if (mode === 'demo' && !sim.playing && sim.d >= sim.max) { const t = setTimeout(() => { sim.setD(0); sim.setPlaying(true) }, 1500); return () => clearTimeout(t) }
  }, [sim.playing, sim.d, mode]) // eslint-disable-line
  const state = sim.clutch === 0 ? ['warn', '테이프가 처져요'] : sim.tear ? ['bad', '상자 종이가 뜯겨요'] : ['', sim.d > 0 ? '잘 감기고 있어요' : '밀 준비']
  const cm = sim.d * 10
  return (
    <>
      <Stage camera={[START + 2.4, 2.9, 6.0]} target={[START, 0.7, 0]} minD={2.5} maxD={10} autoRotate={autoRotate} label="테이프 감개 3D 모형">
        <TapeDriver sim={sim} />
        {!autoRotate && <FollowX x={START - sim.d} />}
        <TapeWinderModel d={sim.d} wound={sim.wound} slack={sim.slack} tear={sim.tear} labels={labels} onPart={onPart} highlight={highlight} />
        {mascot && <Mascot3D kind="tape" position={[-1.75, 0, 1.0]} scale={0.42} cheer={Math.floor(sim.d)} rotationY={0.4} mood={sim.tear ? 'wow' : 'smile'} />}
      </Stage>
      {!bare && (
        <div className="lab-top">
          <span className={'state ' + state[0]} role="status">{state[1]}</span>
          <span style={{ flex: 1 }} />
          {mode !== 'demo' && <button className="btn ghost small" onClick={() => setLabels(!labels)} aria-pressed={labels}>{labels ? '이름 숨기기' : '부품 이름 보기'}</button>}
          {mode === 'full' && <button className="btn ghost small" onClick={() => { sim.setPlaying(false); sim.setD(0) }}>처음으로</button>}
        </div>
      )}
      {!bare && mode !== 'explore' && (
        <div className="lab-bottom">
          <div className="readout">
            <div className="val"><small>민 거리</small><b>{fmt(cm, 1)} cm</b></div>
            <div className="val"><small>바퀴</small><b>{fmt(cm / 15.7, 1)} 바퀴</b></div>
            <div className="val"><small>감은 길이</small><b>{fmt(sim.clutch === 0 ? cm * 0.55 : cm, 1)} cm</b></div>
          </div>
          {mode === 'full' && (
            <div className="glass">
              <div className="ctrl">
                <button className="btn small" onClick={() => { if (sim.d >= sim.max) sim.setD(0); sim.setPlaying(!sim.playing) }}>{sim.playing ? '멈추기' : '쓱 밀기'}</button>
                <input type="range" min="0" max={sim.max} step="0.01" value={sim.d} onChange={(e) => { sim.setPlaying(false); sim.setD(+e.target.value) }} aria-label="민 거리" />
              </div>
              <div className="ctrl" style={{ marginTop: 6 }}>
                <label>고무줄 조임</label>
                <div className="tabs sm" role="group" aria-label="고무줄 조임">
                  {CLUTCH.map(([c, l]) => <button key={l} aria-pressed={sim.clutch === c} onClick={() => sim.setClutch(c)}>{l}</button>)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// 1차시: 부품 찾기 놀이
export function ExploreLab({ work }) {
  const parts = PARTS[work]
  const order = useMemo(() => [...parts].sort(() => Math.random() - 0.5), [parts])
  const [i, setI] = useState(-1)
  const [msg, setMsg] = useState('')
  const [score, setScore] = useState(0)
  const [hl, setHl] = useState(null)
  const target = i >= 0 && i < order.length ? order[i] : null
  const onPart = (id) => {
    if (!target) { const p = parts.find((x) => x.id === id); setHl(id); setMsg(p ? `${p.name}: ${p.desc}` : ''); return }
    if (id === target.id) { setScore(score + 1); setHl(id); setMsg(`맞았어요! ${target.desc}`); setTimeout(() => { setI(i + 1); setHl(null) }, 1200) }
    else { const p = parts.find((x) => x.id === id); setMsg(`그건 ${p ? p.name : '다른 부품'}이에요. 다시 찾아봐요.`) }
  }
  const Lab = work === 'rain' ? RainLab : TapeLab
  return (
    <>
      <Lab mode="explore" onPart={onPart} highlight={hl} labelsDefault={i < 0} />
      <div style={{ position: 'absolute', left: 14, top: 66, right: 14, zIndex: 6, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div className="glass" style={{ pointerEvents: 'auto', maxWidth: 560 }} aria-live="polite">
          {i < 0 && <div className="row"><span className="small" style={{ fontWeight: 700 }}>부품을 눌러 보거나, 부품 찾기 놀이를 시작해요.</span><button className="btn small" onClick={() => { setI(0); setScore(0); setMsg('') }}>부품 찾기 시작</button></div>}
          {target && <p style={{ fontWeight: 800 }}>{i + 1}/{order.length} · <span style={{ color: 'var(--pd)' }}>{target.name}</span>을(를) 눌러 보세요</p>}
          {i >= order.length && <div className="row"><b>{order.length}개 중 {score}개를 찾았어요!</b><button className="btn small tone" onClick={() => { setI(0); setScore(0) }}>다시 하기</button></div>}
          {msg && <p className="small" style={{ marginTop: 4 }}>{msg}</p>}
        </div>
      </div>
    </>
  )
}
