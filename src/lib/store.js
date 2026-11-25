import { create } from 'zustand'
import { api } from './api'

const LS = 'invlab.v1'
const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { /* 저장 불가 환경 */ } }

const prefs0 = read(LS + '.prefs', { size: 1, motion: true })
const user0 = read(LS + '.user', null)
const cache0 = user0 ? read(LS + '.rec.' + user0.name, { records: {}, dirty: {} }) : { records: {}, dirty: {} }

const timers = {}

export const useApp = create((set, get) => ({
  user: user0, // {name, pin, work}
  records: cache0.records || {},
  dirty: cache0.dirty || {},
  feedback: {},
  sync: 'idle', // idle | saving | saved | offline | error
  syncMsg: '',
  prefs: prefs0,
  teacherPin: null,

  setPrefs(p) { const prefs = { ...get().prefs, ...p }; write(LS + '.prefs', prefs); set({ prefs }) },

  async login(name, work, pin) {
    const s = await api.join(name, work, pin)
    const user = { name: s.name, work: s.work, pin }
    write(LS + '.user', user)
    const cache = read(LS + '.rec.' + s.name, { records: {}, dirty: {} })
    set({ user, records: cache.records || {}, dirty: cache.dirty || {} })
    await get().pull()
    return user
  },

  logout() {
    try { localStorage.removeItem(LS + '.user') } catch (e) { /* 무시 */ }
    set({ user: null, records: {}, dirty: {}, feedback: {}, sync: 'idle' })
  },

  // 인터넷이 없을 때: 이 기기에만 먼저 기록하고, 연결되면 서버에 등록
  startOffline(name, work, pin) {
    const user = { name: name.trim(), work, pin }
    write(LS + '.user', user)
    const cache = read(LS + '.rec.' + user.name, { records: {}, dirty: {} })
    set({ user, records: cache.records || {}, dirty: cache.dirty || {}, sync: 'offline' })
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
      set({ records: merged, feedback: r.feedback || {}, sync: 'saved' })
      write(LS + '.rec.' + user.name, { records: merged, dirty })
      Object.keys(dirty).forEach((k) => dirty[k] && get().flush(k))
    } catch (e) {
      set({ sync: e.code === 'OFFLINE' ? 'offline' : 'error', syncMsg: e.message })
    }
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
    try {
      await api.save(user.name, user.pin, key, records[key] || {})
      const nd = { ...get().dirty, [key]: false }
      set({ dirty: nd, sync: 'saved', syncMsg: '' })
      write(LS + '.rec.' + user.name, { records: get().records, dirty: nd })
    } catch (e) {
      set({ sync: e.code === 'OFFLINE' ? 'offline' : 'error', syncMsg: e.message })
    }
  },

  setTeacherPin(p) { set({ teacherPin: p }) },
}))

export const rec = (key) => (s) => s.records[key] || {}
