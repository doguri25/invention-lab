import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import { SESSIONS, WORKS, TEACH } from '../data/content'
import { sessionProgress } from '../lib/progress'
import { go } from '../lib/router'
import { RecordTable, Stairs, Think } from '../components/ui'
import { LabSwitch } from '../labs'

const TK = 'invlab.v1.tpin'
const getPin = () => { try { return sessionStorage.getItem(TK) } catch (e) { return null } }
const keepPin = (p) => { try { if (p) sessionStorage.setItem(TK, p); else sessionStorage.removeItem(TK) } catch (e) { /* 저장 불가 */ } }
const appUrl = () => window.location.origin + window.location.pathname
const ago = (t) => {
  if (!t) return '아직 안 들어옴'
  const m = Math.round((Date.now() - new Date(t).getTime()) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  if (m < 60 * 24) return `${Math.round(m / 60)}시간 전`
  return `${Math.round(m / 1440)}일 전`
}
const tmsg = (e) => (e.code === 'LOCKED' ? '비밀번호를 여러 번 틀려서 15분 동안 잠겼어요.' : e.code === 'BAD_PIN' ? '선생님 비밀번호가 맞지 않아요.' : e.message)
const sampleOf = (t) => {
  if (t.type === 'pick') return t.answer ? `${t.answer}${t.why ? ' · ' + t.why : ''}` : ''
  if (t.type === 'frame' && t.sample) return `${t.parts[0]} ${t.sample.a} ${t.parts[2]} ${t.sample.b} ${t.parts[4]}`
  if (t.type === 'fair' && t.sample) return `바꾼 것: ${t.sample.changed} / 같게 한 것: ${t.sample.same} / 잰 것: ${t.sample.measured}`
  if (t.type === 'table') return '실제로 해 본 결과를 적으면 돼요.'
  return typeof t.sample === 'string' ? t.sample : ''
}
const cellClass = (sess, d, fb) => (fb?.stamp ? 'stamped' : sessionProgress(sess, d) >= 0.8 ? 'done' : sessionProgress(sess, d) > 0 ? 'part' : '')

function Login({ onOk }) {
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    try { const r = await api.teacher.overview(pin); keepPin(pin); onOk(pin, r) } catch (err) { setMsg(tmsg(err)) }
    setBusy(false)
  }
  return (
    <main className="main" style={{ maxWidth: 560, paddingTop: '10vh' }}>
      <form className="panel stack" onSubmit={submit} style={{ padding: 32, gap: 16 }}>
        <div className="row"><img src="/favicon.svg" alt="" width="44" /><h1 className="display" style={{ fontSize: '1.7em' }}>선생님 화면</h1></div>
        <p className="muted">학생 기록을 보고 도장을 찍는 화면이에요. 선생님 비밀번호를 넣어 주세요.</p>
        <input className="field" type="password" inputMode="numeric" autoComplete="current-password" value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="숫자 4~12자리" aria-label="선생님 비밀번호" style={{ letterSpacing: 6, fontWeight: 800 }} />
        {msg && <p className="fb no" role="alert">{msg}</p>}
        <div className="row">
          <button className="btn" disabled={pin.length < 4 || busy}>{busy ? '확인하는 중' : '열기'}</button>
          <a className="btn ghost" href="#/">학생 화면으로</a>
        </div>
      </form>
    </main>
  )
}

function Bar({ tab, onLock, onRefresh, busy }) {
  const L = [['', '학생 현황'], ['plan/1', '차시 지도안'], ['show/rain/1', '수업 화면'], ['settings', '설정']]
  return (
    <header className="topbar no-print">
      <a className="brand" href="#/teacher"><img src="/favicon.svg" alt="" /><b>선생님 화면</b></a>
      <nav className="tabs" aria-label="선생님 메뉴" style={{ boxShadow: 'none', background: '#e8eaed' }}>
        {L.map(([h, l]) => <button key={h} aria-pressed={tab === h.split('/')[0]} onClick={() => go('/teacher/' + h)}>{l}</button>)}
      </nav>
      <span className="grow" />
      <button className="tb-btn" onClick={onRefresh} disabled={busy}>{busy ? '불러오는 중' : '새로 불러오기'}</button>
      <a className="tb-btn" href="#/">학생 화면</a>
      <button className="tb-btn" onClick={onLock}>잠그기</button>
    </header>
  )
}

function QR() {
  const [src, setSrc] = useState('')
  const [big, setBig] = useState(false)
  useEffect(() => { QRCode.toDataURL(appUrl(), { margin: 1, width: 640, color: { dark: '#1f1f1f', light: '#ffffff' } }).then(setSrc).catch(() => {}) }, [])
  return (
    <>
      <section className="panel row" style={{ gap: 20, alignItems: 'center' }}>
        {src && <button onClick={() => setBig(true)} aria-label="QR 크게 보기" style={{ border: 0, padding: 0, background: 'none' }}><img src={src} alt="앱 주소 QR" width="132" height="132" style={{ borderRadius: 12 }} /></button>}
        <div className="stack" style={{ gap: 6, flex: 1, minWidth: 220 }}>
          <b className="display" style={{ fontSize: '1.3em' }}>학생 태블릿으로 QR을 찍어요</b>
          <p className="muted small">처음에는 발명품을 고르고 이름과 숫자 네 자리를 적어요. 다음부터는 같은 이름과 숫자로 들어와요.</p>
          <code style={{ fontSize: '.95em', fontWeight: 700, color: 'var(--rain-deep)', wordBreak: 'break-all' }}>{appUrl()}</code>
        </div>
        <button className="btn ghost small" onClick={() => setBig(true)}>전자칠판에 크게</button>
      </section>
      {big && (
        <div role="dialog" aria-label="QR 크게 보기" onClick={() => setBig(false)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(255,255,255,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <img src={src} alt="앱 주소 QR" style={{ width: 'min(70vh, 80vw)' }} />
          <p className="display" style={{ fontSize: '2em' }}>{appUrl()}</p>
          <p className="muted">아무 곳이나 누르면 닫혀요</p>
        </div>
      )}
    </>
  )
}

function Dashboard({ students }) {
  const [f, setF] = useState('all')
  const list = (students || []).filter((s) => f === 'all' || s.work === f)
  return (
    <div className="stack" style={{ gap: 18 }}>
      <QR />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="display" style={{ fontSize: '1.7em' }}>학생 현황 <span className="muted" style={{ fontSize: '.6em' }}>{(students || []).length}명</span></h1>
        <div className="tabs" role="group" aria-label="작품별 보기">
          <button aria-pressed={f === 'all'} onClick={() => setF('all')}>모두</button>
          <button aria-pressed={f === 'rain'} onClick={() => setF('rain')}>빗물 덮개</button>
          <button aria-pressed={f === 'tape'} onClick={() => setF('tape')}>테이프 감개</button>
        </div>
      </div>
      {students === null ? <p className="panel muted">불러오는 중이에요.</p> : list.length === 0 ? (
        <p className="panel muted" style={{ textAlign: 'center' }}>아직 들어온 학생이 없어요. 위 QR을 학생 태블릿으로 찍게 해 주세요.</p>
      ) : (
        <div className="t-grid">
          {list.map((s) => {
            const ss = SESSIONS[s.work]
            const stamps = ss.filter((x) => s.feedback[x.key]?.stamp).length
            return (
              <a key={s.id} href={`#/teacher/s/${s.id}`} className={'s-card work-' + s.work} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="row" style={{ gap: 10 }}>
                    <img src={`/icons/mascot-${s.work}-smile.svg`} alt="" width="44" />
                    <div><b className="display" style={{ fontSize: '1.35em' }}>{s.name}</b><br /><span className={'chip ' + s.work}>{WORKS[s.work].short}</span></div>
                  </div>
                  <span className="small muted">{ago(s.last_seen)}</span>
                </div>
                <div className="prog" aria-label="차시별 진행">
                  {ss.map((x) => {
                    const c = cellClass(x, s.records[x.key]?.data, s.feedback[x.key])
                    return <span key={x.key} className={c} title={`${x.n}차시 ${x.title}`}>{c === 'stamped' ? '★' : x.n}</span>
                  })}
                </div>
                <p className="small muted">도장 {stamps}개 · 일지 {(s.records.journal?.data?.list || []).length}쪽 · 연습 {(s.records.practice?.data?.log || []).length}번</p>
              </a>
            )
          })}
        </div>
      )}
      <p className="small muted">파란 칸은 거의 다 한 차시, 연한 칸은 하는 중, 빨간 별은 도장을 찍은 차시예요. 30초마다 새로 불러와요.</p>
    </div>
  )
}

function FeedbackBox({ pin, s, sess, onDone }) {
  const fb = s.feedback[sess.key] || {}
  const [stamp, setStamp] = useState(!!fb.stamp)
  const [comment, setComment] = useState(fb.comment || '')
  const [msg, setMsg] = useState('')
  useEffect(() => { setStamp(!!fb.stamp); setComment(fb.comment || ''); setMsg('') }, [sess.key, s.id]) // eslint-disable-line
  const save = async () => {
    setMsg('저장하는 중')
    try { await api.teacher.feedback(pin, s.id, sess.key, stamp, comment); setMsg('저장했어요. 학생 화면에 바로 보여요.'); onDone() } catch (e) { setMsg(tmsg(e)) }
  }
  return (
    <section className="panel" style={{ border: '2px solid #f6c6c1', background: '#fffafa' }}>
      <div className="sec-t"><h2>도장과 한마디</h2></div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <button type="button" onClick={() => setStamp(!stamp)} aria-pressed={stamp} className="stamp-c"
          style={{ background: stamp ? '#fff' : '#f8f9fa', opacity: stamp ? 1 : 0.35, cursor: 'pointer', width: 88, height: 88, fontSize: '1.05em' }}>참 잘했어요</button>
        <textarea className="field" style={{ flex: '1 1 260px', minHeight: 88 }} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500}
          placeholder="예: 세 번 재서 평균을 낸 점이 좋아요. 다음에는 같게 한 것을 더 적어 봐요." aria-label="선생님 한마디" />
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn small" onClick={save}>저장</button>
        <span className="small muted" role="status">{msg || (fb.at ? `마지막 저장 ${ago(fb.at)}` : '도장을 누르면 켜지고 꺼져요')}</span>
      </div>
    </section>
  )
}

function Manage({ pin, s, onDone }) {
  const [np, setNp] = useState('')
  const [msg, setMsg] = useState('')
  const [ask, setAsk] = useState(false)
  const reset = async () => {
    try { await api.teacher.resetPin(pin, s.id, np); setMsg(`${s.name} 학생의 새 비밀번호는 ${np}이에요. 학생에게 알려 주세요.`); setNp('') } catch (e) { setMsg(tmsg(e)) }
  }
  const remove = async () => {
    try { await api.teacher.remove(pin, s.id); onDone(); go('/teacher') } catch (e) { setMsg(tmsg(e)) }
  }
  return (
    <section className="panel">
      <div className="sec-t"><h2>학생 관리</h2></div>
      <div className="row">
        <input className="field" style={{ maxWidth: 200 }} inputMode="numeric" value={np} onChange={(e) => setNp(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="새 숫자 4자리" aria-label="새 비밀번호" />
        <button className="btn ghost small" disabled={np.length !== 4} onClick={reset}>비밀번호 바꾸기</button>
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        {ask ? (
          <>
            <span className="small" style={{ color: 'var(--red)', fontWeight: 700 }}>{s.name} 학생의 기록이 모두 지워지고 되돌릴 수 없어요.</span>
            <button className="btn small" style={{ background: 'var(--red)' }} onClick={remove}>기록 모두 지우기</button>
            <button className="btn ghost small" onClick={() => setAsk(false)}>그만두기</button>
          </>
        ) : <button className="btn ghost small" style={{ color: 'var(--red)' }} onClick={() => setAsk(true)}>이 학생 지우기</button>}
      </div>
      {msg && <p className="fb ok" role="status">{msg}</p>}
    </section>
  )
}

function Detail({ pin, s, n, onDone }) {
  if (!s) return <p className="panel muted">학생을 찾을 수 없어요. <a href="#/teacher">학생 현황으로</a></p>
  const ss = SESSIONS[s.work]
  const sess = ss[Math.min(5, Math.max(0, n - 1))]
  const d = s.records[sess.key]?.data || {}
  const at = s.records[sess.key]?.at
  const noop = () => {}
  return (
    <div className={'work-' + s.work}>
      <div className="sess-head">
        <img src={`/icons/mascot-${s.work}-smile.svg`} alt="" width="60" />
        <div>
          <span className={'chip ' + s.work}>{WORKS[s.work].name}</span>
          <h1 style={{ marginTop: 4 }}>{s.name}</h1>
        </div>
        <nav className="dots" aria-label="차시 고르기">
          {ss.map((x) => <a key={x.n} href={`#/teacher/s/${s.id}/${x.n}`} className={x.n === sess.n ? 'on' : ''} aria-current={x.n === sess.n ? 'page' : undefined}>{x.n}</a>)}
        </nav>
      </div>
      <div className="split" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)' }}>
        <div className="stack" style={{ gap: 16 }}>
          <section className="panel">
            <div className="sec-t"><span className="badge">{sess.n}</span><h2>{sess.title}</h2><span className="note">{at ? `마지막 기록 ${ago(at)}` : '아직 기록 없음'} · {Math.round(sessionProgress(sess, d) * 100)}%</span></div>
            {d.predict && <p><b>예상</b> {d.predict} {sess.lab?.predict?.answer && <span className={'chip ' + (d.predict === sess.lab.predict.answer ? 'green' : 'gray')}>{d.predict === sess.lab.predict.answer ? '맞음' : `정답 ${sess.lab.predict.answer}`}</span>}</p>}
            {d.observe && <p style={{ marginTop: 6 }}><b>관찰</b> {d.observe}</p>}
          </section>
          {sess.record && (
            <section className="panel stack">
              <p className="quiz-q">{sess.record.title}</p>
              <RecordTable spec={sess.record} data={d} readOnly />
              {sess.record2 && <><p className="quiz-q">{sess.record2.title}</p><RecordTable spec={sess.record2} data={d} readOnly /></>}
            </section>
          )}
          {sess.calc && <section className="panel"><div className="sec-t"><h2>계산</h2><span className="note">괄호 안이 정답</span></div><Stairs items={sess.calc} data={d} readOnly showAnswers /></section>}
          {sess.think && (
            <section className="panel stack" style={{ gap: 18 }}>
              <div className="sec-t" style={{ marginBottom: 0 }}><h2>생각해요</h2><span className="note">왼쪽 학생 답, 오른쪽 예시</span></div>
              {sess.think.map((t) => (
                <div key={t.id} className="cmp">
                  <div className="stu"><Think item={t} data={d} readOnly onChange={noop} work={s.work} /></div>
                  <div className="ans"><p className="quiz-q">예시</p><p>{sampleOf(t) || '학생 경험에 따라 달라요.'}</p></div>
                </div>
              ))}
            </section>
          )}
          {sess.speech && (
            <section className="panel stack">
              <div className="sec-t" style={{ marginBottom: 0 }}><h2>1분 설명 원고</h2></div>
              {sess.speech.map((p) => (
                <div key={p.id} className="cmp">
                  <div className="stu"><b>{p.label}</b><p>{d[p.id] || '·'}</p></div>
                  <div className="ans"><b>예시</b><p>{p.sample}</p></div>
                </div>
              ))}
              <p><b>연습 시간</b> {[1, 2, 3].map((i) => d['try' + i] ? `${d['try' + i]}초` : '·').join(' → ')}</p>
              {d.peer && <p><b>친구의 한마디</b> {d.peer}</p>}
              <div><b>전문가께 물을 질문</b><ol style={{ margin: '6px 0 0', paddingLeft: 22 }}>{[0, 1, 2, 3, 4].map((i) => <li key={i}>{d['q' + i] || <span className="muted">비어 있음</span>}</li>)}</ol></div>
              <p><b>챙길 것</b> 7개 중 {[0, 1, 2, 3, 4, 5, 6].filter((i) => d['b' + i]).length}개 확인</p>
            </section>
          )}
          <section className="panel stack">
            <div className="sec-t" style={{ marginBottom: 0 }}><h2>퀴즈와 마무리</h2></div>
            {sess.quiz.map((q, i) => {
              const v = d['quiz' + i]
              return (
                <p key={i}><b>{i + 1}.</b> {q.q} → {v === undefined ? <span className="muted">안 함</span> : <span style={{ fontWeight: 700, color: v === q.answer ? 'var(--green)' : 'var(--red)' }}>{q.options[v]}{v === q.answer ? ' ○' : ` × (정답 ${q.options[q.answer]})`}</span>}</p>
              )
            })}
            <p><b>오늘의 한 줄</b> {d.oneline || <span className="muted">비어 있음</span>}</p>
            <p><b>스스로 점검</b> {sess.self.map((t, i) => `${d['self' + i] ? '★' : '☆'} ${t}`).join('   ')}</p>
          </section>
        </div>
        <aside className="stack" style={{ gap: 16, position: 'sticky', top: 84 }}>
          <FeedbackBox pin={pin} s={s} sess={sess} onDone={onDone} />
          <section className="panel">
            <div className="sec-t"><h2>이 차시에 물어볼 것</h2></div>
            <ul style={{ paddingLeft: 20, margin: 0 }} className="stack">
              {(TEACH[sess.n]?.ask || []).filter((x) => !x[2] || x[2] === s.work).map(([q, a]) => <li key={q}><b>{q}</b><br /><span className="small muted">{a}</span></li>)}
            </ul>
          </section>
          <section className="panel">
            <div className="sec-t"><h2>탐구일지</h2><span className="note">{(s.records.journal?.data?.list || []).length}쪽</span></div>
            {(s.records.journal?.data?.list || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4).map((e) => (
              <p key={e.id} className="small" style={{ marginBottom: 6 }}><b>{e.date}</b> {[e.did, e.found].filter(Boolean).join(' / ')}</p>
            ))}
          </section>
          <Manage pin={pin} s={s} onDone={onDone} />
        </aside>
      </div>
    </div>
  )
}

function Plan({ n }) {
  const T = TEACH[n]
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="sess-head">
        <span className="nbadge" style={{ background: 'var(--green)' }}>{n}</span>
        <div>
          <span className="chip green">{n}차시 지도안</span>
          <h1 style={{ marginTop: 4 }}>{SESSIONS.rain[n - 1].title}{SESSIONS.rain[n - 1].title !== SESSIONS.tape[n - 1].title && ` · ${SESSIONS.tape[n - 1].title}`}</h1>
        </div>
        <nav className="dots" aria-label="차시 고르기">{[1, 2, 3, 4, 5, 6].map((x) => <a key={x} href={`#/teacher/plan/${x}`} className={x === n ? 'on' : ''}>{x}</a>)}</nav>
      </div>
      <div className="row">
        <a className="btn" href={`#/teacher/show/rain/${n}`}>빗물 덮개 수업 화면</a>
        <a className="btn work-tape" style={{ background: 'var(--tape)' }} href={`#/teacher/show/tape/${n}`}>테이프 감개 수업 화면</a>
      </div>
      <div className="split" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <section className="panel"><div className="sec-t"><h2>목표</h2></div><ul style={{ paddingLeft: 20, margin: 0 }}>{T.goal.map((g) => <li key={g}>{g}</li>)}</ul></section>
        <section className="panel"><div className="sec-t"><h2>미리 준비</h2></div><ul style={{ paddingLeft: 20, margin: 0 }}>{T.prep.map((g) => <li key={g}>{g}</li>)}</ul></section>
      </div>
      <section className="panel">
        <div className="sec-t"><h2>40분 흐름</h2></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="plan-table">
            <thead><tr><th style={{ width: 90 }}>시간</th><th>선생님</th><th>학생</th></tr></thead>
            <tbody>{T.flow.map(([t, a, b]) => <tr key={t}><td><b>{t}</b></td><td>{a}</td><td>{b}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <div className="split" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <section className="panel"><div className="sec-t"><h2>물어볼 것과 기대하는 답</h2></div>
          <div className="stack">{T.ask.map(([q, a, w]) => <div key={q}>{w && <span className={'chip ' + w} style={{ marginRight: 6 }}>{WORKS[w].short}</span>}<b>{q}</b><p className="small" style={{ color: '#0d652d' }}>{a}</p></div>)}</div>
        </section>
        <section className="panel"><div className="sec-t"><h2>실험이 안 될 때</h2></div>
          <div className="stack">{T.trouble.map(([w, fix]) => <div key={w}><b>{w}</b><p className="small">{fix}</p></div>)}</div>
        </section>
      </div>
      {['rain', 'tape'].map((w) => {
        const s = SESSIONS[w][n - 1]
        const picks = (s.think || []).filter((t) => t.type === 'pick')
        if (!s.calc && !picks.length && !s.quiz.length) return null
        return (
          <details key={w} className={'panel work-' + w}>
            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>{WORKS[w].name} 정답 한눈에</summary>
            <div className="stack" style={{ marginTop: 14 }}>
              {s.calc && <Stairs items={s.calc} data={{}} readOnly showAnswers />}
              {picks.map((t) => <p key={t.id}><b>{t.q}</b> → {t.answer}</p>)}
              {s.quiz.map((q, i) => <p key={i}><b>퀴즈 {i + 1}.</b> {q.q} → {q.options[q.answer]}</p>)}
            </div>
          </details>
        )
      })}
    </div>
  )
}

function Show({ work, n }) {
  const w = work === 'tape' ? 'tape' : 'rain'
  const s = SESSIONS[w][Math.min(5, Math.max(0, n - 1))]
  const [open, setOpen] = useState({})
  useEffect(() => { setOpen({}) }, [w, n])
  const asks = (TEACH[s.n]?.ask || []).filter((x) => !x[2] || x[2] === w)
  return (
    <div className={'show work-' + w}>
      <div style={{ position: 'relative' }}>
        <div className="labbox" style={{ height: '100%', borderRadius: 0, boxShadow: 'none' }}>
          {s.lab ? <LabSwitch key={w + s.key} sim={s.lab.sim} work={w} speechParts={(s.speech || []).map((p) => ({ label: p.label, text: p.sample }))} /> : null}
        </div>
      </div>
      <div className="side">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="tabs" role="group" aria-label="작품">
            <button aria-pressed={w === 'rain'} onClick={() => go(`/teacher/show/rain/${s.n}`)}>빗물</button>
            <button aria-pressed={w === 'tape'} onClick={() => go(`/teacher/show/tape/${s.n}`)}>테이프</button>
          </div>
          <a className="btn ghost small" href={`#/teacher/plan/${s.n}`}>닫기</a>
        </div>
        <nav className="dots" style={{ marginLeft: 0 }} aria-label="차시">{[1, 2, 3, 4, 5, 6].map((x) => <a key={x} href={`#/teacher/show/${w}/${x}`} className={x === s.n ? 'on' : ''}>{x}</a>)}</nav>
        <div>
          <span className={'chip ' + w}>{s.n}차시 · {WORKS[w].name}</span>
          <h1 className="display" style={{ fontSize: '2em', marginTop: 6 }}>{s.title}</h1>
        </div>
        <div className="talk"><img src={`/icons/mascot-${w}-think.svg`} alt="" /><p className="bubble">{s.bubble}</p></div>
        <p style={{ fontWeight: 700 }}>{s.mission}</p>
        {s.lab?.predict && (
          <div className="predict">
            <p className="quiz-q">{s.lab.predict.q}</p>
            <div className="picks">{s.lab.predict.options.map((o) => <span key={o} className="pick" style={{ display: 'inline-flex', alignItems: 'center' }}>{o}</span>)}</div>
          </div>
        )}
        {s.lab && <ol style={{ paddingLeft: 22, margin: 0 }}>{s.lab.guide.map((g) => <li key={g}>{g}</li>)}</ol>}
        <div className="stack" style={{ gap: 8 }}>
          {asks.map(([q, a], i) => (
            <button key={q} onClick={() => setOpen({ ...open, [i]: !open[i] })} aria-expanded={!!open[i]}
              style={{ textAlign: 'left', border: '1.5px solid var(--line)', borderRadius: 16, padding: '12px 16px', background: open[i] ? 'var(--green-soft)' : '#fff' }}>
              <b>{q}</b>{open[i] && <span style={{ display: 'block', color: '#0d652d', marginTop: 4 }}>{a}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Settings({ pin, onPin }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [msg, setMsg] = useState('')
  const ok = a.length >= 4 && a === b
  const save = async () => {
    try { await api.teacher.setPin(pin, a); keepPin(a); onPin(a); setA(''); setB(''); setMsg('바꿨어요. 다음부터 새 비밀번호로 열어요.') } catch (e) { setMsg(tmsg(e)) }
  }
  return (
    <div className="stack" style={{ maxWidth: 720, gap: 16 }}>
      <h1 className="display" style={{ fontSize: '1.7em' }}>설정</h1>
      <section className="panel stack">
        <div className="sec-t" style={{ marginBottom: 0 }}><h2>선생님 비밀번호 바꾸기</h2></div>
        <input className="field" type="password" inputMode="numeric" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="새 비밀번호(숫자 4~12자리)" aria-label="새 비밀번호" />
        <input className="field" type="password" inputMode="numeric" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="한 번 더" aria-label="새 비밀번호 확인" />
        {b && a !== b && <p className="small" style={{ color: 'var(--red)' }}>두 번 적은 숫자가 달라요.</p>}
        <button className="btn" disabled={!ok} onClick={save} style={{ alignSelf: 'flex-start' }}>바꾸기</button>
        {msg && <p className="fb ok" role="status">{msg}</p>}
      </section>
      <section className="panel stack">
        <div className="sec-t" style={{ marginBottom: 0 }}><h2>기록은 어디에 있나요</h2></div>
        <p>학생 기록은 수파베이스 maeumbit 프로젝트의 inv_로 시작하는 표에 저장돼요. 학생 비밀번호와 선생님 비밀번호는 암호로 바꿔 저장하고, 앱은 표를 직접 읽지 못하고 비밀번호를 확인하는 함수로만 기록을 주고받아요.</p>
        <p>인터넷이 끊겨도 학생 태블릿에 먼저 저장되고, 다시 연결되면 자동으로 올라가요.</p>
        <p>대회가 끝나면 학생 화면에서 ‘이 학생 지우기’로 기록을 정리할 수 있어요.</p>
      </section>
    </div>
  )
}

export default function Teacher({ route }) {
  const [pin, setPin] = useState(getPin)
  const [students, setStudents] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const lock = () => { keepPin(null); setPin(null); setStudents(null) }
  const load = useCallback(async () => {
    if (!pin) return
    setBusy(true)
    try { setStudents(await api.teacher.overview(pin)); setErr('') } catch (e) {
      if (e.code === 'BAD_PIN' || e.code === 'LOCKED') lock()
      setErr(tmsg(e))
    }
    setBusy(false)
  }, [pin]) // eslint-disable-line
  useEffect(() => { if (pin && students === null) load() }, [pin]) // eslint-disable-line
  useEffect(() => {
    if (!pin) return
    const id = setInterval(() => { if (document.visibilityState === 'visible') load() }, 30000)
    return () => clearInterval(id)
  }, [pin, load])

  if (!pin) return <Login onOk={(p, r) => { setPin(p); setStudents(r) }} />
  const tab = route[0] || ''
  if (tab === 'show') return <Show work={route[1]} n={+route[2] || 1} />
  let page
  if (tab === 's') page = <Detail pin={pin} s={(students || []).find((x) => x.id === route[1])} n={+route[2] || 1} onDone={load} />
  else if (tab === 'plan') page = <Plan n={Math.min(6, Math.max(1, +route[1] || 1))} />
  else if (tab === 'settings') page = <Settings pin={pin} onPin={setPin} />
  else page = <Dashboard students={students} />
  return (
    <>
      <Bar tab={tab === 's' ? '' : tab} onLock={lock} onRefresh={load} busy={busy} />
      <main className="main">
        {err && <p className="fb no" role="alert" style={{ marginBottom: 16 }}>{err}</p>}
        {tab === 's' && students === null ? <p className="panel muted">불러오는 중이에요.</p> : page}
      </main>
    </>
  )
}
