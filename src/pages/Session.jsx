import { useState } from 'react'
import { useApp } from '../lib/store'
import { SESSIONS, WORKS } from '../data/content'
import { Section, Talk, Tools, Steps, Picks, RecordTable, Stairs, Think, Quiz, LineChart } from '../components/ui'
import { LabSwitch } from '../labs'

function Predict({ p, data, set }) {
  if (!p) return null
  const v = data.predict
  return (
    <div className="predict">
      <p className="quiz-q">먼저 예상해 봐요. {p.q}</p>
      <Picks options={p.options} value={v} onChange={(o) => set('predict', o)} />
      {v && <p className="small" style={{ marginTop: 8 }}>예상을 적었어요. 이제 실험실에서 확인해 봐요. 결과가 달라도 괜찮아요. 왜 다른지 찾는 것이 탐구예요.</p>}
    </div>
  )
}

function DrainGraph({ data }) {
  const ys = [250, 200, 150, 100], rows = ['t250', 't200', 't150', 't100'], col = ['#1a73e8', '#e8710a', '#188038']
  const series = [0, 1, 2].map((j) => ({ name: '병 ' + 'ABC'[j], color: col[j], pts: [[0, 300], ...rows.map((r, i) => [parseFloat(data[`${r}_${j}`]), ys[i]]).filter(([x]) => Number.isFinite(x))] }))
  const xMax = Math.max(60, ...series.flatMap((s) => s.pts.map((p) => p[0])))
  return (
    <div style={{ marginTop: 14 }}>
      <p className="quiz-q">기록표로 그린 그래프</p>
      <LineChart series={series} xMax={Math.ceil(xMax / 30) * 30} yMax={300} xLabel="시간(초)" yLabel="남은 물(mL)" />
      <div className="row small">{series.map((s) => <span key={s.name} style={{ color: s.color, fontWeight: 700 }}>● {s.name}</span>)}</div>
    </div>
  )
}

function Speech({ s, data, set }) {
  const [peek, setPeek] = useState(false)
  const [flip, setFlip] = useState({})
  const bring = ['계획서', '탐구일지', '이 앱의 기록(인쇄)', '실험 사진·영상', '실험에 쓴 도구 한두 개', '질문 목록', '필기구']
  return (
    <>
      <Section n="✎" title="1분 설명 원고" note="외우지 말고 내 말로">
        <div className="stack">
          {s.speech.map((p, i) => (
            <label key={p.id} className="stack" style={{ gap: 6 }}>
              <b style={{ color: 'var(--pd)' }}>{i + 1}. {p.label}</b>
              <textarea className="field" style={{ minHeight: 64 }} value={data[p.id] || ''} onChange={(e) => set(p.id, e.target.value)} placeholder={peek ? '예: ' + p.sample : ''} />
            </label>
          ))}
          <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setPeek(!peek)}>{peek ? '예시 감추기' : '막히면 예시 보기'}</button>
        </div>
      </Section>
      <Section n="⏱" title="연습 기록" note="3D 무대의 1분 타이머를 써요">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <label key={i} className="stack" style={{ gap: 6 }}>
              <b>{i}번째 걸린 시간(초)</b>
              <input className="num" inputMode="numeric" value={data['try' + i] || ''} onChange={(e) => set('try' + i, e.target.value)} />
            </label>
          ))}
        </div>
        <textarea className="field" style={{ marginTop: 10, minHeight: 64 }} placeholder="친구의 한마디(잘한 점, 고칠 점)" value={data.peer || ''} onChange={(e) => set('peer', e.target.value)} />
      </Section>
      <Section n="?" title="전문가 선생님께 물어볼 질문" note="예상과 다른 결과가 가장 좋은 질문">
        <div className="stack">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
              <b className="display" style={{ color: 'var(--p)', width: 24 }}>{i + 1}</b>
              <input className="field" value={data['q' + i] || ''} onChange={(e) => set('q' + i, e.target.value)} placeholder={peek ? s.questions[i] : '질문을 적어요'} />
            </div>
          ))}
        </div>
      </Section>
      <Section n="!" title="심사위원이 물을 만한 질문" note="카드를 눌러 답의 방향 보기">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
          {s.judge.map(([q, a], i) => (
            <button key={i} type="button" onClick={() => setFlip({ ...flip, [i]: !flip[i] })} aria-pressed={!!flip[i]}
              style={{ textAlign: 'left', minHeight: 120, borderRadius: 18, border: '1.5px solid var(--line)', padding: 16, background: flip[i] ? 'var(--green-soft)' : '#fff' }}>
              <b style={{ display: 'block', marginBottom: 6 }}>{q}</b>
              <span className="small" style={{ color: flip[i] ? '#0d652d' : 'var(--sub)' }}>{flip[i] ? a : '먼저 내 말로 답해 보고 눌러요'}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section n="✓" title="12월 12일 챙길 것">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
          {bring.map((b, i) => (
            <label key={b} className="row" style={{ gap: 10, padding: '8px 12px', borderRadius: 12, background: data['b' + i] ? 'var(--green-soft)' : '#f8f9fa', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!data['b' + i]} onChange={(e) => set('b' + i, e.target.checked)} style={{ width: 24, height: 24, accentColor: 'var(--green)' }} />
              <span style={{ fontWeight: 600 }}>{b}</span>
            </label>
          ))}
        </div>
      </Section>
    </>
  )
}

export default function Session({ n }) {
  const user = useApp((s) => s.user)
  const list = SESSIONS[user.work]
  const s = list[Math.min(5, Math.max(0, n - 1))]
  const data = useApp((st) => st.records[s.key]) || {}
  const fb = useApp((st) => st.feedback[s.key])
  const setField = useApp((st) => st.setField)
  const set = (k, v) => setField(s.key, k, v)
  let sec = 0
  const N = () => ++sec
  return (
    <div>
      <div className="sess-head">
        <span className="nbadge" aria-hidden="true">{s.n}</span>
        <div>
          <span className={'chip ' + (s.kicker === '공통' ? 'green' : user.work)}>{s.n}차시 · {s.kicker}</span>
          <h1 style={{ marginTop: 4 }}>{s.title}</h1>
        </div>
        <nav className="dots no-print" aria-label="차시 이동">
          {list.map((x) => <a key={x.n} href={`#/s/${x.n}`} className={x.n === s.n ? 'on' : ''} aria-current={x.n === s.n ? 'page' : undefined} aria-label={`${x.n}차시`}>{x.n}</a>)}
        </nav>
      </div>
      <div className="split">
        <div className="stack" style={{ gap: 16 }}>
          <Section n={N()} title="오늘의 미션" id="mission">
            <Talk work={user.work} expr={s.n === 6 ? 'wow' : 'smile'} text={s.bubble} />
            <p style={{ marginTop: 14, fontWeight: 700 }}>{s.mission}</p>
          </Section>
          {s.steps.length > 0 && (
            <Section n={N()} title="준비물과 실험 순서" id="steps">
              <Tools items={s.tools} />
              <div style={{ height: 14 }} />
              <Steps items={s.steps} />
            </Section>
          )}
          {s.lab && (
            <Section n={N()} title={'3D 실험실: ' + s.lab.title} id="lab">
              <Predict p={s.lab.predict} data={data} set={set} />
              <ol style={{ margin: '14px 0 0', paddingLeft: 22 }}>{s.lab.guide.map((g) => <li key={g}>{g}</li>)}</ol>
              {s.lab.predict && data.predict && (
                <label className="stack" style={{ gap: 6, marginTop: 12 }}>
                  <b>실험해 보니 어땠나요?</b>
                  <textarea className="field" style={{ minHeight: 64 }} value={data.observe || ''} onChange={(e) => set('observe', e.target.value)} placeholder="예상과 같았나요, 달랐나요?" />
                </label>
              )}
            </Section>
          )}
          {s.speech && <Speech s={s} data={data} set={set} />}
          {s.record && (
            <Section n={N()} title="기록해요" id="record" note="진짜 실험에서 잰 값을 적어요">
              <p className="quiz-q">{s.record.title}</p>
              <RecordTable spec={s.record} data={data} onChange={set} />
              {s.graph && <DrainGraph data={data} />}
              {s.record2 && <><p className="quiz-q" style={{ marginTop: 18 }}>{s.record2.title}</p><RecordTable spec={s.record2} data={data} onChange={set} /></>}
              <p className="small muted" style={{ marginTop: 8 }}>평균은 저절로 계산돼요. 틀린 값도 지우지 말고 옆 칸에 다시 적어요.</p>
            </Section>
          )}
          {s.calc && (
            <Section n={N()} title="계산해요" id="calc" note="빈칸을 채우면 바로 확인">
              <Stairs items={s.calc} data={data} onChange={set} />
            </Section>
          )}
          {s.think && (
            <Section n={N()} title="생각해요" id="think">
              <div className="stack" style={{ gap: 22 }}>
                {s.think.map((t) => <Think key={t.id} item={t} data={data} onChange={set} work={user.work} />)}
              </div>
            </Section>
          )}
          <Section n={N()} title="마무리 퀴즈" id="quiz">
            <Quiz items={s.quiz} data={data} onChange={set} />
          </Section>
          <Section n={N()} title="오늘의 한 줄과 스스로 점검" id="end">
            <label className="stack" style={{ gap: 6 }}>
              <b>오늘 새로 알게 된 것</b>
              <input className="field" value={data.oneline || ''} onChange={(e) => set('oneline', e.target.value)} placeholder="한 줄로 적어요" />
            </label>
            <div className="stack" style={{ marginTop: 14, gap: 8 }}>
              {s.self.map((t, i) => (
                <button key={t} type="button" className="row" onClick={() => set('self' + i, !data['self' + i])} aria-pressed={!!data['self' + i]}
                  style={{ border: 0, background: data['self' + i] ? 'var(--star-soft)' : '#f8f9fa', borderRadius: 14, padding: '10px 14px', textAlign: 'left', gap: 10 }}>
                  <span style={{ fontSize: '1.3em', color: '#f9ab00' }} aria-hidden="true">{data['self' + i] ? '★' : '☆'}</span>
                  <span style={{ fontWeight: 600 }}>{t}</span>
                </button>
              ))}
            </div>
            {fb && (fb.stamp || fb.comment) && (
              <div className="stampbox" style={{ marginTop: 16 }}>
                {fb.stamp && <span className="stamp-c">참 잘했어요</span>}
                <div><b>선생님 한마디</b><p>{fb.comment || '도장을 받았어요!'}</p></div>
              </div>
            )}
          </Section>
          <nav className="row no-print" style={{ justifyContent: 'space-between' }}>
            {s.n > 1 ? <a className="btn ghost" href={`#/s/${s.n - 1}`}>{s.n - 1}차시로</a> : <span />}
            {s.n < 6 ? <a className="btn" href={`#/s/${s.n + 1}`}>{s.n + 1}차시로</a> : <a className="btn" href="#/practice">면담 연습하러 가기</a>}
          </nav>
        </div>
        <aside className="lab" aria-label="3D 실험실">
          <div className="labbox">
            <LabSwitch key={s.key} sim={s.lab?.sim} work={user.work} speechParts={(s.speech || []).map((p) => ({ label: p.label, text: data[p.id] }))} />
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>{WORKS[user.work].name} · 한 손가락으로 돌리고, 두 손가락으로 크게 봐요.</p>
        </aside>
      </div>
    </div>
  )
}
