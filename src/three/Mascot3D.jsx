import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useApp } from '../lib/store'

function Face({ z, y, s = 1, mood }) {
  const eyes = useRef()
  useFrame(({ clock }) => {
    if (!eyes.current) return
    const t = clock.elapsedTime % 4
    eyes.current.scale.y = t > 3.82 ? 0.15 : 1
  })
  return (
    <group position={[0, y, z]} scale={s}>
      <group ref={eyes}>
        {[-0.17, 0.17].map((x) => (
          <group key={x} position={[x, 0.04, 0]}>
            <mesh scale={[0.11, 0.13, 0.05]}><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color="#ffffff" roughness={0.3} /></mesh>
            <mesh position={[0.01, -0.01, 0.045]} scale={[0.062, 0.072, 0.03]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#202124" roughness={0.2} /></mesh>
            <mesh position={[-0.012, 0.022, 0.07]} scale={0.018}><sphereGeometry args={[1, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </group>
        ))}
      </group>
      {[-0.29, 0.29].map((x) => (
        <mesh key={x} position={[x, -0.1, -0.005]} scale={[0.07, 0.04, 0.02]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#f8a5b8" roughness={0.6} /></mesh>
      ))}
      {mood === 'wow' ? (
        <mesh position={[0, -0.16, 0.01]} scale={[0.06, 0.075, 0.03]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#b3261e" /></mesh>
      ) : (
        <mesh position={[0, -0.12, 0.01]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.08, 0.018, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#b3261e" />
        </mesh>
      )}
    </group>
  )
}

function Ddok({ mood }) {
  const geo = useMemo(() => {
    const pts = []
    const R = 0.5
    for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.001, R * Math.cos(a)), R + R * Math.sin(a))) }
    for (let i = 1; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(Math.max(0.001, R * Math.pow(1 - t, 1.35) * (1 - 0.15 * t)), R + t * 0.72)) }
    return new THREE.LatheGeometry(pts, 48)
  }, [])
  return (
    <group>
      <mesh geometry={geo} castShadow>
        <meshPhysicalMaterial color="#6ea6f7" roughness={0.12} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <mesh position={[-0.2, 0.78, 0.33]} rotation={[0.3, 0, 0.5]} scale={[0.06, 0.13, 0.03]}>
        <sphereGeometry args={[1, 12, 10]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>
      <Face z={0.47} y={0.5} s={0.9} mood={mood} />
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.02, 0.05]} scale={[0.13, 0.06, 0.16]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#4285f4" /></mesh>
      ))}
    </group>
  )
}

function Dolly({ mood }) {
  const geo = useMemo(() => {
    const p = [[0.3, 0], [0.62, 0], [0.64, 0.02], [0.64, 0.5], [0.62, 0.52], [0.3, 0.52], [0.3, 0]]
    return new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), 56)
  }, [])
  return (
    <group>
      <group position={[0, 0.08, 0]}>
        <mesh geometry={geo} castShadow>
          <meshPhysicalMaterial color="#f5c86a" roughness={0.25} clearcoat={0.8} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.5, 32, 1, true]} />
          <meshStandardMaterial color="#b07c2e" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
        <Face z={0.62} y={0.27} s={0.82} mood={mood} />
        <mesh position={[0.5, 0.12, 0.38]} rotation={[0.3, 0.9, 0.2]}>
          <boxGeometry args={[0.24, 0.32, 0.012]} />
          <meshStandardMaterial color="#f7de9c" roughness={0.4} />
        </mesh>
      </group>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.03, 0.12]} scale={[0.13, 0.06, 0.15]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#e8710a" /></mesh>
      ))}
    </group>
  )
}

// cheer 값이 바뀌면 한 번 뛰어오른다
export function Mascot3D({ kind = 'rain', mood = 'smile', position = [0, 0, 0], scale = 1, cheer = 0, rotationY = 0 }) {
  const ref = useRef()
  const last = useRef({ cheer, t: -10 })
  const motion = useApp((s) => s.prefs.motion)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    if (last.current.cheer !== cheer) { last.current = { cheer, t } }
    const since = t - last.current.t
    const jump = since < 0.6 ? Math.sin((since / 0.6) * Math.PI) * 0.35 : 0
    const bob = motion ? Math.sin(t * 2.2) * 0.025 : 0
    ref.current.position.y = position[1] + bob + jump
    ref.current.rotation.z = motion ? Math.sin(t * 1.6) * 0.04 : 0
  })
  return (
    <group ref={ref} position={position} scale={scale} rotation={[0, rotationY, 0]}>
      {kind === 'rain' ? <Ddok mood={mood} /> : <Dolly mood={mood} />}
    </group>
  )
}
