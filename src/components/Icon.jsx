// 글자 대신 쓰는 작은 그림 아이콘(화면 읽기 프로그램은 건너뛴다)
const P = {
  star: 'M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.1 6.6 20l1.1-6.1L3.2 9.6l6.1-.8z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
}
export function Icon({ name, fill }) {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={P[name]} fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={name === 'check' ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
