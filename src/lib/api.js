// 수파베이스 RPC 호출. 표에는 직접 접근하지 않고, 이름+비밀번호를 확인하는 함수만 부른다.
const URL = 'https://etqhitkwanpdyvdzozsj.supabase.co/rest/v1/rpc/'
const KEY = 'sb_publishable_hchbF_YwEoG-g_FNKqAb1w_-eS-iVeV'

const MESSAGES = {
  NO_STUDENT: '그 이름으로 들어온 기록이 없어요. 이름을 다시 확인해 주세요.',
  BAD_PIN: '비밀번호가 맞지 않아요.',
  LOCKED: '비밀번호를 여러 번 틀려서 잠깐 잠겼어요. 10분 뒤에 다시 해 보세요.',
  BAD_NAME: '이름은 1~20글자로 적어 주세요.',
  BAD_PIN_FORMAT: '비밀번호 형식이 맞지 않아요.',
  FULL: '등록할 수 있는 학생 수를 넘었어요. 선생님께 알려 주세요.',
  TOO_BIG: '저장할 내용이 너무 커요.',
}

export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

async function rpc(fn, body) {
  let res
  try {
    res = await fetch(URL + fn, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new ApiError('OFFLINE', '인터넷에 연결되지 않았어요. 기록은 이 기기에 먼저 저장해 둘게요.')
  }
  const text = await res.text()
  if (!res.ok) {
    let code = 'ERROR'
    try { const j = JSON.parse(text); code = (j.message || '').trim() } catch (e) { /* 빈 응답 */ }
    throw new ApiError(code, MESSAGES[code] || '잠시 문제가 생겼어요. 다시 해 보세요.')
  }
  const out = text ? JSON.parse(text) : null
  // 비밀번호 오류 등은 함수가 {error: 'CODE'}로 돌려준다(틀린 횟수가 저장되도록)
  if (out && typeof out === 'object' && !Array.isArray(out) && out.error) {
    throw new ApiError(out.error, MESSAGES[out.error] || '잠시 문제가 생겼어요. 다시 해 보세요.')
  }
  return out
}

export const api = {
  join: (name, work, pin) => rpc('inv_join', { p_name: name, p_work: work, p_pin: pin }),
  load: (name, pin) => rpc('inv_load', { p_name: name, p_pin: pin }),
  save: (name, pin, key, data) => rpc('inv_save', { p_name: name, p_pin: pin, p_key: key, p_data: data }),
  teacher: {
    overview: (tpin) => rpc('inv_t_overview', { p_tpin: tpin }),
    feedback: (tpin, id, key, stamp, comment) => rpc('inv_t_feedback', { p_tpin: tpin, p_student: id, p_key: key, p_stamp: stamp, p_comment: comment || '' }),
    resetPin: (tpin, id, pin) => rpc('inv_t_reset_pin', { p_tpin: tpin, p_student: id, p_new: pin }),
    setPin: (tpin, pin) => rpc('inv_t_set_pin', { p_tpin: tpin, p_new: pin }),
    remove: (tpin, id) => rpc('inv_t_remove', { p_tpin: tpin, p_student: id }),
  },
}
