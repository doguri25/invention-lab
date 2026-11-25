import { useState } from 'react'
import { useApp } from '../lib/store'
import { SESSIONS, WORKS } from '../data/content'
import { Section, RecordTable, Stairs, Think } from '../components/ui'
import { Create } from '../components/extra'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const kdate = (s) => {
  const d = new Date(s + 'T00:00:00')
  if (isNaN(d)) return s
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`
}
const FIELDS = [['did', '오늘 한 일', '무엇을 만들고, 무엇을 재었나요?'], ['found', '알게 된 것', '숫자가 있으면 숫자로 적어요'], ['next', '궁금한 점과 다음에 할 일', '예상과 다른 점이 있었나요?']]

function Entry({ e, onSave, onDel }) {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState(e)
  const [ask, setAsk] = useState(false)
  if (edit) {
    return (
      <article className="panel" style={{ border: '2px solid var(--pt)' }}>
        <input type="date" className="field" style={{ maxWidth: 220 }} value={v.date} onChange={(x) => setV({ ...v, date: x.target.value })} aria-label="날짜" />
        {FIELDS.map(([k, l]) => (
          <label key={k} className="stack" style={{ gap: 6, marginTop: 12 }}><b>{l}</b>
            <textarea className="field" style={{ minHeight: 70 }} value={v[k] || ''} onChange={(x) => setV({ ...v, [k]: x.target.value })} />
          </label>
        ))}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={() => { onSave(v); setEdit(false) }}>고친 내용 저장</button>
          <button className="btn ghost small" onClick={() => { setV(e); setEdit(false) }}>그만두기</button>
        </div>
      </article>
    )
  }
  return (
    <article className="panel" style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', gap: 18 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="display" style={{ fontSize: '2.2em', lineHeight: 1, color: 'var(--p)' }}>{new Date(e.date + 'T00:00:00').getDate() || '·'}</div>
        <div className="small muted">{kdate(e.date)}</div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {FIELDS.map(([k, l]) => e[k] ? <p key={k}><b style={{ color: 'var(--pd)', marginRight: 8 }}>{l}</b>{e[k]}</p> : null)}
        <div className="row no-print" style={{ gap: 8 }}>
          <button className="btn ghost small" onClick={() => setEdit(true)}>고치기</button>
          {ask
            ? <><span className="small" style={{ color: 'var(--red)', fontWeight: 700 }}>이 날의 일지를 지울까요?</span><button className="btn small" style={{ background: 'var(--red)' }} onClick={onDel}>지우기</button><button className="btn ghost small" onClick={() => setAsk(false)}>남겨 두기</button></>
            : <button className="btn ghost small" onClick={() => setAsk(true)} style={{ color: 'var(--sub)' }}>지우기</button>}
        </div>
      </div>
    </article>
  )
}

function Summary({ work, records }) {
  return (
    <div className="stack" style={{ gap: 16 }}>
      {SESSIONS[work].map((s) => {
        const d = records[s.key] || {}
        const any = Object.keys(d).some((k) => k !== '_at')
        return (
          <section key={s.key} className="panel" style={{ breakInside: 'avoid' }}>
            <div className="sec-t"><span className="badge">{s.n}</span><h2>{s.title}</h2>{!any && <span className="note">아직 기록이 없어요</span>}</div>
            {any && (
              <div className="stack" style={{ gap: 14 }}>
                {d.predict && <p><b>예상</b> {d.predict}{d.observe ? ` → ${d.observe}` : ''}</p>}
                {s.record && <><p className="quiz-q">{s.record.title}</p><RecordTable spec={s.record} data={d} readOnly /></>}
                {s.record2 && <><p className="quiz-q">{s.record2.title}</p><RecordTable spec={s.record2} data={d} readOnly /></>}
                {s.calc && <Stairs items={s.calc} data={d} readOnly />}
                {(s.think || []).map((t) => <Think key={t.id} item={t} data={d} readOnly onChange={() => {}} work={work} />)}
                {s.create && (s.create.items.some((it) => d[it.id] || d[it.id + '_0'] || (records['k' + s.n] || {})[it.id])) && (
                  <div><p className="quiz-q">창의 활동: {s.create.title}</p><Create spec={s.create} data={d} set={() => {}} sk={records['k' + s.n] || {}} setSk={() => {}} readOnly /></div>
                )}
                {d.recap && <p><b style={{ color: 'var(--pd)' }}>가장 기억에 남는 실험</b> {d.recap}</p>}
                {(s.speech || []).map((p) => d[p.id] ? <p key={p.id}><b style={{ color: 'var(--pd)' }}>{p.label}</b> {d[p.id]}</p> : null)}
                {d.oneline && <p className="fb ok"><b>오늘의 한 줄</b> {d.oneline}</p>}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export default function Journal() {
  const user = useApp((s) => s.user)
  const records = useApp((s) => s.records)
  const setField = useApp((s) => s.setField)
  const list = (records.journal && records.journal.list) || []
  // 쓰다 만 일지도 저장해 둔다(다른 화면에 다녀와도, 앱을 닫아도 남는다)
  const draft = { date: today(), did: '', found: '', next: '', ...((records.journal && records.journal.draft) || {}) }
  const setDraft = (v) => setField('journal', 'draft', v)
  const [tab, setTab] = useState('days')
  const save = (l) => setField('journal', 'list', l)
  const add = () => {
    if (!draft.did.trim() && !draft.found.trim()) return
    save([{ ...draft, id: Date.now().toString(36) }, ...list])
    setDraft({ date: today(), did: '', found: '', next: '' })
  }
  const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : -1))
  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }} className="stack">
      <div className="row no-print" style={{ justifyContent: 'space-between' }}>
        <h1 className="display" style={{ fontSize: '1.9em' }}>탐구일지</h1>
        <div className="tabs" role="group" aria-label="보기">
          <button aria-pressed={tab === 'days'} onClick={() => setTab('days')}>날짜별 일지</button>
          <button aria-pressed={tab === 'all'} onClick={() => setTab('all')}>모든 기록 모아 보기</button>
        </div>
      </div>
      {tab === 'days' ? (
        <>
          <Section n="✎" title="오늘의 일지" note="대회에서는 날짜별 기록이 내가 탐구했다는 증거가 돼요">
            <input type="date" className="field" style={{ maxWidth: 220 }} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} aria-label="날짜" />
            {FIELDS.map(([k, l, ph]) => (
              <label key={k} className="stack" style={{ gap: 6, marginTop: 12 }}><b>{l}</b>
                <textarea className="field" style={{ minHeight: 76 }} placeholder={ph} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
              </label>
            ))}
            {(draft.did || draft.found || draft.next) && <p className="small muted" style={{ marginTop: 10 }}>쓰던 글은 저절로 남아 있어요. 다 쓰면 「일지에 넣기」를 눌러요.</p>}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={add} disabled={!draft.did.trim() && !draft.found.trim()}>일지에 넣기</button>
              <span className="small muted">사진은 태블릿 사진첩에 같은 날짜로 남겨 두어요.</span>
            </div>
          </Section>
          {sorted.length === 0
            ? <p className="panel muted" style={{ textAlign: 'center' }}>첫 일지를 써 볼까요? 위 칸에 오늘 한 일을 적고 ‘일지에 넣기’를 눌러요.</p>
            : sorted.map((e) => <Entry key={e.id} e={e} onSave={(v) => save(list.map((x) => (x.id === e.id ? v : x)))} onDel={() => save(list.filter((x) => x.id !== e.id))} />)}
        </>
      ) : (
        <>
          <div className="panel row no-print" style={{ justifyContent: 'space-between' }}>
            <p><b>{user.name}</b> · {WORKS[user.work].name}의 여섯 차시 기록이에요. 종이로 뽑아 대회에 가져가요.</p>
            <button className="btn" onClick={() => window.print()}>인쇄하기</button>
          </div>
          <h1 className="display" style={{ display: 'none' }}>{user.name} 탐구 기록</h1>
          <Summary work={user.work} records={records} />
          {sorted.length > 0 && (
            <section className="panel">
              <div className="sec-t"><h2>날짜별 일지</h2></div>
              <div className="stack">{[...sorted].reverse().map((e) => (
                <p key={e.id}><b style={{ color: 'var(--pd)' }}>{kdate(e.date)}</b> {[e.did, e.found, e.next].filter(Boolean).join(' / ')}</p>
              ))}</div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
