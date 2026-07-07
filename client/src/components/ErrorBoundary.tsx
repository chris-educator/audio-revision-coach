import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Quick Lesson Generator]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
            maxWidth: '36rem',
            margin: '2rem auto',
            color: '#0f172a',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            The app hit an error while loading. Try refreshing the page. If this keeps happening,
            contact support and include the message below.
          </p>
          <pre
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '0.8rem',
              overflow: 'auto',
            }}
          >
            {this.state.error.message}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
