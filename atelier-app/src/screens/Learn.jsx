import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronRight, Star } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

const categoryColors = {
  'Gesundheit': { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100' },
  'Tipps':      { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100' },
  'Wissen':     { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100' },
  'Allgemein':  { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200' },
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
        <span className={`inline-block text-[8px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${cat.bg} ${cat.text}`}>
          {article.category}
        </span>
        {article.featured && (
          <span className="ml-2 inline-flex items-center gap-1 text-[8px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600">
            <Star size={8} className="fill-amber-400 text-amber-400" /> Featured
          </span>
        )}
        <h1 className="font-playfair text-2xl font-semibold text-black mt-3 leading-tight">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className="text-xs text-gray-500 mt-2 leading-relaxed italic">
            {article.excerpt}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gray-100" />

      {/* Article body */}
      <div className="px-5 pt-4 pb-6">
        {article.content.split('\n\n').map((block, i) => {
          const isHeading = block.split('\n').length === 1 && block.length < 60 && !block.startsWith('–') && !block.match(/^\d+\./)
          if (isHeading && i > 0) {
            return (
              <h3 key={i} className="text-sm font-bold text-black mt-5 mb-2">
                {block}
              </h3>
            )
          }
          return (
            <p key={i} className="text-xs text-gray-600 leading-relaxed mb-3">
              {block}
            </p>
          )
        })}
      </div>

      {/* CTA footer */}
      <div
        className="mx-5 mb-8 rounded-2xl p-4 flex items-center justify-between cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}
        onClick={onBack}
      >
        <div>
          <p className="text-[8px] uppercase tracking-widest text-teal-400 mb-1">Mehr entdecken</p>
          <p className="text-sm font-semibold text-white leading-tight">Weitere Artikel lesen</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
          <BookOpen size={15} className="text-teal-400" />
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
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white flex items-center justify-between px-5 pt-14 pb-4 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => selected ? setSelected(null) : navigate(-1)}
          className="bg-transparent border-0 p-0"
        >
          <ArrowLeft size={22} strokeWidth={1.5} className="text-gray-800" />
        </button>
        <div className="text-center">
          <span className="text-sm font-bold tracking-wide text-black">
            {selected ? selected.title.slice(0, 22) + (selected.title.length > 22 ? '…' : '') : 'Learn'}
          </span>
          {!selected && (
            <p className="text-[8px] uppercase tracking-widest text-gray-400 mt-0.5">
              {articles.length} Artikel
            </p>
          )}
        </div>
        <div className="w-6" />
      </div>

      {selected ? (
        <ArticleDetail article={selected} onBack={() => setSelected(null)} />
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* Featured article (hero) */}
          {featured.length > 0 && activeFilter === 'Alle' && (
            <div className="px-4 pt-4">
              <button
                onClick={() => setSelected(featured[0])}
                className="w-full text-left rounded-2xl overflow-hidden border-0 p-0 shadow-sm active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}
              >
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[7px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400">
                      {featured[0].category}
                    </span>
                    <span className="flex items-center gap-1 text-[7px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      <Star size={7} className="fill-amber-400 text-amber-400" /> Featured
                    </span>
                  </div>
                  <h2 className="font-playfair text-lg font-semibold text-white leading-snug mb-1">
                    {featured[0].title}
                  </h2>
                  {featured[0].excerpt && (
                    <p className="text-[9px] text-gray-400 leading-relaxed line-clamp-2">
                      {featured[0].excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-3">
                    <span className="text-[8px] text-teal-400 uppercase tracking-widest font-semibold">Lesen</span>
                    <ChevronRight size={11} className="text-teal-400" />
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Category filter tabs */}
          {categories.length > 2 && (
            <div className="flex gap-2 px-4 pt-4 pb-1 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`flex-shrink-0 text-[8px] uppercase tracking-widest font-semibold px-3 py-1.5 rounded-full border-0 transition-all ${
                    activeFilter === cat
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-500 shadow-sm'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Articles list */}
          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 px-8 text-center mt-8">
              <BookOpen size={36} className="text-gray-200 mb-3" />
              <p className="text-sm font-semibold text-gray-400">Noch keine Artikel</p>
              <p className="text-[10px] text-gray-300 mt-1">Kuratoren veröffentlichen bald Inhalte</p>
            </div>
          ) : (
            <div className="px-4 pt-3 space-y-2 pb-2">
              {(activeFilter === 'Alle' ? rest : filtered).map(article => {
                const cat = getCategoryStyle(article.category)
                return (
                  <button
                    key={article.id}
                    onClick={() => setSelected(article)}
                    className="w-full text-left bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-95 transition-transform shadow-sm"
                  >
                    <div className="p-4 flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cat.bg}`}>
                        <BookOpen size={14} className={cat.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[7px] uppercase tracking-widest font-bold ${cat.text}`}>
                            {article.category}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-black leading-snug">{article.title}</p>
                        {article.excerpt && (
                          <p className="text-[9px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{article.excerpt}</p>
                        )}
                      </div>
                      <ChevronRight size={15} className="text-gray-300 flex-shrink-0 mt-1" />
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
