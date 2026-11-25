import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import { SESSIONS, WORKS, GLOSSARY } from '../data/content'
import { TEACH, GUIDE, pick, tagOf } from '../data/guide'
import { sessionProgress } from '../lib/progress'
import { go } from '../lib/router'
import { RecordTable, Stairs, Think, Callout } from '../components/ui'
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
  const L = [['', '학생 현황'], ['plan/1', '차시 지도안'], ['guide', '지도 길잡이'], ['show/rain/1', '수업 화면'], ['settings', '설정']]
  return (
    <header className="topbar t-bar no-print">
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
                    <div className="stack" style={{ gap: 2, alignItems: 'flex-start', minWidth: 0 }}><b className="display" style={{ fontSize: '1.35em' }}>{s.name}</b><span className={'chip ' + s.work}>{WORKS[s.work].short}</span></div>
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
              {pick(TEACH[sess.n]?.ask, s.work).map(([q, a]) => <li key={q}><b>{q}</b><span className="small muted ans-line">{a}</span></li>)}
            </ul>
          </section>
          <section className="panel">
            <div className="sec-t"><h2>평가 기준</h2><a className="note" href={`#/teacher/plan/${sess.n}`}>지도안 보기</a></div>
            <div className="rubric-mini">
              {pick(TEACH[sess.n]?.assess, s.work).map((r) => (
                <div key={r[0]}><b>{r[0]}</b><p><span className="lv lv1">잘함</span>{r[1]}</p><p><span className="lv lv2">보통</span>{r[2]}</p><p><span className="lv lv3">노력</span>{r[3]}</p></div>
              ))}
            </div>
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

const WN = { rain: '빗물', tape: '테이프' }
function Tag({ x }) {
  const w = tagOf(x)
  return w ? <span className={'chip ' + w + ' tag'}>{WN[w]}</span> : null
}
const txt = (x) => (Array.isArray(x) ? x[0] : x)

function SecT({ id, title, note }) {
  return <div className="sec-t" id={id}><h2>{title}</h2>{note && <span className="note">{note}</span>}</div>
}

function Science({ items }) {
  return (
    <div className="sci-list">
      {items.map((c, i) => (
        <article className="sci" key={c.t + i}>
          {c.img && <div className="sci-img"><img src={c.img} alt="" loading="lazy" /></div>}
          <div>
            <h3>{c.w && <span className={'chip ' + c.w + ' tag'}>{WN[c.w]}</span>}{c.t}</h3>
            <p>{c.d}</p>
            {c.list && <>{c.listTitle && <b className="sci-lt">{c.listTitle}</b>}<ul>{c.list.map((l) => <li key={l}>{l}</li>)}</ul></>}
            {c.table && (
              <div className="tbl-wrap"><table className="plan-table">
                <thead><tr>{c.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{c.table.rows.map((r) => <tr key={r[0]}>{r.map((v, j) => <td key={j}>{j === 0 ? <b>{v}</b> : v}</td>)}</tr>)}</tbody>
              </table></div>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function AnswerKey({ n, work }) {
  const works = work === 'all' ? ['rain', 'tape'] : [work]
  return (
    <div className="stack" style={{ gap: 18 }}>
      {works.map((w) => {
        const s = SESSIONS[w][n - 1]
        const thinks = (s.think || []).filter((t) => t.type !== 'table')
        return (
          <div key={w} className={'work-' + w + ' key-block'}>
            {works.length > 1 && <b className="key-t"><span className={'chip ' + w}>{WORKS[w].name}</span></b>}
            {s.lab?.predict && <p><b>3D 예상하기</b> {s.lab.predict.q} → <b className="ok-t">{s.lab.predict.answer}</b></p>}
            {s.calc && <><b>계산 계단</b><Stairs items={s.calc} data={{}} readOnly showAnswers /></>}
            {thinks.length > 0 && (
              <div className="tbl-wrap"><table className="plan-table">
                <thead><tr><th>생각해요</th><th>예시 답</th></tr></thead>
                <tbody>{thinks.map((t) => <tr key={t.id}><td>{t.q}</td><td>{sampleOf(t) || '학생 경험에 따라 달라요.'}</td></tr>)}</tbody>
              </table></div>
            )}
            <div className="tbl-wrap"><table className="plan-table">
              <thead><tr><th>퀴즈</th><th>정답</th></tr></thead>
              <tbody>{s.quiz.map((q, i) => <tr key={i}><td>{i + 1}. {q.q}</td><td><b className="ok-t" style={{ display: 'block' }}>{q.options[q.answer]}</b><span className="small muted">{q.why}</span></td></tr>)}</tbody>
            </table></div>
          </div>
        )
      })}
    </div>
  )
}

function Plan({ n }) {
  const T = TEACH[n]
  const both = n >= 3 && n <= 5
  const [work, setWork] = useState('all')
  useEffect(() => { setWork('all') }, [n])
  const f = (arr) => pick(arr, work)
  const sciences = (T.science || []).filter((c) => work === 'all' || !c.w || c.w === work)
  const notes = (T.notes || []).filter((c) => work === 'all' || !c.w || c.w === work)
  const toc = [['p-goal', '목표'], ['p-prep', '준비'], ['p-flow', '40분 흐름'], ['p-talk', '이렇게 말해요'], ['p-ask', '발문'], ['p-sci', '과학 배경'], ['p-trouble', '안 될 때'], ['p-key', '정답'], ['p-assess', '평가'], ['p-diff', '수준별 지도']]
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <div className="stack plan" style={{ gap: 16 }}>
      <div className="sess-head">
        <span className="nbadge" style={{ background: 'var(--green)' }}>{n}</span>
        <div className="sess-title">
          <span className="chip green">{n}차시 지도안 · {T.when} · 40분</span>
          <h1>{T.title}</h1>
        </div>
        <nav className="dots" aria-label="차시 고르기">{[1, 2, 3, 4, 5, 6].map((x) => <a key={x} href={`#/teacher/plan/${x}`} className={x === n ? 'on' : ''} aria-current={x === n ? 'page' : undefined}>{x}</a>)}</nav>
      </div>
      <div className="plan-bar no-print">
        {both ? (
          <div className="tabs" role="group" aria-label="작품 고르기">
            <button aria-pressed={work === 'all'} onClick={() => setWork('all')}>두 작품 모두</button>
            <button aria-pressed={work === 'rain'} onClick={() => setWork('rain')}>빗물 덮개</button>
            <button aria-pressed={work === 'tape'} onClick={() => setWork('tape')}>테이프 감개</button>
          </div>
        ) : <span className="chip green">두 작품 함께 하는 차시</span>}
        <span className="grow" />
        <a className="btn small" href={`#/teacher/show/${work === 'tape' ? 'tape' : 'rain'}/${n}`}>수업 화면 열기</a>
        <button className="btn ghost small" onClick={() => window.print()}>인쇄</button>
      </div>
      <nav className="jump no-print" aria-label="지도안 바로 가기">{toc.map(([id, l]) => <button key={id} type="button" onClick={() => jump(id)}>{l}</button>)}</nav>

      <section className="panel">
        <SecT id="p-goal" title="지도 의도와 목표" />
        <p className="lead">{T.why}</p>
        <ul className="check-list">{f(T.goal).map((g) => <li key={txt(g)}><Tag x={g} />{txt(g)}</li>)}</ul>
      </section>

      <div className="grid-2">
        <section className="panel">
          <SecT id="p-prep" title="전날 준비" />
          <ul>{f(T.prep).map((g) => <li key={txt(g)}><Tag x={g} />{txt(g)}</li>)}</ul>
          <Callout tone="safe" title="안전" items={f(T.safety).map(txt)} />
        </section>
        <section className="panel">
          <SecT title="준비물" note="학생 2명 기준" />
          <div className="tbl-wrap"><table className="plan-table">
            <thead><tr><th>품목</th><th>수량</th><th>비고</th></tr></thead>
            <tbody>{f(T.materials).map((r) => <tr key={r[0] + r[3]}><td><Tag x={r} />{r[0]}</td><td className="nw">{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
          </table></div>
        </section>
      </div>

      <section className="panel">
        <SecT id="p-flow" title="40분 흐름" note={both ? '35분은 작품별로, 마지막 5분은 함께' : ''} />
        <div className="tbl-wrap"><table className="plan-table flow">
          <thead><tr><th style={{ width: 92 }}>시간</th><th>선생님</th><th>학생</th></tr></thead>
          <tbody>{f(T.flow).map((r, i) => <tr key={i}><td className="nw"><b style={{ display: 'block' }}>{r[0]}</b><Tag x={r} /></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="panel">
        <SecT id="p-talk" title="학생에게는 이렇게" note="선생님이 그대로 읽어도 되는 말" />
        <div className="stack">{f(T.talk).map((t) => <blockquote key={txt(t)} className="talk-q"><Tag x={t} />{txt(t)}</blockquote>)}</div>
      </section>

      <section className="panel">
        <SecT id="p-ask" title="발문과 기대하는 답" />
        <div className="qa-list">{f(T.ask).map((r, i) => (
          <details key={i} className="qa">
            <summary><Tag x={r} />{r[0]}</summary>
            <p>{r[1]}</p>
          </details>
        ))}</div>
      </section>

      <section className="panel">
        <SecT id="p-sci" title="과학 원리 배경" note="학생 질문에 답하고 결과를 해석할 때" />
        <Science items={sciences} />
        {notes.map((c) => <Callout key={c.t} tone="info" title={c.t}><p>{c.d}</p></Callout>)}
      </section>

      <section className="panel">
        <SecT id="p-trouble" title="실험이 안 될 때" />
        <div className="tbl-wrap"><table className="plan-table">
          <thead><tr><th>이럴 때</th><th>흔한 까닭</th><th>이렇게 해 보세요</th></tr></thead>
          <tbody>{f(T.trouble).map((r) => <tr key={r[0]}><td><Tag x={r} /><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="panel">
        <SecT id="p-key" title="정답과 예시 답" note="실험값은 학생 결과를 그대로 인정" />
        <AnswerKey n={n} work={both ? work : 'rain'} />
      </section>

      <section className="panel">
        <SecT id="p-assess" title="평가 기준" note="관찰과 앱 기록으로 확인" />
        <div className="tbl-wrap"><table className="plan-table rubric">
          <thead><tr><th>보는 것</th><th>잘함</th><th>보통</th><th>노력 필요</th></tr></thead>
          <tbody>{f(T.assess).map((r) => <tr key={r[0] + (tagOf(r) || '')}><td><Tag x={r} /><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>)}</tbody>
        </table></div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <SecT id="p-diff" title="도움이 필요할 때" />
          <ul>{f(T.diff.help).map((g) => <li key={txt(g)}><Tag x={g} />{txt(g)}</li>)}</ul>
        </section>
        <section className="panel">
          <SecT title="더 나아가기" />
          <ul>{f(T.diff.more).map((g) => <li key={txt(g)}><Tag x={g} />{txt(g)}</li>)}</ul>
        </section>
      </div>

      <section className="panel">
        <SecT title="탐구일지에 남길 것" />
        <ul className="check-list">{T.journal.map((g) => <li key={g}>{g}</li>)}</ul>
      </section>
    </div>
  )
}

function Guide() {
  const toc = [['g-over', '대회 한눈에'], ['g-app', '앱 쓰는 법'], ['g-works', '두 작품 이해'], ['g-expert', '전문가 지도 날'], ['g-mb', '마이크로비트'], ['g-caution', '주의할 점'], ['g-mat', '준비물 전체'], ['g-words', '어려운 말 풀이']]
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const G = GUIDE
  return (
    <div className="guide-wrap">
      <nav className="guide-toc no-print" aria-label="지도 길잡이 목차">
        <b>지도 길잡이</b>
        {toc.map(([id, l]) => <button key={id} type="button" onClick={() => jump(id)}>{l}</button>)}
        <button type="button" className="btn ghost small" onClick={() => window.print()} style={{ marginTop: 8 }}>인쇄</button>
      </nav>
      <div className="stack" style={{ gap: 16, minWidth: 0 }}>
        <section className="panel">
          <SecT id="g-over" title="대회 한눈에 보기" />
          <div className="tbl-wrap"><table className="plan-table">
            <thead><tr><th>날짜</th><th>하는 일</th><th>지도와 관련된 점</th></tr></thead>
            <tbody>{G.schedule.map((r) => <tr key={r[0]}><td className="nw"><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
          </table></div>
          <h3 className="h3">본심사 기준</h3>
          <div className="criteria">{G.criteria.map(([k, v, d]) => (
            <div key={k} className="crit"><div className="crit-top"><b>{k}</b><span>{v}점</span></div><div className="crit-bar"><i style={{ width: v + '%' }} /></div><p>{d}</p></div>
          ))}</div>
          <p className="lead" style={{ marginTop: 12 }}>{G.criteriaNote}</p>
          <h3 className="h3">12월 12일까지 학생이 할 수 있어야 할 것</h3>
          <ul className="check-list">{G.goals.map((g) => <li key={g}>{g}</li>)}</ul>
          <h3 className="h3">여섯 차시 계획</h3>
          <div className="tbl-wrap"><table className="plan-table">
            <thead><tr><th>차시</th><th>때</th><th>함께 하는 것</th><th>빗물 건조망 덮개</th><th>테이프 감개</th></tr></thead>
            <tbody>{G.plan.map((r) => <tr key={r[0]}><td><a href={`#/teacher/plan/${r[0]}`} className="nlink">{r[0]}</a></td><td className="nw">{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td></tr>)}</tbody>
          </table></div>
          <p className="small muted" style={{ marginTop: 8 }}>{G.planNote}</p>
        </section>

        <section className="panel">
          <SecT id="g-app" title="이 앱을 수업에 쓰는 법" />
          <div className="kv-list">{G.app.map(([k, v]) => <div key={k}><b>{k}</b><p>{v}</p></div>)}</div>
        </section>

        <section className="panel">
          <SecT id="g-works" title="두 작품 이해하기" note="숫자는 계획서 값이고 계산으로 예상한 값" />
          {['rain', 'tape'].map((w) => (
            <div key={w} className={'work-' + w + ' work-block'}>
              <h3 className="h3"><span className={'chip ' + w}>{WORKS[w].name}</span></h3>
              <p className="lead">{G.works[w].one}</p>
              <div className="fig-row">{G.works[w].figs.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}</div>
              <div className="tbl-wrap"><table className="plan-table">
                <thead><tr><th>숫자</th><th>어디서 나왔나</th></tr></thead>
                <tbody>{G.works[w].numbers.map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td></tr>)}</tbody>
              </table></div>
            </div>
          ))}
          <h3 className="h3">왜 물 무게로 힘을 잴까</h3>
          <div className="kv-list">{G.works.water.map(([k, v, w]) => <div key={k}><b><span className={'chip ' + w}>{k}</span></b><p>{v}</p></div>)}</div>
          <p className="small muted">과학에서 힘의 단위는 N(뉴턴)이고, 물 100 g의 무게가 약 1 N입니다.</p>
        </section>

        <section className="panel">
          <SecT id="g-expert" title="전문가 지도 날" />
          <p className="lead">{G.expert.when}</p>
          <div className="grid-2 inner">
            <div><h3 className="h3">챙길 것</h3><ul className="check-list">{G.expert.bring.map((g) => <li key={g}>{g}</li>)}</ul></div>
            <div><h3 className="h3">그날 학생이 할 일</h3><ol>{G.expert.todo.map((g) => <li key={g}>{g}</li>)}</ol></div>
          </div>
          <h3 className="h3">질문 예시</h3>
          <div className="grid-2 inner">
            {['rain', 'tape'].map((w) => <div key={w}><b className="sub-t"><span className={'chip ' + w}>{WORKS[w].name}</span></b><ul>{G.expert.questions[w].map((q) => <li key={q}>{q}</li>)}</ul></div>)}
          </div>
          <h3 className="h3">지도가 끝난 뒤</h3>
          <ul>{G.expert.after.map((g) => <li key={g}>{g}</li>)}</ul>
        </section>

        <section className="panel">
          <SecT id="g-mb" title="마이크로비트 도입 계획" note="전문가 지도 뒤, 빗물 덮개만" />
          <p className="lead">{G.microbit.intro}</p>
          <h3 className="h3">쓰는 곳</h3>
          <ul>{G.microbit.uses.map((g) => <li key={g}>{g}</li>)}</ul>
          <h3 className="h3">살 것</h3>
          <div className="tbl-wrap"><table className="plan-table">
            <thead><tr><th>품목</th><th>수량</th><th>가격</th><th>비고</th></tr></thead>
            <tbody>{G.microbit.buy.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className="nw">{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>)}</tbody>
          </table></div>
          <h3 className="h3">배우는 순서</h3>
          <div className="tbl-wrap"><table className="plan-table">
            <thead><tr><th style={{ width: 90 }}>회</th><th>배울 것</th></tr></thead>
            <tbody>{G.microbit.steps.map((r) => <tr key={r[0]}><td className="nw"><b>{r[0]}</b></td><td>{r[1]}</td></tr>)}</tbody>
          </table></div>
          <p className="small muted" style={{ marginTop: 8 }}>{G.microbit.note}</p>
        </section>

        <section className="panel">
          <SecT id="g-caution" title="지도할 때 주의할 점" />
          <ul className="caution-list">{G.cautions.map((g) => <li key={g}>{g}</li>)}</ul>
        </section>

        <section className="panel">
          <SecT id="g-mat" title="준비물 전체 목록" />
          <div className="tbl-wrap"><table className="plan-table">
            <thead><tr><th>품목</th><th>쓰는 차시</th><th>수량</th><th>작품</th></tr></thead>
            <tbody>{G.materials.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className="nw">{r[1]}</td><td>{r[2]}</td><td>{r[3] && <span className={'chip ' + (r[3] === '빗물' ? 'rain' : 'tape')}>{r[3]}</span>}</td></tr>)}</tbody>
          </table></div>
        </section>

        <section className="panel">
          <SecT id="g-words" title="계획서의 어려운 말 풀이" note="학생 낱말 사전과 같은 내용" />
          <WordsTable />
          <h3 className="h3">참고한 자료</h3>
          <ul className="small">{G.refs.map((g) => <li key={g}>{g}</li>)}</ul>
        </section>
      </div>
    </div>
  )
}

function WordsTable() {
  const rows = GLOSSARY
  return (
    <div className="tbl-wrap"><table className="plan-table">
      <thead><tr><th>작품</th><th>낱말</th><th>학생에게 이렇게 설명</th><th>차시</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r[1]}><td><span className={'chip ' + (r[0] === '빗물' ? 'rain' : r[0] === '테이프' ? 'tape' : 'green')}>{r[0]}</span></td><td className="nw"><b>{r[1]}</b></td><td>{r[2]}</td><td className="nw">{r[3]}</td></tr>)}</tbody>
    </table></div>
  )
}

function Show({ work, n }) {
  const w = work === 'tape' ? 'tape' : 'rain'
  const s = SESSIONS[w][Math.min(5, Math.max(0, n - 1))]
  const [open, setOpen] = useState({})
  useEffect(() => { setOpen({}) }, [w, n])
  const asks = pick(TEACH[s.n]?.ask, w)
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
  else if (tab === 'guide') page = <Guide />
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
