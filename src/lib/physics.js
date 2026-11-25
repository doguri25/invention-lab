// 시뮬레이션에 쓰는 계산(계획서 숫자 기준)

// 빗물 덮개(진짜 크기)
export const RAIN = {
  plateCm2: 60 * 60, // 받이판 넓이
  coverCm2: 120 * 160, // 닫힌 덮개 위 빗물(홈통으로 모임)
  closeAt: 90, // 40 + 20 + 30
  openAt: 10, // 40 - 20 - 10
  bottleMax: 2000,
  bottleR: 5.2, // cm, 2 L 병 반지름
}

// mm/시 비가 넓이 cm²에 내릴 때 1초에 모이는 물(g)
export const rainGramsPerSec = (mmPerHour, areaCm2) => (mmPerHour / 3600) * areaCm2 * 0.1

// 토리첼리: 구멍(지름 mm)으로 1초에 빠지는 물(mL)
export function drainPerSec(waterMl, holeMm, bottleR = RAIN.bottleR) {
  if (waterMl <= 0) return 0
  const area = Math.PI * bottleR * bottleR
  const h = waterMl / area // cm
  const a = Math.PI * Math.pow(holeMm / 20, 2) // cm²
  return 0.62 * a * Math.sqrt(2 * 981 * h)
}

// 테이프 벗기는 힘(켄달): 90°일 때 f90
export const peelForce = (deg, f90) => f90 / (1 - Math.cos((deg * Math.PI) / 180))

// 자석이 붙잡는 힘(g): 종이 한 장 0.1 mm
export const magnetForce = (sheets, f0 = 60, d0 = 0.22) => f0 / Math.pow(1 + (sheets * 0.1) / d0, 2)

// 빗면: 질량 m(g), 높이 h, 길이 L, 마찰계수 mu → 끄는 힘(g)
export function rampForce(m, h, L, mu = 0.25) {
  const s = h / L
  const c = Math.sqrt(Math.max(0, 1 - s * s))
  return m * (s + mu * c)
}

export const circ = (r) => 2 * Math.PI * r

export const fmt = (v, d = 1) => (Number.isFinite(v) ? (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('ko-KR') : '-')
