import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronRight, Star } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

const categoryColors = {
  'Gesundheit': { bg: 'bg-red-500/8',   text: 'text-red-600'   },
  'Tipps':      { bg: 'bg-amber-500/8', text: 'text-amber-600' },
  'Wissen':     { bg: 'bg-blue-500/8',  text: 'text-blue-600'  },
  'Allgemein':  { bg: 'bg-black/5',     text: 'text-black/50'  },
}

function getCategoryStyle(cat) {
  return categoryColors[cat] || categoryColors['Allgemein']
}

function ArticleDetail({ article, onBack }) {
  const cat = getCategoryStyle(article.category)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Article header */}
      <div className="px-5 pt-5 pb-4">
        <span className={`inline-block text-[8px] px-2 py-1 ${cat.bg} ${cat.text}`} style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {article.category}
        </span>
        {article.featured && (
          <span className="ml-2 inline-flex items-center gap-1 text-[8px] px-2 py-1 bg-amber-500/10 text-amber-600" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            <Star size={8} className="fill-amber-400 text-amber-400" /> Featured
          </span>
        )}
        <h1 className="text-[15px] text-black mt-3 leading-tight">{article.title}</h1>
        {article.excerpt && (
          <p className="text-[11px] text-black/40 mt-2 leading-relaxed">{article.excerpt}</p>
        )}
      </div>

      <div className="mx-0 h-px bg-black/5" />

      {/* Article body */}
      <div className="px-5 pt-4 pb-6">
        {article.content.split('\n\n').map((block, i) => {
          const isHeading = block.split('\n').length === 1 && block.length < 60 && !block.startsWith('–') && !block.match(/^\d+\./)
          if (isHeading && i > 0) {
            return (
              <h3 key={i} className="text-[12px] text-black mt-5 mb-2" style={{ letterSpacing: '0.05em' }}>{block}</h3>
            )
          }
          return (
            <p key={i} className="text-[11px] text-black/50 leading-relaxed mb-3">{block}</p>
          )
        })}
      </div>

      {/* CTA footer */}
      <div className="mx-0 mb-0 p-5 flex items-center justify-between cursor-pointer bg-black" onClick={onBack}>
        <div>
          <p className="text-[8px] text-white/40" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Mehr entdecken</p>
          <p className="text-[12px] text-white leading-tight mt-0.5">Weitere Artikel lesen</p>
        </div>
        <div className="w-9 h-9 bg-white/10 flex items-center justify-center flex-shrink-0">
          <BookOpen size={15} className="text-white/60" />
        </div>
      </div>
    </div>
  )
}

export default function Learn() {
  const navigate = useNavigate()
  const { articles } = useAtelierStore()
  const [selected, setSelected] = useState(null)
  const [activeFilter, setActiveFilter] = useState('Alle')

  const categories = ['Alle', ...Array.from(new Set(articles.map(a => a.category)))]

  const filtered = activeFilter === 'Alle'
    ? articles
    : articles.filter(a => a.category === activeFilter)

  const featured = articles.filter(a => a.featured)
  const rest = filtered.filter(a => !a.featured)

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 flex-shrink-0">
        <button
          onClick={() => selected ? setSelected(null) : navigate(-1)}
          className="w-10 h-10 flex items-center justify-center bg-transparent border-0"
        >
          <ArrowLeft size={18} strokeWidth={1.5} className="text-black" />
        </button>
        <div className="text-center">
          <span className="text-[11px] text-black" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            {selected ? selected.title.slice(0, 22) + (selected.title.length > 22 ? '…' : '') : 'Learn'}
          </span>
          {!selected && (
            <p className="text-[9px] text-black/30 mt-0.5" style={{ letterSpacing: '0.12em' }}>
              {articles.length} Artikel
            </p>
          )}
        </div>
        <div className="w-10" />
      </div>

      {selected ? (
        <ArticleDetail article={selected} onBack={() => setSelected(null)} />
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* Featured article (hero) */}
          {featured.length > 0 && activeFilter === 'Alle' && (
            <button
              onClick={() => setSelected(featured[0])}
              className="w-full text-left border-0 p-0 active:opacity-90 transition-opacity border-b border-black/5"
              style={{ background: '#1a1a1a' }}
            >
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[7px] px-2 py-0.5 bg-white/10 text-white/60" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {featured[0].category}
                  </span>
                  <span className="flex items-center gap-1 text-[7px] px-2 py-0.5 bg-amber-500/20 text-amber-400" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    <Star size={7} className="fill-amber-400 text-amber-400" /> Featured
                  </span>
                </div>
                <h2 className="text-[14px] text-white leading-snug mb-1">{featured[0].title}</h2>
                {featured[0].excerpt && (
                  <p className="text-[9px] text-white/35 leading-relaxed line-clamp-2">{featured[0].excerpt}</p>
                )}
                <div className="flex items-center gap-1 mt-3">
                  <span className="text-[8px] text-white/50" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Lesen</span>
                  <ChevronRight size={11} className="text-white/50" />
                </div>
              </div>
            </button>
          )}

          {/* Category filter tabs */}
          {categories.length > 2 && (
            <div className="flex gap-2 px-5 pt-4 pb-1 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`flex-shrink-0 text-[8px] px-3 py-1.5 border transition-all ${
                    activeFilter === cat
                      ? 'bg-black text-white border-black'
                      : 'bg-transparent text-black/40 border-black/10'
                  }`}
                  style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Articles list */}
          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 px-8 text-center mt-8">
              <BookOpen size={36} className="text-black/10 mb-3" />
              <p className="text-[12px] text-black">Noch keine Artikel</p>
              <p className="text-[10px] text-black/30 mt-1">Bald verfügbar</p>
            </div>
          ) : (
            <div className="pt-2 pb-2">
              {(activeFilter === 'Alle' ? rest : filtered).map(article => {
                const cat = getCategoryStyle(article.category)
                return (
                  <button
                    key={article.id}
                    onClick={() => setSelected(article)}
                    className="w-full text-left border-0 border-b border-black/5 active:bg-black/3 transition-colors bg-transparent"
                  >
                    <div className="px-5 py-4 flex items-start gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5 ${cat.bg}`}>
                        <BookOpen size={14} className={cat.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[7px] ${cat.text}`} style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                          {article.category}
                        </span>
                        <p className="text-[12px] text-black leading-snug mt-0.5">{article.title}</p>
                        {article.excerpt && (
                          <p className="text-[9px] text-black/35 mt-1 leading-relaxed line-clamp-2">{article.excerpt}</p>
                        )}
                      </div>
                      <ChevronRight size={14} className="text-black/20 flex-shrink-0 mt-1" strokeWidth={1.5} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="h-20" />
        </div>
      )}

    </div>
  )
}
