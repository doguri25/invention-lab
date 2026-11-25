import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, Label, Rope, Bottle } from './parts'
import { RAIN, rainGramsPerSec, drainPerSec } from '../lib/physics'

// 길이 단위는 m. 덮개가 움직이는 거리(TRAVEL)와 물병·평형추가 오르내리는 거리는 같다(줄 하나로 이어져 있으므로).
const X0 = -0.6 // 덮개가 묶인 쪽
const XO = -0.33 // 열렸을 때 앞막대
const XC = 0.57 // 닫혔을 때 앞막대
const TRAVEL = XC - XO // 0.9 m
const TOP = 1.0 // 레일 높이
const MX = 0.85 // 높은 기둥(줄이 위로 올라가는 자리)
const PT = 1.66 // 위 도르래 높이. 물병이 가장 높이 올라와도 그 아래에 있다
const BX = 1.01 // 물병이 매달린 곳
const BH = 0.36 // 물병 높이(2 L 병)
const BYC = 0.17 // 덮개가 닫혔을 때(맨 아래) 물병 바닥 높이
const HY = 0.035 // 물병 바닥에서 물구멍까지 높이
const ROD = BYC + 0.029 // 받침 막대 높이: 물병이 맨 아래일 때 집게 손잡이에 닿는다
const PLATE = 1.8 // 받이판 높이. 물병이 가장 높을 때보다 위에 있어야 물이 흘러든다

function Pleats({ xf }) {
  const N = 7, P = 0.2
  const s = (xf - X0) / N
  const a = Math.acos(Math.min(1, s / P))
  const dy = P * Math.sin(a)
  return (
    <group>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} position={[X0 + (i + 0.5) * s, TOP + 0.03 - dy / 2, 0]} rotation={[0, 0, i % 2 ? a : -a]} castShadow>
          <boxGeometry args={[P, 0.006, 1.62]} />
          <meshStandardMaterial color={i % 2 ? '#e8f0fe' : '#d2e3fc'} roughness={0.7} side={THREE.DoubleSide} transparent opacity={0.94} />
        </mesh>
      ))}
    </group>
  )
}

function Rain({ rate }) {
  const ref = useRef()
  const MAX = 520
  const data = useMemo(() => Array.from({ length: MAX }, () => [THREE.MathUtils.randFloat(-1.5, 2.2), Math.random() * 2.6, THREE.MathUtils.randFloat(-1.1, 1.1)]), [])
  const m = useMemo(() => new THREE.Matrix4(), [])
  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const n = Math.min(MAX, Math.round(rate * 16))
    mesh.count = n
    for (let i = 0; i < n; i++) {
      const p = data[i]
      p[1] -= dt * 6.5
      if (p[1] < 0) { p[1] = 2.6; p[0] = THREE.MathUtils.randFloat(-1.5, 2.2) }
      m.makeTranslation(p[0], p[1], p[2])
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, MAX]} frustumCulled={false}>
      <boxGeometry args={[0.006, 0.13, 0.006]} />
      <meshBasicMaterial color="#5b9cf2" transparent opacity={0.65} />
    </instancedMesh>
  )
}

function Drips({ on, x, y, z = 0 }) {
  const ref = useRef()
  const N = 10
  const st = useMemo(() => Array.from({ length: N }, (_, i) => i / N), [])
  const m = useMemo(() => new THREE.Matrix4(), [])
  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    mesh.visible = on
    for (let i = 0; i < N; i++) {
      st[i] = (st[i] + dt * 1.6) % 1
      m.makeTranslation(x, y - st[i] * st[i] * y, z)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, N]} frustumCulled={false}>
      <sphereGeometry args={[0.014, 8, 6]} />
      <meshBasicMaterial color={C.water} />
    </instancedMesh>
  )
}

function Peppers() {
  const pts = useMemo(() => Array.from({ length: 30 }, () => [THREE.MathUtils.randFloat(-0.5, 0.5), THREE.MathUtils.randFloat(-0.65, 0.65), Math.random() * Math.PI]), [])
  return pts.map(([x, z, r], i) => (
    <mesh key={i} position={[x, 0.645, z]} rotation={[Math.PI / 2, 0, r]} castShadow>
      <capsuleGeometry args={[0.022, 0.1, 4, 8]} />
      <meshStandardMaterial color={i % 5 ? C.red : '#b3261e'} roughness={0.4} />
    </mesh>
  ))
}

function Pulley({ x, y, r = 0.06 }) {
  return (
    <mesh position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[r, r, 0.03, 20]} />
      <meshStandardMaterial color={C.gray} metalness={0.5} roughness={0.3} />
    </mesh>
  )
}

export function RainCoverModel({ c = 0, water = 0, rate = 0, draining = false, labels = false, onPart, highlight }) {
  const xf = XO + TRAVEL * c
  const moved = xf - XO // 덮개가 움직인 만큼 물병은 내려가고 평형추는 올라간다
  const by = BYC + TRAVEL - moved // 물병 바닥 높이
  const wy = 0.2 + moved // 평형추 바닥 높이
  // 물병이 거의 다 내려오면(끝 6%) 받침 막대가 집게 손잡이에 닿아 물구멍이 열린다
  const open = Math.min(1, Math.max(0, (c - 0.94) / 0.06))
  const hit = (id) => (e) => { if (onPart) { e.stopPropagation(); onPart(id) } }
  const em = (id) => (highlight === id ? '#ffb300' : '#000000')
  const posts = [[-0.62, -0.8], [-0.62, 0.8], [0.62, -0.8], [0.62, 0.8]]
  const RY = TOP + 0.02 // 앞막대에서 나가는 줄 높이
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0.2, 0, 0]}>
        <circleGeometry args={[4.2, 48]} />
        <meshStandardMaterial color="#e9efe4" roughness={1} />
      </mesh>
      {/* 기둥과 레일 */}
      {posts.map(([x, z]) => (
        <mesh key={x + ',' + z} position={[x, 0.5, z]} castShadow receiveShadow>
          <boxGeometry args={[0.06, 1.0, 0.06]} />
          <meshStandardMaterial color={C.wood} roughness={0.8} />
        </mesh>
      ))}
      {[-0.8, 0.8].map((z) => (
        <mesh key={z} position={[0, TOP, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 1.5, 12]} />
          <meshStandardMaterial color={C.steel} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* 건조망 */}
      <mesh position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.22, 1.56]} />
        <meshStandardMaterial color="#8bc34a" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <Peppers />
      {/* 주름 덮개 */}
      <group onClick={hit('cover')}>
        <Pleats xf={xf} />
      </group>
      {/* 앞막대(홈통) */}
      <mesh position={[xf, RY, 0]} castShadow onClick={hit('bar')}>
        <boxGeometry args={[0.08, 0.07, 1.72]} />
        <meshStandardMaterial color={C.blue} roughness={0.4} emissive={em('bar')} emissiveIntensity={0.5} />
      </mesh>
      {/* 자석 걸쇠 */}
      {[-0.8, 0.8].map((z) => (
        <group key={z}>
          <mesh position={[XO - 0.07, RY, z]} onClick={hit('magOpen')}>
            <boxGeometry args={[0.06, 0.07, 0.07]} />
            <meshStandardMaterial color={C.red} emissive={em('magOpen')} emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[XC + 0.07, RY, z]} onClick={hit('magClose')}>
            <boxGeometry args={[0.06, 0.07, 0.07]} />
            <meshStandardMaterial color="#c5221f" emissive={em('magClose')} emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
      {/* 높은 기둥과 도르래(양쪽): 줄이 레일 끝에서 위로 올라갔다가 넘어가 물병과 평형추를 매단다 */}
      {[1, -1].map((d) => (
        <group key={d}>
          <mesh position={[d * MX, (PT + 0.12) / 2, -0.075]} castShadow receiveShadow>
            <boxGeometry args={[0.06, PT + 0.12, 0.06]} />
            <meshStandardMaterial color={C.wood} roughness={0.8} />
          </mesh>
          <Pulley x={d * (MX - 0.06)} y={RY + 0.06} />
          <Pulley x={d * (MX + 0.08)} y={PT} r={0.08} />
        </group>
      ))}
      <Rope points={[[xf + 0.04, RY, 0], [MX - 0.06, RY, 0], [MX, RY + 0.06, 0], [MX, PT, 0], [MX + 0.08, PT + 0.08, 0], [BX, PT, 0], [BX, by + BH + 0.05, 0]]} />
      <Rope points={[[xf - 0.04, RY, 0], [-MX + 0.06, RY, 0], [-MX, RY + 0.06, 0], [-MX, PT, 0], [-MX - 0.08, PT + 0.08, 0], [-BX, PT, 0], [-BX, wy + 0.2, 0]]} />
      {/* 물병 */}
      <group onClick={hit('bottle')}>
        <Bottle position={[BX, by, 0]} r={0.08} h={BH} fill={Math.min(1, water / RAIN.bottleMax)} />
        {highlight === 'bottle' && <mesh position={[BX, by + BH / 2, 0]}><sphereGeometry args={[0.2, 16, 12]} /><meshBasicMaterial color="#ffb300" transparent opacity={0.25} /></mesh>}
      </group>
      {/* 물구멍: 물병 아래쪽에 달려 물병과 함께 오르내린다. 빨래집게가 막고 있다가 물병이 맨 아래로 오면 받침 막대가 집게 손잡이를 밀어 올려 열린다 */}
      <group position={[BX, by, 0]} onClick={hit('hole')}>
        {/* 구멍에 끼운 짧은 대롱 */}
        <mesh position={[0, HY, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.1, 12]} />
          <meshStandardMaterial color="#eceff1" roughness={0.3} emissive={em('hole')} emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, HY, 0.181]}>
          <circleGeometry args={[0.007, 12]} />
          <meshBasicMaterial color={open > 0.5 ? C.water : '#202124'} />
        </mesh>
        {/* 빨래집게: 위쪽 팔은 물병에 붙어 있고 아래쪽 팔만 움직인다 */}
        <group position={[-0.07, HY, 0.135]}>
          <group rotation={[0, 0, -0.16]}>
            <mesh position={[-0.01, 0.012, 0]} castShadow><boxGeometry args={[0.19, 0.014, 0.026]} /><meshStandardMaterial color={C.orange} roughness={0.6} emissive={em('hole')} emissiveIntensity={0.6} /></mesh>
          </group>
          <group rotation={[0, 0, 0.16 - 0.3 * open]}>
            <mesh position={[-0.01, -0.012, 0]} castShadow><boxGeometry args={[0.19, 0.014, 0.026]} /><meshStandardMaterial color={C.orange} roughness={0.6} emissive={em('hole')} emissiveIntensity={0.6} /></mesh>
          </group>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.012, 0.012, 0.032, 10]} /><meshStandardMaterial color={C.steel} metalness={0.6} roughness={0.3} /></mesh>
        </group>
        {/* 누르기 쉽게 넉넉한 투명 영역 */}
        <mesh position={[-0.05, HY, 0.14]}><sphereGeometry args={[0.12, 12, 10]} /><meshBasicMaterial transparent opacity={highlight === 'hole' ? 0.25 : 0} color="#ffb300" depthWrite={false} /></mesh>
      </group>
      {/* 받침 막대(바닥에 고정) */}
      <group onClick={hit('hole')}>
        <mesh position={[BX - 0.175, ROD / 2, 0.135]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, ROD, 10]} />
          <meshStandardMaterial color={C.woodDeep} roughness={0.8} emissive={em('hole')} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[BX - 0.175, 0.012, 0.135]} receiveShadow>
          <boxGeometry args={[0.14, 0.024, 0.14]} />
          <meshStandardMaterial color="#cfd8dc" />
        </mesh>
      </group>
      {draining && open > 0.5 && <mesh position={[BX, 0.004, 0.2]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.09, 20]} /><meshBasicMaterial color={C.water} transparent opacity={0.45} /></mesh>}
      <Drips on={draining && open > 0.5} x={BX} y={by + HY} z={0.185} />
      {/* 받이판: 물병이 가장 높이 올라와도 그보다 위에 있어 빗물이 흘러든다 */}
      <group onClick={hit('plate')}>
        <mesh position={[BX + 0.52, PLATE, 0]} castShadow>
          <boxGeometry args={[0.6, 0.03, 0.6]} />
          <meshStandardMaterial color="#e3f2fd" emissive={em('plate')} emissiveIntensity={0.5} />
        </mesh>
        {[[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].map(([a, b]) => (
          <mesh key={a + ',' + b} position={[BX + 0.52 + a, PLATE / 2, b]} castShadow>
            <boxGeometry args={[0.03, PLATE, 0.03]} />
            <meshStandardMaterial color={C.steel} />
          </mesh>
        ))}
        {water > 0 && <mesh position={[BX + 0.52, PLATE + 0.02, 0]}><boxGeometry args={[0.56, 0.006, 0.56]} /><meshBasicMaterial color={C.water} transparent opacity={Math.min(0.5, rate / 40 + 0.1)} /></mesh>}
      </group>
      <Rope points={[[BX + 0.3, PLATE - 0.02, 0.1], [BX + 0.16, Math.max(PLATE - 0.2, by + BH + 0.2), 0.1], [BX + 0.03, by + BH + 0.06, 0.02]]} color="#90caf9" radius={0.012} />
      {/* 평형추 */}
      <mesh position={[-BX, wy + 0.1, 0]} castShadow onClick={hit('weight')}>
        <sphereGeometry args={[0.13, 20, 16]} />
        <meshStandardMaterial color={C.card} roughness={0.9} emissive={em('weight')} emissiveIntensity={0.5} />
      </mesh>
      {rate > 0 && <Rain rate={rate} />}
      {/* 부품 이름 */}
      <Label visible={labels} n={1} position={[X0 + 0.12, TOP + 0.28, 0.5]}>주름 덮개</Label>
      <Label visible={labels} n={2} position={[xf, TOP + 0.22, -0.7]}>앞막대</Label>
      <Label visible={labels} n={3} position={[XO - 0.07, TOP + 0.2, 0.85]}>열림 쪽 자석</Label>
      <Label visible={labels} n={4} position={[XC + 0.07, TOP + 0.2, 0.85]}>닫힘 쪽 자석</Label>
      <Label visible={labels} n={5} position={[BX + 0.52, PLATE + 0.2, 0]}>받이판</Label>
      <Label visible={labels} n={6} position={[BX + 0.22, by + BH * 0.6, 0.2]}>물병</Label>
      <Label visible={labels} n={7} position={[BX + 0.03, by - 0.03, 0.2]}>물구멍</Label>
      <Label visible={labels} n={8} position={[-BX - 0.02, wy + 0.36, 0.1]}>평형추</Label>
    </group>
  )
}

// 시뮬레이션 상태(진짜 크기 기준). speed: 1초에 몇 초를 흘려보낼지
export function useRainSim({ initRate = 0, hole = 1.2 } = {}) {
  const [rate, setRate] = useState(initRate)
  const [speed, setSpeed] = useState(10)
  const [holeMm, setHole] = useState(hole)
  const [dew, setDew] = useState(false)
  const [view, setView] = useState({ water: 0, c: 0, closed: false, t: 0, events: [] })
  const s = useRef({ water: 0, c: 0, closed: false, t: 0, events: [], acc: 0 })
  const live = useRef({ rate, speed, holeMm, dew })
  live.current = { rate, speed, holeMm, dew }

  const reset = () => { s.current = { water: 0, c: 0, closed: false, t: 0, events: [], acc: 0 }; setView({ ...s.current }) }

  const step = (dtReal) => {
    const st = s.current
    const { rate: r, speed: sp, holeMm: h, dew: d } = live.current
    let dt = Math.min(0.1, dtReal) * sp
    st.t += dt
    let inflow = rainGramsPerSec(r, RAIN.plateCm2)
    if (st.closed) inflow += rainGramsPerSec(r, RAIN.coverCm2) * 0.4
    if (d) inflow += 7 / 3600
    let out = st.closed ? drainPerSec(st.water, h) : 0
    if (!st.closed) out += 9 / 3600 // 면실 심지(아주 적은 양)
    st.water = Math.max(0, Math.min(RAIN.bottleMax, st.water + (inflow - out) * dt))
    if (!st.closed && st.water >= RAIN.closeAt) { st.closed = true; st.events = [...st.events, { t: st.t, e: '딸깍! 덮개가 닫혔어요' }] }
    if (st.closed && st.water < RAIN.openAt) { st.closed = false; st.events = [...st.events, { t: st.t, e: '물이 빠져 덮개가 다시 열렸어요' }] }
    const target = st.closed ? 1 : 0
    st.c += Math.sign(target - st.c) * Math.min(Math.abs(target - st.c), dtReal / 1.1)
    st.acc += dtReal
    if (st.acc > 0.08) { st.acc = 0; setView({ water: st.water, c: st.c, closed: st.closed, t: st.t, events: st.events }) }
  }
  return { rate, setRate, speed, setSpeed, holeMm, setHole, dew, setDew, view, step, reset, cRef: s }
}

export function RainDriver({ sim }) {
  useFrame((_, dt) => sim.step(dt))
  return null
}

export function clock(t) {
  const m = Math.floor(t / 60) + 14 * 60
  const hh = Math.floor(m / 60) % 24, mm = m % 60
  return `${hh}:${String(mm).padStart(2, '0')}`
}

export function useLiveC(sim) {
  // 덮개 위치는 매 프레임 부드럽게
  const [c, setC] = useState(0)
  useEffect(() => { setC(sim.view.c) }, [sim.view.c])
  return c
}
