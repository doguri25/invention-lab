import { Component } from 'react'

// 화면 한 곳이 고장 나도 앱 전체가 하얗게 되지 않게 막는다.
// 적어 둔 기록은 이 기기에 남아 있으므로 다시 열면 이어서 쓸 수 있다.
export class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { if (typeof console !== 'undefined') console.error(err) }
  componentDidUpdate(prev) { if (this.state.err && prev.resetKey !== this.props.resetKey) this.setState({ err: null }) }
  render() {
    if (!this.state.err) return this.props.children
    if (this.props.lab) {
      return (
        <div className="oops in-lab" role="alert">
          <b>3D 화면이 멈췄어요.</b>
          <p className="small muted">아래 단추로 다시 열어 보세요. 계속 안 되면 선생님께 알려 주세요. 실험 순서와 기록표는 그대로 쓸 수 있어요.</p>
          <button type="button" className="btn small" onClick={() => this.setState({ err: null })}>다시 열어 보기</button>
        </div>
      )
    }
    return (
      <div className="panel oops" role="alert">
        <b className="display" style={{ fontSize: '1.4em' }}>화면을 보여 주다가 문제가 생겼어요</b>
        <p>적어 둔 내용은 이 기기에 남아 있어요. 다시 열면 이어서 할 수 있어요.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn" onClick={() => window.location.reload()}>다시 열기</button>
          <a className="btn ghost" href="#/" onClick={() => this.setState({ err: null })}>첫 화면으로</a>
        </div>
      </div>
    )
  }
}
