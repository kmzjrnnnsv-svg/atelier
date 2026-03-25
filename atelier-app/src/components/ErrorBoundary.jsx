import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white px-8 text-center">
          <span className="font-playfair text-lg font-semibold tracking-[0.3em] uppercase text-black mb-10">
            ATELIER
          </span>
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="font-playfair text-2xl text-black mb-3">Etwas ist schiefgelaufen</h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-8 max-w-xs">
            Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu oder kehren Sie zur Startseite zurück.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-black text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-lg"
          >
            Zur Startseite
          </button>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 text-xs text-gray-400 underline bg-transparent border-0"
          >
            Erneut versuchen
          </button>
          {this.state.error && (
            <pre className="mt-6 text-[10px] text-left text-red-400 bg-red-50 p-3 rounded max-w-xs overflow-auto max-h-32">
              {this.state.error.message}{'\n'}{this.state.error.stack?.split('\n').slice(0, 4).join('\n')}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
