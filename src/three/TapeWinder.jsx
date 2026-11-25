import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { C, Label } from './parts'

// 단위: 1 = 10 cm. 상자 윗면 y = 0 (상자는 아래로 그림)
const BOX_L = 4.4, BOX_W = 2.8, BOX_H = 2.2
export const START = 1.7 // 장치 처음 위치(x)
const WHEEL_R = 0.25, REEL_R0 = 0.15
const P = { wedge: [-1.0, 0.02], roller: [-0.78, 0.26], reel: [0.05, 0.86], wheel: [0.85, WHEEL_R] }

function ribbonGeo(points, width = 0.48) {
  // 점들을 따라가는 납작한 띠(테이프)
  const pos = [], idx = []
  points.forEach((p, i) => {
    pos.push(p[0], p[1], -width / 2, p[0], p[1], width / 2)
    if (i < points.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}

function arc(cx, cy, r, a0, a1, n = 12) {
  return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] })
}

export function TapeWinderModel({ d = 0, wound = 0, slack = 0, tear = false, labels = false, onPart, highlight, see = true }) {
  const x = START - d
  const wheelA = d / WHEEL_R
  const reelR = REEL_R0 + Math.min(0.06, wound * 0.012)
  const reelA = wheelA * 2 * (wound > 0 ? Math.min(1, wound / Math.max(0.001, d * 1.0)) : 0)
  const hit = (id) => (e) => { if (onPart) { e.stopPropagation(); onPart(id) } }
  const em = (id) => (highlight === id ? '#ffb300' : '#000000')

  // 테이프 길: 쐐기 끝 → 롤러를 돌아 → 감개
  const peel = x + P.wedge[0]
  const path = useMemo(() => {
    const [rx, ry] = P.roller, r = 0.1
    const pts = [[peel, 0.012], [x + rx - 0.02, ry - r - 0.02]]
    const sag = slack > 0 ? Math.min(0.5, slack * 0.25) : 0
    const around = arc(x + rx, ry, r + 0.01, -Math.PI / 2 - 0.3, Math.PI * 0.62, 10)
    around.forEach((p) => pts.push(p))
    const [ex, ey] = [x + P.reel[0], P.reel[1]]
    const mid = [(around[around.length - 1][0] + ex) / 2 + 0.05, (around[around.length - 1][1] + ey) / 2 - sag]
    pts.push(mid, [ex - reelR * 0.7, ey - reelR * 0.7])
    return pts
  }, [peel, x, slack, reelR])
  const geo = useMemo(() => ribbonGeo(path.map(([a, b]) => [a, b])), [path])
  const left = useMemo(() => ribbonGeo([[-BOX_L / 2, 0.006], [peel, 0.006]]), [peel])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -BOX_H, 0]} receiveShadow>
        <circleGeometry args={[4.5, 48]} />
        <meshStandardMaterial color="#eef1f6" />
      </mesh>
      {/* 상자 */}
      <mesh position={[0, -BOX_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BOX_L, BOX_H, BOX_W]} />
        <meshStandardMaterial color={C.card} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOX_L, 0.02]} />
        <meshBasicMaterial color="#a8865a" />
      </mesh>
      {/* 아직 붙어 있는 테이프 */}
      <mesh geometry={left}><meshStandardMaterial color={C.amber} transparent opacity={0.85} side={THREE.DoubleSide} roughness={0.3} /></mesh>
      {tear && Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[peel + 0.1 + i * 0.12, 0.02 + (i % 3) * 0.03, (i % 2 ? 0.15 : -0.15)]} rotation={[i, i * 2, 0]}>
          <boxGeometry args={[0.08, 0.005, 0.06]} />
          <meshStandardMaterial color="#c9a46c" />
        </mesh>
      ))}
      {/* 벗겨진 테이프 */}
      <mesh geometry={geo}><meshStandardMaterial color={C.amber} transparent opacity={0.92} side={THREE.DoubleSide} roughness={0.3} /></mesh>

      {/* 장치 */}
      <group position={[x, 0, 0]}>
        {/* 옆판 */}
        {[0.36, -0.36].map((z) => (
          <RoundedBox key={z} args={[2.25, 1.25, 0.04]} radius={0.12} position={[-0.06, 0.66, z]} castShadow>
            <meshPhysicalMaterial color={z > 0 ? '#e8f0fe' : '#ffffff'} transparent opacity={z > 0 && see ? 0.28 : 0.96} roughness={0.2} clearcoat={0.6} depthWrite={!(z > 0 && see)} />
          </RoundedBox>
        ))}
        {/* 쐐기 */}
        <mesh position={[P.wedge[0] + 0.14, 0.07, 0]} onClick={hit('wedge')} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.62, 3]} />
          <meshStandardMaterial color={C.orange} emissive={em('wedge')} emissiveIntensity={0.6} />
        </mesh>
        {/* 롤러 */}
        <mesh position={[P.roller[0], P.roller[1], 0]} rotation={[Math.PI / 2, 0, 0]} onClick={hit('roller')}>
          <cylinderGeometry args={[0.1, 0.1, 0.62, 24]} />
          <meshStandardMaterial color="#5f6368" metalness={0.3} roughness={0.4} emissive={em('roller')} emissiveIntensity={0.6} />
        </mesh>
        {/* 바퀴 */}
        <group position={[P.wheel[0], P.wheel[1], 0]} rotation={[0, 0, wheelA]} onClick={hit('wheel')}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.5, 32]} />
            <meshStandardMaterial color="#3c4043" roughness={0.9} emissive={em('wheel')} emissiveIntensity={0.6} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]} position={[0, 0, 0.26]}>
              <boxGeometry args={[WHEEL_R * 1.7, 0.04, 0.02]} />
              <meshStandardMaterial color="#dadce0" />
            </mesh>
          ))}
        </group>
        {/* 감개 */}
        <group position={[P.reel[0], P.reel[1], 0]} rotation={[0, 0, reelA]} onClick={hit('reel')}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[reelR, reelR, 0.5, 32]} />
            <meshStandardMaterial color={wound > 0.05 ? C.amber : '#efe3d0'} roughness={0.5} emissive={em('reel')} emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.26]}><boxGeometry args={[reelR * 1.8, 0.03, 0.02]} /><meshStandardMaterial color="#b07c2e" /></mesh>
        </group>
        {/* 고무줄 벨트 */}
        <group onClick={hit('belt')}>
          {[[P.reel, P.wheel, 1], [P.reel, P.wheel, -1]].map(([a, b, sgn], i) => {
            const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx)
            const off = sgn * 0.17
            return (
              <mesh key={i} position={[(a[0] + b[0]) / 2 - Math.sin(ang) * off, (a[1] + b[1]) / 2 + Math.cos(ang) * off, 0.22]} rotation={[0, 0, ang]}>
                <boxGeometry args={[L, 0.03, 0.03]} />
                <meshStandardMaterial color={C.green} emissive={em('belt')} emissiveIntensity={0.6} />
              </mesh>
            )
          })}
        </group>
        {/* 손잡이 */}
        <group onClick={hit('handle')}>
          <mesh position={[0.62, 1.42, 0]} rotation={[0, 0, -0.5]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.4, 12]} />
            <meshStandardMaterial color={C.steel} />
          </mesh>
          <RoundedBox args={[0.9, 0.2, 0.3]} radius={0.09} position={[0.95, 1.6, 0]} rotation={[0, 0, 0.15]} castShadow>
            <meshStandardMaterial color={C.orange} roughness={0.5} emissive={em('handle')} emissiveIntensity={0.5} />
          </RoundedBox>
        </group>
        <Label visible={labels} n={1} position={[P.wedge[0], -0.15, 0.7]}>쐐기</Label>
        <Label visible={labels} n={2} position={[P.wheel[0] + 0.3, -0.05, 0.7]}>구름 바퀴</Label>
        <Label visible={labels} n={3} position={[0.45, 0.4, 0.7]}>고무줄 벨트</Label>
        <Label visible={labels} n={4} position={[P.reel[0], P.reel[1] + 0.36, 0.5]}>감개</Label>
        <Label visible={labels} n={5} position={[P.roller[0] - 0.25, P.roller[1] + 0.2, 0.7]}>벗김 롤러</Label>
        <Label visible={labels} n={6} position={[1.1, 1.92, 0]}>손잡이</Label>
      </group>
    </group>
  )
}

// clutch: 0 약함, 1 알맞음, 2 셈
export function useTapeSim() {
  const [d, setD] = useState(0)
  const [clutch, setClutch] = useState(1)
  const [playing, setPlaying] = useState(false)
  const max = 3.2
  const wound = clutch === 0 ? d * 0.55 : d
  const slack = clutch === 0 ? d - wound : 0
  const tear = clutch === 2 && d > 0.3
  return { d, setD, clutch, setClutch, playing, setPlaying, max, wound, slack, tear }
}

export function TapeDriver({ sim }) {
  const acc = useRef(0)
  useFrame((_, dt) => {
    if (!sim.playing) return
    acc.current += dt
    const nd = Math.min(sim.max, sim.d + dt * 0.45)
    if (acc.current > 0.03) { acc.current = 0; sim.setD(nd); if (nd >= sim.max) sim.setPlaying(false) }
  })
  return null
}
