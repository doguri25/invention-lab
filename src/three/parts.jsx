import { useMemo } from 'react'
import * as THREE from 'three'
import { Html, RoundedBox } from '@react-three/drei'

export const C = {
  wood: '#e6cba2', woodDeep: '#c79c62', paper: '#fbfbf8', ink: '#3c4043', blue: '#1a73e8', water: '#4f9cf5',
  orange: '#e8710a', amber: '#f6c26b', red: '#d93025', green: '#188038', gray: '#9aa0a6', steel: '#b7bcc3', card: '#d9b98a',
}

export function Label({ position, n, children, visible = true }) {
  if (!visible) return null
  return (
    <Html position={position} center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
      <span className="lbl3d">{n != null && <b>{n}</b>}{children}</span>
    </Html>
  )
}

export function Table({ w = 6, d = 3.6, y = 0, color = C.wood }) {
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[w, 0.12, d]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
    </group>
  )
}

// 종이컵: 바닥 반지름 r1, 위 반지름 r2, 높이 h, fill 0~1
export function Cup({ position = [0, 0, 0], r1 = 0.16, r2 = 0.23, h = 0.42, fill = 0, color = '#ffffff', band = C.blue, onClick }) {
  const geo = useMemo(() => {
    const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(r1, 0), new THREE.Vector2(r2, h), new THREE.Vector2(r2 - 0.012, h), new THREE.Vector2(r1 - 0.012, 0.012), new THREE.Vector2(0.001, 0.012)]
    return new THREE.LatheGeometry(pts, 40)
  }, [r1, r2, h])
  const wh = Math.max(0.001, fill * h * 0.92)
  const wr = r1 + (r2 - r1) * (wh / h) - 0.014
  return (
    <group position={position} onClick={onClick}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, h * 0.72, 0]}>
        <cylinderGeometry args={[r1 + (r2 - r1) * 0.78 + 0.002, r1 + (r2 - r1) * 0.66 + 0.002, h * 0.12, 40, 1, true]} />
        <meshStandardMaterial color={band} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {fill > 0.005 && (
        <mesh position={[0, 0.012 + wh / 2, 0]}>
          <cylinderGeometry args={[wr, r1 - 0.014, wh, 32]} />
          <meshPhysicalMaterial color={C.water} transparent opacity={0.78} roughness={0.08} clearcoat={1} />
        </mesh>
      )}
    </group>
  )
}

export function Scale({ position = [0, 0, 0], w = 1.0, d = 0.8, reading = '0.0 g', children }) {
  return (
    <group position={position}>
      <RoundedBox args={[w, 0.14, d]} radius={0.04} position={[0, 0.07, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#e8eaed" roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[w * 0.86, 0.035, d * 0.78]} radius={0.015} position={[0, 0.16, -0.02]} castShadow receiveShadow>
        <meshStandardMaterial color={C.steel} metalness={0.5} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0.075, d / 2 + 0.001]}>
        <planeGeometry args={[w * 0.5, 0.085]} />
        <meshStandardMaterial color="#202124" />
      </mesh>
      <Html position={[0, 0.075, d / 2 + 0.01]} center transform distanceFactor={1.15} zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'Jua, sans-serif', color: '#7CFC9A', fontSize: 26, letterSpacing: 1, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(124,252,154,.6)' }}>{reading}</div>
      </Html>
      <group position={[0, 0.18, -0.02]}>{children}</group>
    </group>
  )
}

// 페트병(옆에서 본 윤곽을 돌려 만듦). 높이 h, 반지름 r, fill 0~1
export function Bottle({ position = [0, 0, 0], r = 0.33, h = 1.4, fill = 0.5, holeY, tint = '#d6e6fb' }) {
  const geo = useMemo(() => {
    const p = [[0.001, 0], [r * 0.9, 0], [r, 0.06 * h], [r, 0.62 * h], [r * 0.78, 0.76 * h], [r * 0.4, 0.86 * h], [r * 0.36, 0.95 * h], [r * 0.38, h]]
    return new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), 40)
  }, [r, h])
  const wh = Math.min(0.6 * h, Math.max(0, fill) * 0.6 * h)
  return (
    <group position={position}>
      <mesh geometry={geo} castShadow>
        <meshPhysicalMaterial color={tint} transparent opacity={0.36} roughness={0.05} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {wh > 0.004 && (
        <mesh position={[0, 0.01 + wh / 2, 0]}>
          <cylinderGeometry args={[r * 0.96, r * 0.92, wh, 36]} />
          <meshPhysicalMaterial color={C.water} transparent opacity={0.72} roughness={0.05} clearcoat={1} />
        </mesh>
      )}
      <mesh position={[0, h + 0.03, 0]}>
        <cylinderGeometry args={[r * 0.4, r * 0.4, 0.07, 24]} />
        <meshStandardMaterial color={C.blue} />
      </mesh>
      {holeY != null && (
        <mesh position={[0, holeY, r + 0.002]}>
          <circleGeometry args={[0.025, 16]} />
          <meshBasicMaterial color="#202124" />
        </mesh>
      )}
    </group>
  )
}

export function Rope({ points, color = '#5f6368', radius = 0.008 }) {
  const geo = useMemo(() => {
    const v = points.map((p) => new THREE.Vector3(...p))
    const path = new THREE.CurvePath()
    for (let i = 0; i < v.length - 1; i++) path.add(new THREE.LineCurve3(v[i], v[i + 1]))
    return new THREE.TubeGeometry(path, Math.max(8, v.length * 6), radius, 6, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), radius])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}
