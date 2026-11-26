import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox, Html } from '@react-three/drei'
import { Stage } from '../three/Stage'
import { Mascot3D } from '../three/Mascot3D'
import { C, Cup, Scale, Bottle, Rope, Table, Label } from '../three/parts'
import { peelForce, magnetForce, rampForce, fmt } from '../lib/physics'
import { LineChart, SERIES } from '../components/ui'

const lerp = (a, b, t) => a + (b - a) * t
function useTween(target, speed = 4) {
  const v = useRef(target)
  const [, force] = useState(0)
  useFrame((_, dt) => {
    const nv = lerp(v.current, target, Math.min(1, dt * speed))
    if (Math.abs(nv - v.current) > 1e-4) { v.current = nv; force((x) => (x + 1) % 1000) }
  })
  return v.current
}

function Log({ title, rows, unit }) {
  if (!rows.length) return null
  return (
    <div className="glass small" style={{ maxWidth: 300 }}>
      <b>{title}</b>
      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
        {rows.slice(-4).map((r, i) => <li key={i}>{r[0]}: <b>{fmt(r[1], 1)} {unit}</b></li>)}
      </ul>
    </div>
  )
}

/* ---------------- 2차시: 빨대 도르래 줄다리기 ---------------- */
const THREADS = [['면실', 6], ['털실', 12], ['낚싯줄', 3]]

function PulleyScene({ moved, wB, cheer, work }) {
  const t = useTween(moved ? 1 : 0, 3)
  const yA = lerp(0.95, 1.5, t), yB = lerp(0.95, 0.18, t)
  const top = 2.05
  return (
    <group>
      <Table />
      {[-0.55, 0.55].map((x) => (
        <group key={x}>
          <mesh position={[x, top / 2, -0.45]} castShadow><boxGeometry args={[0.08, top, 0.08]} /><meshStandardMaterial color={C.woodDeep} /></mesh>
          <mesh position={[x, top, -0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.025, 0.025, 0.62, 10]} /><meshStandardMaterial color={C.wood} /></mesh>
          <mesh position={[x, top, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.055, 0.055, 0.22, 20]} /><meshStandardMaterial color="#ef9a9a" /></mesh>
        </group>
      ))}
      <Rope points={[[-0.6, yA + 0.42, 0], [-0.6, top + 0.05, 0], [-0.55, top + 0.06, 0], [0.55, top + 0.06, 0], [0.6, top + 0.05, 0], [0.6, yB + 0.42, 0]]} />
      <Cup position={[-0.6, yA, 0]} />
      <Cup position={[0.6, yB, 0]} fill={Math.min(0.9, wB / 40)} band={C.orange} />
      <Label position={[-0.6, yA + 0.62, 0]}>컵 A</Label>
      <Label position={[0.6, yB + 0.62, 0]}>컵 B · 물 {fmt(wB, 1)} g</Label>
      <Mascot3D kind={work} position={[-1.7, 0, 0.6]} scale={0.5} cheer={cheer} rotationY={0.5} mood={moved ? 'wow' : 'smile'} />
    </group>
  )
}

export function PulleySim({ work }) {
  const [thread, setThread] = useState(0)
  const [w, setW] = useState(0)
  const [jit, setJit] = useState(() => (Math.random() - 0.5) * 1.2)
  const [log, setLog] = useState([])
  const F = THREADS[thread][1] + jit
  const moved = w > F
  useEffect(() => { if (moved) setLog((l) => [...l, [THREADS[thread][0], w]]) }, [moved]) // eslint-disable-line
  const again = () => { setW(0); setJit((Math.random() - 0.5) * 1.2) }
  return (
    <>
      <Stage camera={[0.4, 2.0, 4.6]} target={[0, 1.1, 0]} label="빨대 도르래 줄다리기">
        <PulleyScene moved={moved} wB={w} cheer={log.length} work={work} />
      </Stage>
      <div className="lab-top">
        <span className={'state ' + (moved ? '' : 'idle')} role="status">{moved ? `움직였어요! ${fmt(w, 1)} g` : '버티는 중'}</span>
        <span style={{ flex: 1 }} />
        <Log title="움직이기 시작한 물" rows={log} unit="g" />
      </div>
      <div className="lab-bottom">
        <div className="glass">
          <div className="ctrl">
            <label>실</label>
            <div className="tabs" role="group" aria-label="실 종류">
              {THREADS.map(([n], i) => <button key={n} aria-pressed={thread === i} onClick={() => { setThread(i); again() }}>{n}</button>)}
            </div>
            <button className="btn small" disabled={moved} onClick={() => setW(+(w + 1).toFixed(1))}>물 1 g</button>
            <button className="btn small tone" disabled={moved} onClick={() => setW(+(w + 0.2).toFixed(1))}>한 방울(0.2 g)</button>
            <button className="btn ghost small" onClick={again}>새로 하기</button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ---------------- 3차시 빗물: 쟁반 분무 ---------------- */
function TrayScene({ g, puff, cheer }) {
  const drops = useMemo(() => Array.from({ length: 260 }, () => [THREE.MathUtils.randFloat(-0.42, 0.42), THREE.MathUtils.randFloat(-0.42, 0.42), 0.6 + Math.random() * 0.8]), [])
  const n = Math.min(260, Math.round(g * 9))
  const mist = useRef()
  const t0 = useRef(-1)
  useFrame(({ clock }) => {
    if (!mist.current) return
    if (puff.current) { t0.current = clock.elapsedTime; puff.current = false }
    const k = clock.elapsedTime - t0.current
    mist.current.visible = k < 0.5
    mist.current.scale.setScalar(0.4 + k * 2)
    mist.current.position.x = -0.6 + k * 0.9
  })
  return (
    <group>
      <Table />
      <Scale position={[0.15, 0, 0]} w={1.2} d={1.0} reading={fmt(g, 1) + ' g'}>
        <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.04, 0.95]} />
          <meshStandardMaterial color="#e3f2fd" />
        </mesh>
        {drops.slice(0, n).map(([x, z, s], i) => (
          <mesh key={i} position={[x, 0.045, z]} scale={[0.018 * s, 0.008, 0.018 * s]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshPhysicalMaterial color={C.water} transparent opacity={0.8} roughness={0.05} clearcoat={1} />
          </mesh>
        ))}
      </Scale>
      <group position={[-0.95, 0.9, 0]} rotation={[0, 0, -0.35]}>
        <RoundedBox args={[0.26, 0.42, 0.18]} radius={0.05} castShadow><meshStandardMaterial color="#c8e6c9" /></RoundedBox>
        <mesh position={[0.02, 0.3, 0]}><boxGeometry args={[0.16, 0.16, 0.14]} /><meshStandardMaterial color={C.green} /></mesh>
        <mesh position={[0.16, 0.33, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.14, 10]} /><meshStandardMaterial color="#fff" /></mesh>
      </group>
      <mesh ref={mist} position={[-0.6, 0.85, 0]}>
        <sphereGeometry args={[0.25, 12, 10]} />
        <meshBasicMaterial color="#bbdefb" transparent opacity={0.35} />
      </mesh>
      <Mascot3D kind="rain" position={[1.3, 0, -0.45]} scale={0.45} cheer={cheer} rotationY={-0.5} mood={g >= 22.5 ? 'wow' : 'smile'} />
    </group>
  )
}

export function TraySim() {
  const [g, setG] = useState(0)
  const [count, setCount] = useState(0)
  const puff = useRef(false)
  const spray = () => { puff.current = true; setG((v) => +(v + 0.85 + Math.random() * 0.5).toFixed(2)); setCount((c) => c + 1) }
  const mm = g / 90
  const done = g >= 22.5
  return (
    <>
      <Stage camera={[0.5, 2.1, 3.6]} target={[0, 0.3, 0]} label="쟁반에 분무기로 비 만들기">
        <TrayScene g={g} puff={puff} cheer={done ? 1 : 0} />
      </Stage>
      <div className="lab-top">
        <span className={'state ' + (done ? '' : 'idle')} role="status">{done ? `0.25 mm 도착! ${count}번 뿌렸어요` : '22.5 g까지 뿌려요'}</span>
      </div>
      <div className="lab-bottom">
        <div className="readout">
          <div className="val"><small>저울</small><b>{fmt(g, 1)} g</b></div>
          <div className="val"><small>강수량</small><b>{fmt(mm, 2)} mm</b></div>
          <div className="val"><small>뿌린 횟수</small><b>{count}번</b></div>
        </div>
        <div className="glass"><div className="ctrl">
          <button className="btn" onClick={spray}>칙! 한 번 뿌리기</button>
          <button className="btn tone small" onClick={() => { for (let i = 0; i < 5; i++) setTimeout(spray, i * 160) }}>다섯 번</button>
          <button className="btn ghost small" onClick={() => { setG(0); setCount(0) }}>쟁반 닦기</button>
        </div></div>
      </div>
    </>
  )
}

/* ---------------- 3차시 테이프: 각도별로 벗기기 ---------------- */
const F90 = 40
function PeelScene({ deg, cupG, peeled, cheer }) {
  const prog = useTween(peeled, 2)
  const xp = lerp(-0.55, 0.1, prog)
  const a = (deg * Math.PI) / 180
  const dir = [-Math.cos(a), Math.sin(a)]
  const top = 1.27
  const arm = [xp + dir[0] * 0.35, top + dir[1] * 0.35]
  // 도르래 하나는 벗기는 방향 위에, 다른 하나는 컵이 상자에 닿지 않는 곳에
  const S1 = [xp + dir[0], top + dir[1] + 0.06]
  const sgn = dir[0] < -0.05 ? -1 : 1
  let s2x = S1[0] + sgn * 0.4
  if (S1[1] - 0.8 < top + 0.05) s2x = sgn * Math.max(Math.abs(s2x), 1.15)
  const S2 = [s2x, S1[1]]
  const cupY = Math.max(0.02, S2[1] - 0.8 - prog * 0.25)
  return (
    <group>
      <Table />
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow><boxGeometry args={[1.8, 1.2, 0.8]} /><meshStandardMaterial color="#cfd8dc" /></mesh>
      <mesh position={[0, 1.23, 0]} castShadow><boxGeometry args={[1.6, 0.06, 0.7]} /><meshStandardMaterial color={C.card} /></mesh>
      <mesh position={[(xp + 0.7) / 2, top - 0.005, 0]}><boxGeometry args={[0.7 - xp, 0.008, 0.1]} /><meshStandardMaterial color={C.amber} transparent opacity={0.9} /></mesh>
      <Rope points={[[xp, top, 0], arm]} color={C.amber} radius={0.02} />
      <Rope points={[arm, S1, S2, [S2[0], cupY + 0.42]]} />
      {[S1, S2].map((p, i) => (
        <mesh key={i} position={[p[0], p[1], 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 0.08, 18]} /><meshStandardMaterial color={C.gray} metalness={0.3} /></mesh>
      ))}
      <Cup position={[S2[0], cupY, 0]} fill={Math.min(0.9, (cupG - 5) / 160)} r1={0.14} r2={0.2} h={0.38} />
      <Label position={[xp - 0.15, top + 0.22, 0.42]}>{deg}°</Label>
      <Mascot3D kind="tape" position={[-1.45, 0, 0.75]} scale={0.4} cheer={cheer} rotationY={0.4} />
    </group>
  )
}

export function PeelSim() {
  const [deg, setDeg] = useState(90)
  const [w, setW] = useState(0)
  const [peeled, setPeeled] = useState(0)
  const [log, setLog] = useState([])
  const need = peelForce(deg, F90)
  const cup = 5 + w
  useEffect(() => {
    if (cup >= need && peeled === 0) { setPeeled(1); setLog((l) => [...l, [deg + '°', cup]]) }
  }, [cup, need]) // eslint-disable-line
  const reset = (d = deg) => { setDeg(d); setW(0); setPeeled(0) }
  const curve = useMemo(() => [{ name: '힘', color: SERIES[1], pts: Array.from({ length: 31 }, (_, i) => { const d = 40 + i * 4.67; return [d, Math.min(160, peelForce(d, F90))] }) }], [])
  return (
    <>
      <Stage camera={[0.5, 2.3, 5.2]} target={[0, 1.05, 0]} label="테이프를 각도별로 벗기기">
        <PeelScene deg={deg} cupG={cup} peeled={peeled} cheer={log.length} />
      </Stage>
      <div className="lab-top">
        <span className={'state ' + (peeled ? '' : 'idle')} role="status">{peeled ? `벗겨졌어요! ${fmt(cup, 0)} g` : `컵 ${fmt(cup, 0)} g · 아직 붙어 있어요`}</span>
        <span style={{ flex: 1 }} />
        <div className="mini-chart" style={{ width: 250 }}>
          <LineChart series={[...curve, { name: '지금', color: SERIES[0], pts: [[deg, Math.min(160, need)]] }]} xMax={180} yMax={160} xLabel="각도" yLabel="필요한 힘(g)" xUnit="°" yUnit="g" height={170} w={300} compact />
        </div>
      </div>
      <div className="lab-bottom">
        <Log title="벗겨진 순간의 무게" rows={log} unit="g" />
        <div className="glass">
          <div className="ctrl">
            <label>각도</label>
            <div className="tabs" role="group" aria-label="꺾는 각도">
              {[45, 90, 180].map((d) => <button key={d} aria-pressed={deg === d} onClick={() => reset(d)}>{d}°</button>)}
            </div>
            <input type="range" min="40" max="180" step="5" value={deg} onChange={(e) => reset(+e.target.value)} aria-label="꺾는 각도" />
          </div>
          <div className="ctrl" style={{ marginTop: 6 }}>
            <button className="btn small" disabled={!!peeled} onClick={() => setW(w + 5)}>물 5 g</button>
            <button className="btn tone small" disabled={!!peeled} onClick={() => setW(w + 1)}>물 1 g</button>
            <button className="btn ghost small" onClick={() => reset()}>새 테이프</button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ---------------- 4차시 빗물: 자석 ---------------- */
function MagnetScene({ sheets, cupG, fell, cheer }) {
  const t = useTween(fell ? 1 : 0, 3.5)
  const deskY = 1.75
  const wy = deskY - 0.16 - sheets * 0.025 - 0.03
  const fallY = lerp(0, -(wy - 0.62), t)
  return (
    <group>
      <Table />
      <mesh position={[0, deskY, -0.3]} castShadow receiveShadow><boxGeometry args={[2.4, 0.1, 1.6]} /><meshStandardMaterial color={C.wood} /></mesh>
      {[[-1.1, -1], [1.1, -1], [-1.1, 0.4], [1.1, 0.4]].map(([x, z]) => (
        <mesh key={x + ',' + z} position={[x, deskY / 2, z]} castShadow><boxGeometry args={[0.07, deskY, 0.07]} /><meshStandardMaterial color={C.woodDeep} /></mesh>
      ))}
      <mesh position={[-0.08, deskY - 0.09, 0]}><boxGeometry args={[0.16, 0.08, 0.16]} /><meshStandardMaterial color={C.red} /></mesh>
      <mesh position={[0.08, deskY - 0.09, 0]}><boxGeometry args={[0.16, 0.08, 0.16]} /><meshStandardMaterial color={C.blue} /></mesh>
      {Array.from({ length: sheets }, (_, i) => (
        <mesh key={i} position={[0, deskY - 0.14 - i * 0.025, 0]}><boxGeometry args={[0.5, 0.018, 0.4]} /><meshStandardMaterial color="#ffffff" /></mesh>
      ))}
      <group position={[0, fallY, 0]}>
        <mesh position={[0, wy, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.07, 0.03, 10, 24]} /><meshStandardMaterial color={C.steel} metalness={0.7} roughness={0.3} /></mesh>
        <Rope points={[[0, wy - 0.03, 0], [0, wy - 0.55, 0]]} />
        <Cup position={[0, wy - 0.95, 0]} fill={Math.min(0.9, (cupG - 5) / 50)} r1={0.13} r2={0.19} h={0.38} />
      </group>
      <Label position={[0.45, deskY - 0.14, 0.3]}>종이 {sheets}장</Label>
      <Mascot3D kind="rain" position={[1.6, 0, 0.25]} scale={0.45} cheer={cheer} rotationY={-0.4} mood={fell ? 'wow' : 'smile'} />
    </group>
  )
}

export function MagnetSim() {
  const [sheets, setSheets] = useState(0)
  const [w, setW] = useState(0)
  const [log, setLog] = useState([])
  const F = magnetForce(sheets, 48, 0.22)
  const cup = 5 + w
  const fell = cup > F
  useEffect(() => { if (fell) setLog((l) => [...l, [`종이 ${sheets}장`, cup]]) }, [fell]) // eslint-disable-line
  const again = (n = sheets) => { setSheets(n); setW(0) }
  return (
    <>
      <Stage camera={[1.2, 1.6, 4.2]} target={[0, 1.1, 0]} label="자석이 붙잡는 힘 재기">
        <MagnetScene sheets={sheets} cupG={cup} fell={fell} cheer={log.length} />
      </Stage>
      <div className="lab-top">
        <span className={'state ' + (fell ? 'warn' : 'idle')} role="status">{fell ? `툭! ${fmt(cup, 1)} g에서 떨어졌어요` : `컵 ${fmt(cup, 1)} g · 붙어 있어요`}</span>
        <span style={{ flex: 1 }} />
        <Log title="떨어진 무게" rows={log} unit="g" />
      </div>
      <div className="lab-bottom">
        <div className="glass small" style={{ alignSelf: 'flex-start' }}>모형 자석 목표: 열림 쪽 <b>7.5 g</b>, 닫힘 쪽 <b>2.5 g</b></div>
        <div className="glass"><div className="ctrl">
          <label>끼운 종이</label>
          <div className="tabs" role="group" aria-label="종이 장수">
            {[0, 1, 2, 3, 4, 5].map((n) => <button key={n} aria-pressed={sheets === n} onClick={() => again(n)}>{n}장</button>)}
          </div>
        </div>
        <div className="ctrl" style={{ marginTop: 6 }}>
          <button className="btn small" disabled={fell} onClick={() => setW(+(w + 1).toFixed(1))}>물 1 g</button>
          <button className="btn tone small" disabled={fell} onClick={() => setW(+(w + 0.2).toFixed(1))}>한 방울</button>
          <button className="btn ghost small" onClick={() => again()}>다시 붙이기</button>
        </div></div>
      </div>
    </>
  )
}

/* ---------------- 4차시 테이프: 빗면, 둘레 ---------------- */
function RampScene({ L, t, F }) {
  const H = 1.0
  const run = Math.sqrt(L * L - H * H)
  const xt = 1.2, x0 = xt - run
  const ang = Math.atan2(H, run)
  const pos = lerp(0.15, L - 0.45, t)
  const cx = x0 + Math.cos(ang) * pos, cy = Math.sin(ang) * pos
  const band = 0.35 + F * 0.004
  return (
    <group>
      <Table />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[xt + 0.35, 0.125 + i * 0.25, 0]} castShadow><boxGeometry args={[0.75, 0.24, 0.9]} /><meshStandardMaterial color={['#1a73e8', '#188038', '#e8710a', '#d93025'][i]} /></mesh>
      ))}
      <mesh position={[(x0 + xt) / 2, H / 2 + 0.02, 0]} rotation={[0, 0, ang]} castShadow receiveShadow>
        <boxGeometry args={[L, 0.04, 0.7]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
      <group position={[cx, cy + 0.04, 0]} rotation={[0, 0, ang]}>
        <RoundedBox args={[0.5, 0.2, 0.32]} radius={0.08} position={[0, 0.12, 0]} castShadow><meshStandardMaterial color={C.green} /></RoundedBox>
        <mesh position={[0.25 + band / 2, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.018, 0.018, band, 8]} /><meshStandardMaterial color="#c5221f" /></mesh>
      </group>
      <Label position={[x0 + 0.3, 0.25, 0.5]}>판자 {Math.round(L * 10)} cm</Label>
    </group>
  )
}

function CircScene({ r, t }) {
  const R = r / 10 // cm → 단위
  const C1 = 2 * Math.PI * R
  const x = lerp(-1.2, -1.2 + C1, t)
  return (
    <group>
      <Table />
      <mesh position={[0, 0.02, 0.2]} receiveShadow><boxGeometry args={[3.2, 0.03, 0.3]} /><meshStandardMaterial color="#fff3c4" /></mesh>
      {Array.from({ length: 33 }, (_, i) => <mesh key={i} position={[-1.6 + i * 0.1, 0.037, 0.08]}><boxGeometry args={[0.008, 0.002, i % 5 ? 0.06 : 0.12]} /><meshBasicMaterial color="#3c4043" /></mesh>)}
      <mesh position={[(x - 1.2) / 2, 0.04, 0.2]}><boxGeometry args={[Math.max(0.001, x + 1.2), 0.004, 0.05]} /><meshBasicMaterial color="#1a73e8" /></mesh>
      <group position={[x, R + 0.035, 0.2]} rotation={[0, 0, -(x + 1.2) / R]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[R, R, 0.12, 40]} /><meshStandardMaterial color={C.blue} /></mesh>
        <mesh position={[0, -R + 0.02, 0.065]}><boxGeometry args={[0.04, 0.04, 0.01]} /><meshBasicMaterial color={C.red} /></mesh>
      </group>
      <Label position={[x, 2 * R + 0.25, 0.2]}>둘레 {fmt(2 * Math.PI * r, 1)} cm</Label>
    </group>
  )
}

export function RampSim() {
  const [tab, setTab] = useState('ramp')
  const [L, setL] = useState(3)
  const [t, setT] = useState(0)
  const [r, setR] = useState(2.5)
  const [rt, setRt] = useState(0)
  const F = rampForce(200, 10, L * 10, 0.25)
  const ang = (Math.atan2(1, Math.sqrt(L * L - 1)) * 180) / Math.PI
  useEffect(() => { setT(0) }, [L])
  return (
    <>
      {tab === 'ramp' ? (
        <Stage camera={[0.2, 1.6, 4.4]} target={[0.2, 0.5, 0]} label="빗면 실험">
          <RampScene L={L} t={t} F={F} />
          <Mascot3D kind="tape" position={[-2.2, 0, 0.6]} scale={0.45} rotationY={0.5} />
        </Stage>
      ) : (
        <Stage camera={[0, 1.1, 3.4]} target={[0, 0.3, 0]} label="바퀴 둘레 실험">
          <CircScene r={r} t={rt} />
          <Mascot3D kind="tape" position={[1.9, 0, -0.3]} scale={0.4} rotationY={-0.5} />
        </Stage>
      )}
      <div className="lab-top">
        <div className="tabs" role="group" aria-label="실험 고르기">
          <button aria-pressed={tab === 'ramp'} onClick={() => setTab('ramp')}>빗면</button>
          <button aria-pressed={tab === 'circ'} onClick={() => setTab('circ')}>바퀴 둘레</button>
        </div>
      </div>
      <div className="lab-bottom">
        {tab === 'ramp' ? (
          <>
            <div className="readout">
              <div className="val"><small>기울기</small><b>약 {Math.round(ang)}°</b></div>
              <div className="val"><small>드는 힘</small><b>{fmt(F, 0)} g</b></div>
              <div className="val"><small>끌고 갈 거리</small><b>{Math.round(L * 10)} cm</b></div>
            </div>
            <div className="glass"><div className="ctrl">
              <label>판자 길이</label>
              <div className="tabs" role="group" aria-label="판자 길이">
                {[2, 3, 4].map((v) => <button key={v} aria-pressed={L === v} onClick={() => setL(v)}>{v * 10} cm</button>)}
              </div>
              <label htmlFor="pull">끌기</label>
              <input id="pull" type="range" min="0" max="1" step="0.01" value={t} onChange={(e) => setT(+e.target.value)} />
            </div></div>
          </>
        ) : (
          <>
            <div className="readout">
              <div className="val"><small>바퀴 한 바퀴</small><b>{fmt(2 * Math.PI * r, 1)} cm</b></div>
              <div className="val"><small>감개(1.5 cm) 두 바퀴</small><b>{fmt(2 * 2 * Math.PI * 1.5, 1)} cm</b></div>
              <div className="val"><small>감는 길이 ÷ 민 거리</small><b>{fmt((4 * Math.PI * 1.5) / (2 * Math.PI * r), 2)}배</b></div>
            </div>
            <div className="glass"><div className="ctrl">
              <label>바퀴 반지름</label>
              <input type="range" min="1.5" max="3.5" step="0.1" value={r} onChange={(e) => { setR(+e.target.value); setRt(0) }} aria-label="바퀴 반지름" />
              <b>{fmt(r, 1)} cm</b>
              <label htmlFor="roll">굴리기</label>
              <input id="roll" type="range" min="0" max="1" step="0.01" value={rt} onChange={(e) => setRt(+e.target.value)} />
            </div></div>
          </>
        )}
      </div>
    </>
  )
}

/* ---------------- 5차시 빗물: 세 병 물 빼기 ---------------- */
const AREA = Math.PI * 3.3 * 3.3
const HOLE_H = 2
const outflow = (ml, d) => { const h = ml / AREA - HOLE_H; if (h <= 0) return 0; return 0.62 * Math.PI * Math.pow(d / 20, 2) * Math.sqrt(2 * 981 * h) }
const BCOL = SERIES
const MARKS = [250, 200, 150, 100]
// 그림에서의 자리: 병은 받침대 위에 있고, 구멍은 100 mL 눈금보다 아래(바닥에서 2 cm)에 있다
const SHELF = 0.34
const ML_Y = (0.6 * 1.6) / 500 // 물 1 mL가 병 그림에서 차지하는 높이
const HOLE_Y = 0.01 + HOLE_H * AREA * ML_Y
const BASIN_TOP = 0.1

function DrainDriver({ run, speed, st, onTick }) {
  useFrame((_, dtR) => {
    if (!run) return
    const dt = Math.min(0.1, dtR) * speed
    const s = st.current
    s.t += dt
    s.ml = s.ml.map((m, i) => {
      if (m <= 100) return m
      const nm = Math.max(100, m - outflow(m, s.holes[i]) * dt)
      MARKS.forEach((mk) => { if (m > mk && nm <= mk && s.cross[i][mk] == null) s.cross[i][mk] = s.t })
      return nm
    })
    s.acc += dtR
    if (s.acc > 0.1) { s.acc = 0; s.hist.push([s.t, ...s.ml]); onTick() }
  })
  return null
}

function Stream({ x, ml, d, on }) {
  const ref = useRef()
  const N = 14
  const o = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), [])
  useFrame(({ clock }) => {
    const mesh = ref.current; if (!mesh) return
    const head = Math.max(0, ml / AREA - HOLE_H)
    mesh.visible = on && head > 0
    const v = Math.sqrt(2 * 9.81 * head / 100) * 0.9
    const y0 = SHELF + HOLE_Y
    const land = Math.sqrt((y0 - BASIN_TOP) / 4.9) // 대야 물에 닿을 때까지
    const k = 0.6 + d * 0.3 // 구멍이 클수록 굵은 물줄기
    o.s.set(k, k, k)
    for (let i = 0; i < N; i++) {
      const tt = ((i / N + clock.elapsedTime * 1.5) % 1) * land
      o.p.set(x, y0 - 4.9 * tt * tt, 0.335 + v * tt * 1.4)
      mesh.setMatrixAt(i, o.m.compose(o.p, o.q, o.s))
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, N]} frustumCulled={false}>
      <sphereGeometry args={[0.018, 8, 6]} />
      <meshBasicMaterial color={C.water} />
    </instancedMesh>
  )
}

// 병 앞면의 눈금
function Marks({ x, numbers }) {
  return [300, ...MARKS].map((mk) => {
    const y = SHELF + 0.01 + mk * ML_Y
    return (
      <group key={mk}>
        <mesh position={[x - 0.15, y, 0.297]} rotation={[0, -0.47, 0]}><boxGeometry args={[0.13, 0.008, 0.004]} /><meshBasicMaterial color="#3c4043" /></mesh>
        {numbers && <Html position={[x - 0.4, y, 0.297]} center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}><span className="tick3d">{mk}</span></Html>}
      </group>
    )
  })
}

export function DrainSim() {
  const [holes, setHoles] = useState([0.9, 1.2, 1.6])
  const [run, setRun] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [view, setView] = useState('graph')
  const [, setTick] = useState(0)
  const st = useRef({ t: 0, ml: [300, 300, 300], holes: [0.9, 1.2, 1.6], cross: [{}, {}, {}], hist: [[0, 300, 300, 300]], acc: 0 })
  const reset = (h = holes) => { st.current = { t: 0, ml: [300, 300, 300], holes: h, cross: [{}, {}, {}], hist: [[0, 300, 300, 300]], acc: 0 }; setRun(false); setTick((x) => x + 1) }
  const s = st.current
  const done = s.ml.every((m) => m <= 100)
  useEffect(() => { if (done) setRun(false) }, [done])
  const xMax = Math.max(60, Math.ceil(s.t / 60) * 60)
  const series = [0, 1, 2].map((i) => ({ name: '병 ' + 'ABC'[i], color: BCOL[i], pts: s.hist.map((h) => [h[0], h[i + 1]]) }))
  return (
    <>
      <Stage camera={[0.5, 2.2, 6.3]} target={[0, 1.0, 0.2]} label="구멍 크기가 다른 세 병에서 물 빼기">
        <DrainDriver run={run} speed={speed} st={st} onTick={() => setTick((x) => x + 1)} />
        <Table />
        {[-0.9, 0, 0.9].map((x, i) => (
          <group key={x}>
            <Bottle position={[x, SHELF, 0]} r={0.33} h={1.6} fill={s.ml[i] / 500} holeY={HOLE_Y} />
            <Marks x={x} numbers={i === 0} />
            <Stream x={x} ml={s.ml[i]} d={s.holes[i]} on={run} />
            <Label position={[x, SHELF + 1.6 + 0.26, 0]}><b>{'ABC'[i]}</b>{Math.round(s.ml[i])} mL</Label>
          </group>
        ))}
        {/* 병 받침대와 물을 받는 대야 */}
        <mesh position={[0, SHELF / 2, 0]} castShadow receiveShadow><boxGeometry args={[2.9, SHELF, 0.72]} /><meshStandardMaterial color={C.woodDeep} roughness={0.8} /></mesh>
        <mesh position={[0, 0.06, 0.86]} receiveShadow><boxGeometry args={[3.0, 0.12, 0.98]} /><meshStandardMaterial color="#eceff1" /></mesh>
        <mesh position={[0, BASIN_TOP + 0.022, 0.86]}><boxGeometry args={[2.9, 0.005, 0.9]} /><meshBasicMaterial color="#90caf9" transparent opacity={0.75} /></mesh>
        <Label position={[1.36, SHELF + HOLE_Y + 0.02, 0.34]}>구멍</Label>
      </Stage>
      <div className="lab-top">
        <span className={'state ' + (run ? '' : 'idle')} role="status">{done ? '세 병 모두 100 mL!' : run ? `${Math.round(s.t)}초 지남` : '멈춤'}</span>
        <span style={{ flex: 1 }} />
        <div className="mini-chart" style={{ width: 280 }}>
          <div className="tabs sm" role="group" aria-label="결과 보기" style={{ boxShadow: 'none', background: '#f1f3f4', marginBottom: 4 }}>
            <button aria-pressed={view === 'graph'} onClick={() => setView('graph')}>그래프</button>
            <button aria-pressed={view === 'table'} onClick={() => setView('table')}>눈금 지난 시각</button>
          </div>
          {view === 'graph' ? <LineChart series={series} xMax={xMax} yMax={300} xLabel="시간(초)" yLabel="남은 물(mL)" xUnit="초" yUnit="mL" height={170} w={260} compact tags={false} /> : (
            <table className="small" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead><tr><th style={{ textAlign: 'left' }}>남은 물</th>{['A', 'B', 'C'].map((b, i) => <th key={b}><i className="sw" style={{ background: BCOL[i] }} />병 {b}</th>)}</tr></thead>
              <tbody>{MARKS.map((mk) => <tr key={mk}><td>{mk} mL</td>{[0, 1, 2].map((i) => <td key={i} style={{ textAlign: 'center', fontWeight: 700 }}>{s.cross[i][mk] != null ? Math.round(s.cross[i][mk]) + '초' : '·'}</td>)}</tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
      <div className="lab-bottom">
        <div className="glass">
          <div className="ctrl">
            {[0, 1, 2].map((i) => (
              <label key={i} className="row" style={{ gap: 6 }}>
                <span><i className="sw" style={{ background: BCOL[i] }} />병 {'ABC'[i]}</span>
                <select className="field" style={{ width: 110, padding: '4px 8px' }} value={holes[i]} disabled={run}
                  onChange={(e) => { const h = [...holes]; h[i] = +e.target.value; setHoles(h); reset(h) }}>
                  {[0.5, 0.7, 0.9, 1.2, 1.6, 2.0].map((d) => <option key={d} value={d}>{d} mm</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="ctrl" style={{ marginTop: 6 }}>
            <button className="btn small" onClick={() => { if (done) reset(); setRun(!run) }}>{run ? '멈추기' : '셋이 함께 손 떼기'}</button>
            <div className="tabs sm" role="group" aria-label="빠르기">
              {[1, 5, 20].map((v) => <button key={v} aria-pressed={speed === v} onClick={() => setSpeed(v)}>{v}배</button>)}
            </div>
            <button className="btn ghost small" onClick={() => reset()}>다시 채우기</button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ---------------- 5차시 테이프: 미끄러지는 고무줄 ---------------- */
const PER_BAND = 30, PEEL = 96, TEAR = 200
function ClutchScene({ bands, cupG, slip }) {
  const spin = useRef()
  const t = useTween(slip ? 1 : 0, 2)
  useFrame((_, dt) => { if (spin.current && slip) spin.current.rotation.x += dt * 6 })
  const y = 1.5
  return (
    <group>
      <Table />
      {[-0.8, 0.8].map((x) => <mesh key={x} position={[x, y / 2, 0]} castShadow><boxGeometry args={[0.1, y, 0.1]} /><meshStandardMaterial color={C.woodDeep} /></mesh>)}
      <mesh position={[0, y + 0.03, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.04, 0.04, 1.9, 6]} /><meshStandardMaterial color="#fbbc04" /></mesh>
      <group ref={spin} position={[0, y + 0.03, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.22, 0.22, 0.55, 32, 1, true]} /><meshStandardMaterial color="#efe3d0" side={THREE.DoubleSide} /></mesh>
        <mesh position={[0.1, 0.22, 0]}><boxGeometry args={[0.05, 0.01, 0.05]} /><meshBasicMaterial color={C.red} /></mesh>
      </group>
      {Array.from({ length: bands }, (_, i) => (
        <mesh key={i} position={[-0.34 - i * 0.05, y + 0.03, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.055, 0.014, 8, 20]} /><meshStandardMaterial color="#c5221f" /></mesh>
      ))}
      <Rope points={[[0, y + 0.03 - 0.22, 0.0], [0, lerp(0.95, 0.42, t), 0]]} />
      <Cup position={[0, lerp(0.53, 0.0, t), 0]} fill={Math.min(0.9, (cupG - 5) / 220)} r1={0.13} r2={0.19} h={0.38} />
      <Label position={[-0.6, y + 0.3, 0]}>고무줄 {bands}개</Label>
    </group>
  )
}

export function ClutchSim() {
  const [bands, setBands] = useState(2)
  const [w, setW] = useState(0)
  const [log, setLog] = useState([])
  const T = bands * PER_BAND
  const cup = 5 + w
  const slip = cup > T
  useEffect(() => { if (slip) setLog((l) => [...l, [`고무줄 ${bands}개`, cup]]) }, [slip]) // eslint-disable-line
  const zone = T < PEEL ? ['warn', '약해요: 테이프가 안 벗겨져요'] : T > TEAR ? ['bad', '세요: 종이까지 뜯겨요'] : ['', '알맞아요']
  const bar = (v) => Math.min(100, (v / 260) * 100) + '%'
  return (
    <>
      <Stage camera={[1.4, 1.9, 3.8]} target={[0, 1.0, 0]} label="미끄러지는 고무줄 실험">
        <ClutchScene bands={bands} cupG={cup} slip={slip} />
        <Mascot3D kind="tape" position={[1.35, 0, 0.2]} scale={0.42} rotationY={-0.5} cheer={log.length} mood={slip ? 'wow' : 'smile'} />
      </Stage>
      <div className="lab-top">
        <span className={'state ' + zone[0]} role="status">고무줄 {bands}개 · {zone[1]}</span>
        <span style={{ flex: 1 }} />
        <Log title="돌기 시작한 무게" rows={log} unit="g" />
      </div>
      <div className="lab-bottom">
        <div className="glass" style={{ minWidth: 300 }} aria-label="힘 비교(예시 값)">
          <small style={{ fontWeight: 700, color: 'var(--sub)' }}>힘 비교(예시 값)</small>
          {[[`고무줄 ${bands}개 미끄러지는 힘`, T, 'var(--p)'], ['테이프 벗기는 힘(180°, 박스테이프)', PEEL, '#188038'], ['상자 종이가 뜯기는 힘', TEAR, '#d93025']].map(([l, v, c]) => (
            <div key={l} style={{ marginTop: 6 }}>
              <div className="row small" style={{ justifyContent: 'space-between' }}><span>{l}</span><b>{v} g</b></div>
              <div style={{ height: 10, borderRadius: 999, background: '#e8eaed' }}><div style={{ width: bar(v), height: '100%', borderRadius: 999, background: c }} /></div>
            </div>
          ))}
        </div>
        <div className="glass"><div className="ctrl">
          <label>고무줄</label>
          <div className="tabs" role="group" aria-label="고무줄 개수">
            {[1, 2, 3, 4, 5, 6].map((n) => <button key={n} aria-pressed={bands === n} onClick={() => { setBands(n); setW(0) }}>{n}개</button>)}
          </div>
          <button className="btn small" disabled={slip} onClick={() => setW(w + 10)}>물 10 g</button>
          <button className="btn tone small" disabled={slip} onClick={() => setW(w + 2)}>물 2 g</button>
          <button className="btn ghost small" onClick={() => setW(0)}>다시</button>
        </div></div>
      </div>
    </>
  )
}
