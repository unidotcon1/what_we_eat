import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; on_reload?: () => void }
type State = { failed: boolean }

/** Catches rendering crashes so people see a calm message and a way out, never a blank page or error details. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // details stay in the browser console for debugging; they are never shown on the page
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const reload = this.props.on_reload ?? (() => window.location.reload())
    return (
      <main className="app">
        <div role="alert">
          <h1>Something went wrong</h1>
          <p className="sub">Your saved places and polls are safe. Reloading usually fixes it.</p>
        </div>
        <button type="button" className="apply" onClick={reload}>
          Reload
        </button>
      </main>
    )
  }
}
