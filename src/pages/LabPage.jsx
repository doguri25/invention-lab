import { useApp } from '../lib/store'
import { WORKS, PARTS } from '../data/content'
import { RainLab, TapeLab } from '../labs/InventionLab'

const HOW = {
  rain: ['맑은 날: 평형추가 빈 물병보다 40 g 무거워 덮개가 열려 있어요.', '비가 오면 받이판의 빗물이 물병에 모여요. 0.25 mm면 90 g이에요.', '90 g을 넘으면 자석에서 떨어지며 딸깍 닫혀요.', '닫히면 물구멍이 열려 물이 천천히 빠져요.', '10 g 아래로 줄면 평형추가 이겨 다시 열려요.'],
  tape: ['테이프 끝을 롤러에 걸쳐 감개 홈에 끼워요.', '손잡이를 잡고 상자 위로 밀면 바퀴가 굴러요.', '고무줄 벨트가 감개를 두 배 빠르게 돌려요.', '롤러가 테이프를 뒤로 크게 꺾어 쉽게 벗겨져요.', '너무 세게 당기면 고무줄이 미끄러져 종이를 지켜요.'],
}

export default function LabPage() {
  const user = useApp((s) => s.user)
  const W = WORKS[user.work]
  const Lab = user.work === 'rain' ? RainLab : TapeLab
  return (
    <div className="split" style={{ gridTemplateColumns: 'minmax(0, 0.7fr) minmax(0, 1.6fr)' }}>
      <div className="stack" style={{ gap: 16 }}>
        <section className="panel">
          <div className="sec-t"><h2>{W.name}</h2></div>
          <p className="muted small" style={{ marginBottom: 10 }}>{W.tag}</p>
          <ol style={{ paddingLeft: 22, margin: 0 }} className="stack">{HOW[user.work].map((h) => <li key={h}>{h}</li>)}</ol>
        </section>
        <section className="panel">
          <div className="sec-t"><h2>부품</h2></div>
          <ol style={{ paddingLeft: 22, margin: 0 }}>
            {PARTS[user.work].map((p) => <li key={p.id} style={{ marginBottom: 6 }}><b style={{ display: 'block' }}>{p.name}</b><span className="small muted">{p.desc}</span></li>)}
          </ol>
        </section>
        {user.work === 'rain' && (
          <section className="panel">
            <div className="sec-t"><h2>이렇게 실험해 봐요</h2></div>
            <ul style={{ paddingLeft: 22, margin: 0 }}>
              <li>소나기로 바꾸면 몇 초 만에 닫힐까요?</li>
              <li>물구멍을 1.0 mm와 1.4 mm로 바꾸면 다시 열리는 시각은?</li>
              <li>밤 이슬을 켜면 덮개가 닫힐까요?</li>
            </ul>
          </section>
        )}
        {user.work === 'tape' && (
          <section className="panel">
            <div className="sec-t"><h2>이렇게 실험해 봐요</h2></div>
            <ul style={{ paddingLeft: 22, margin: 0 }}>
              <li>고무줄을 약하게 하면 테이프는 어떻게 될까요?</li>
              <li>세게 하면 상자는 어떻게 될까요?</li>
              <li>32 cm를 밀면 바퀴는 몇 바퀴 돌까요?</li>
            </ul>
          </section>
        )}
      </div>
      <div className="lab" style={{ position: 'sticky', top: 84 }}>
        <div className="labbox" style={{ height: 'min(80vh, 760px)' }}><Lab mode="full" /></div>
      </div>
    </div>
  )
}
