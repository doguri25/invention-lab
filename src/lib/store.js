import { create } from 'zustand'
import { api } from './api'

const LS = 'invlab.v1'
const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { /* 저장 불가 환경 */ } }

const prefs0 = { size: 1, motion: true, help: {}, ...read(LS + '.prefs', {}) }
const user0 = read(LS + '.user', null)
const last0 = user0 ? read(LS + '.last.' + user0.name, null) : null
const cache0 = user0 ? read(LS + '.rec.' + user0.name, { records: {}, dirty: {} }) : { records: {}, dirty: {} }

const timers = {}

export const useApp = create((set, get) => ({
  user: user0, // {name, pin, work}
  records: cache0.records || {},
  dirty: cache0.dirty || {},
  feedback: {},
  sync: 'idle', // idle | saving | saved | offline | error
  syncMsg: '',
  syncCode: '',
  last: last0, // 마지막으로 하던 곳 {n, sec, at}
  prefs: prefs0,
  teacherPin: null,

  setPrefs(p) { const prefs = { ...get().prefs, ...p }; write(LS + '.prefs', prefs); set({ prefs }) },

  async login(name, work, pin) {
    const s = await api.join(name, work, pin)
    const user = { name: s.name, work: s.work, pin }
    write(LS + '.user', user)
    const cache = read(LS + '.rec.' + s.name, { records: {}, dirty: {} })
    set({ user, records: cache.records || {}, dirty: cache.dirty || {}, last: read(LS + '.last.' + s.name, null), syncCode: '' })
    await get().pull()
    return user
  },

  logout() {
    try { localStorage.removeItem(LS + '.user') } catch (e) { /* 무시 */ }
    set({ user: null, records: {}, dirty: {}, feedback: {}, sync: 'idle', syncCode: '', last: null })
  },

  // 인터넷이 없을 때: 이 기기에만 먼저 기록하고, 연결되면 서버에 등록
  startOffline(name, work, pin) {
    const user = { name: name.trim(), work, pin }
    write(LS + '.user', user)
    const cache = read(LS + '.rec.' + user.name, { records: {}, dirty: {} })
    set({ user, records: cache.records || {}, dirty: cache.dirty || {}, sync: 'offline', last: read(LS + '.last.' + user.name, null) })
  },

  async pull() {
    const { user } = get()
    if (!user) return
    try {
      let r
      try { r = await api.load(user.name, user.pin) } catch (e) {
        if (e.code !== 'NO_STUDENT') throw e
        await api.join(user.name, user.work, user.pin)
        r = await api.load(user.name, user.pin)
      }
      const dirty = get().dirty
      // 이 기기에서 아직 못 보낸 기록은 지키고, 나머지는 서버 것으로
      const merged = { ...r.records }
      Object.keys(dirty).forEach((k) => { if (dirty[k]) merged[k] = get().records[k] })
      set({ records: merged, feedback: r.feedback || {}, sync: 'saved', syncCode: '', syncMsg: '' })
      write(LS + '.rec.' + user.name, { records: merged, dirty })
      Object.keys(dirty).forEach((k) => dirty[k] && get().flush(k))
    } catch (e) {
      set({ sync: e.code === 'OFFLINE' ? 'offline' : 'error', syncMsg: e.message, syncCode: e.code })
    }
  },

  // 선생님이 비밀번호를 바꿔 준 뒤 새 숫자로 다시 잇기. 이 기기에 남은 기록은 그대로 올라간다.
  async relogin(pin) {
    const user = { ...get().user, pin }
    write(LS + '.user', user)
    set({ user, syncCode: '', syncMsg: '' })
    await get().pull()
  },

  // 아직 못 보낸 기록을 다시 보낸다
  retryDirty() {
    const { dirty, syncCode } = get()
    if (syncCode === 'BAD_PIN' || syncCode === 'LOCKED') return
    Object.keys(dirty).forEach((k) => dirty[k] && get().flush(k))
  },

  // 화면을 닫는 순간: 기다리던 저장을 바로 보낸다
  flushNow() {
    const { dirty, user, records } = get()
    if (!user) return
    Object.keys(dirty).forEach((k) => {
      if (!dirty[k]) return
      clearTimeout(timers[k])
      const sent = records[k]
      api.save(user.name, user.pin, k, sent || {}, true).then(() => {
        if (get().records[k] !== sent) return // 보내는 사이에 더 적었으면 다음 저장에 맡긴다
        const nd = { ...get().dirty, [k]: false }
        set({ dirty: nd }); write(LS + '.rec.' + user.name, { records: get().records, dirty: nd })
      }).catch(() => {})
    })
  },

  setLast(n, sec) {
    const { user, last } = get()
    if (!user || (last && last.n === n && last.sec === sec)) return
    const v = { n, sec, at: Date.now() }
    write(LS + '.last.' + user.name, v)
    set({ last: v })
  },

  setField(key, field, value) {
    const { records, dirty, user } = get()
    const rec = { ...(records[key] || {}), [field]: value, _at: Date.now() }
    const next = { ...records, [key]: rec }
    const nd = { ...dirty, [key]: true }
    set({ records: next, dirty: nd, sync: 'saving' })
    if (user) write(LS + '.rec.' + user.name, { records: next, dirty: nd })
    clearTimeout(timers[key])
    timers[key] = setTimeout(() => get().flush(key), 900)
  },

  async flush(key) {
    const { user, records } = get()
    if (!user) return
    const sent = records[key]
    try {
      await api.save(user.name, user.pin, key, sent || {})
      // 보내는 사이에 더 적었으면 아직 못 보낸 것으로 남겨 둔다(다음 저장이 이어서 보낸다)
      if (get().records[key] !== sent) { set({ syncMsg: '', syncCode: '' }); return }
      const nd = { ...get().dirty, [key]: false }
      const left = Object.values(nd).some(Boolean)
      set({ dirty: nd, sync: left ? get().sync : 'saved', syncMsg: '', syncCode: '' })
      write(LS + '.rec.' + user.name, { records: get().records, dirty: nd })
    } catch (e) {
      set({ sync: e.code === 'OFFLINE' ? 'offline' : 'error', syncMsg: e.message, syncCode: e.code })
    }
  },

  setTeacherPin(p) { set({ teacherPin: p }) },
}))

export const rec = (key) => (s) => s.records[key] || {}
