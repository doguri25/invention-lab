import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useMemo } from 'react'
import { useApp } from '../lib/store'

function webglOK() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch (e) { return false }
}

// 화면이 세로로 길면 카메라를 조금 뒤로 물려 모형이 잘리지 않게 한다
function Fit({ cam, target, refAspect = 1.3 }) {
  const { camera, size, controls } = useThree()
  const place = () => {
    const k = Math.min(1.7, Math.max(1, refAspect / (size.width / Math.max(1, size.height))))
    camera.position.set(target[0] + (cam[0] - target[0]) * k, target[1] + (cam[1] - target[1]) * k, target[2] + (cam[2] - target[2]) * k)
    camera.lookAt(target[0], target[1], target[2])
    if (controls) { if (controls.target) controls.target.set(target[0], target[1], target[2]); controls.update() }
  }
  useEffect(place, [size.width, size.height, controls]) // eslint-disable-line
  // 「처음 시점으로」 버튼
  useEffect(() => {
    window.addEventListener('invlab:resetview', place)
    return () => window.removeEventListener('invlab:resetview', place)
  })
  return null
}

export function Stage({ children, camera = [3, 2.2, 4], target = [0, 0.6, 0], fov = 35, minD = 2, maxD = 12, ground = true,
  autoRotate = false, shadowScale = 8, label = '3D 실험 화면', bg }) {
  const ok = useMemo(webglOK, [])
  const motion = useApp((s) => s.prefs.motion)
  if (!ok) return <div className="fallback3d">이 기기에서는 3D 화면을 열 수 없어요. 아래 숫자와 버튼으로 실험은 그대로 할 수 있어요.</div>
  return (
    <Canvas role="img" aria-label={label} dpr={[1, 1.75]} shadows camera={{ position: camera, fov, near: 0.05, far: 100 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }} style={{ touchAction: 'none' }}>
      {bg && <color attach="background" args={[bg]} />}
      <hemisphereLight args={['#ffffff', '#c7d3e6', 1.05]} />
      <directionalLight position={[4, 8, 5]} intensity={1.55} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-0.0004} />
      <directionalLight position={[-5, 3, -4]} intensity={0.35} />
      <Fit cam={camera} target={target} />
      <Suspense fallback={null}>{children}</Suspense>
      {ground && <ContactShadows position={[0, 0.002, 0]} opacity={0.32} scale={shadowScale} blur={2.6} far={5} resolution={512} />}
      <OrbitControls target={target} enablePan={false} minDistance={minD} maxDistance={maxD * 1.7} maxPolarAngle={Math.PI * 0.495}
        autoRotate={autoRotate && motion} autoRotateSpeed={0.55} enableDamping dampingFactor={0.08} makeDefault />
    </Canvas>
  )
}
