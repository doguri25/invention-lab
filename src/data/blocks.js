// 학생 화면 토막의 순서와 이름. 교사 지도안의 「앱 화면」 칸과 같은 이름을 쓴다.
const NAMES = {
  mission: '미션', recall: '지난 시간 돌아보기', learn: '알아 두기', predict: '예상하기', record: '기록해요', record2: '기록해요',
  calc: '계산해요', lab: '3D 실험실', why: '왜 그럴까요?', think: '생각해요', create: '창의 활동', more: '더 해 보기',
  recap: '내 실험 돌아보기', script: '1분 설명 원고', tries: '연습 기록', judge: '심사위원이 물을 만한 질문',
  questions: '전문가 선생님께 물어볼 질문', bring: '12월 12일 챙길 것', quiz: '마무리 퀴즈', end: '마무리',
}
export function blockName(token, s) {
  if (token === 'steps' || token === 'steps2') return s[token].title
  if (token.startsWith('think:')) { const it = (s.think || []).find((t) => t.id === token.slice(6)); return (it && it.title) || '생각해요' }
  return NAMES[token] || token
}
// 차시의 모든 토막(순서대로)
export function sequence(s) {
  return ['mission', ...(s.n > 1 && !s.order.includes('recap') ? ['recall'] : []), ...s.order, 'quiz', 'end']
}
// 짧은 이름(위쪽 바로 가기 버튼용)
const SHORT = { mission: '미션', recall: '돌아보기', learn: '알아 두기', predict: '예상', record: '기록', record2: '기록 2', calc: '계산', lab: '3D 실험', why: '왜?', think: '생각', create: '창의', more: '더 해 보기', recap: '돌아보기', script: '원고', tries: '연습', judge: '예상 질문', questions: '내 질문', bring: '챙길 것', quiz: '퀴즈', end: '마무리', steps: '실험', steps2: '실험 2' }
export function blockShort(token, s) {
  if (token.startsWith('think:')) return '손 실험'
  if (token === 'steps' && s.steps2) return '실험 1'
  if (token === 'steps' && s.n === 1) return '읽기'
  if (token === 'record' && s.record2 && s.order.indexOf('record2') === s.order.indexOf('record') + 2) return '기록 1'
  return SHORT[token] || token
}
