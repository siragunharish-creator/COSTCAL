import { Component, type ReactNode } from 'react'

/** Keeps raw JavaScript errors away from users. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto mt-24 max-w-md rounded-2xl border border-line bg-card p-8 text-center shadow-card">
        <h1 className="text-lg font-semibold">Something went wrong on this screen</h1>
        <p className="mt-2 text-sm text-muted">Your data is safe. Go back to the dashboard and try again.</p>
        <button className="mt-4 rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white" onClick={() => { location.hash = '#/'; location.reload() }}>Back to dashboard</button>
      </div>
    )
  }
}
