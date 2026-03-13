import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-8 text-center">
      <span className="font-playfair text-lg font-semibold tracking-[0.3em] uppercase text-black mb-10">
        ATELIER
      </span>
      <p className="text-7xl font-playfair text-gray-200 font-bold mb-2">404</p>
      <h1 className="font-playfair text-2xl text-black mb-3">Seite nicht gefunden</h1>
      <p className="text-sm text-gray-400 leading-relaxed mb-8 max-w-xs">
        Die von Ihnen gesuchte Seite existiert nicht oder wurde verschoben.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="bg-black text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-lg mb-3"
      >
        Zurück
      </button>
      <button
        onClick={() => navigate('/collection')}
        className="text-xs text-gray-400 underline bg-transparent border-0"
      >
        Zur Kollektion
      </button>
    </div>
  )
}
