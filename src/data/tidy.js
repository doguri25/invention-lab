// 숫자와 단위, 연산 기호와 숫자 사이가 줄바꿈으로 떨어지지 않게 띄어쓰기를 붙은 공백으로 바꾼다
const NB = ' '
const UNIT = /(\d)\s(?=(mm\/시|mm²|mm|cm²|cm|m²|m|mL|L|kg|g|N|°|초|분|시간|배|번|개|장|쪽|명|대|권|부|원|%|바퀴|차시|자리|주|월|일)(?![A-Za-z]))/g
const OP = /([×÷=+−~→])\s(?=[\d(])/g
const OP2 = /(\d)\s(?=[×÷=+−])/g
const WJ = '\u2060' // 눈에 안 보이는 붙임표: 괄호가 앞뒤 낱말과 떨어지지 않게
export const tidyText = (s) => s.replace(UNIT, '$1' + NB).replace(OP, '$1' + NB).replace(OP2, '$1' + NB)
  .replace(/(\S)·(?=\S)/g, '$1' + WJ + '·' + WJ).replace(/([^\s(])\(/g, '$1' + WJ + '(').replace(/\)(?=[가-힣A-Za-z0-9])/g, ')' + WJ)
export function tidy(v) {
  if (typeof v === 'string') return tidyText(v)
  if (Array.isArray(v)) return v.map(tidy)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = (k === 'img' || k === 'id' || k === 'key' || k === 'b' || k === 'sim') ? v[k] : tidy(v[k]); return o }
  return v
}
