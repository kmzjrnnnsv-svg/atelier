/**
 * CtaBanner — CMS-controlled call-to-action banner
 * Shows at the bottom of pages configured in CMS settings
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../hooks/useApi'

let _cache = null

export default function CtaBanner({ page }) {
  const navigate = useNavigate()
  const [banner, setBanner] = useState(_cache)

  useEffect(() => {
    if (_cache) return
    apiFetch('/api/settings/cta-banner')
      .then(data => { _cache = data; setBanner(data) })
      .catch(() => {})
  }, [])

  if (!banner || !banner.pages?.includes(page)) return null

  return (
    <div className="border-t border-black/[0.06] pt-10 lg:pt-14 pb-4">
      <div className="max-w-md mx-auto text-center">
        <p className="text-[10px] text-black/30 uppercase tracking-[0.25em] mb-3">{banner.label}</p>
        <p className="text-[22px] lg:text-[28px] font-extralight text-black leading-[1.2] tracking-tight">
          {banner.title}
        </p>
        <p className="text-[13px] text-black/35 mt-3 leading-[1.7] font-light">
          {banner.text}
        </p>
        <button
          onClick={() => navigate(banner.link)}
          className="mt-6 px-8 h-12 bg-[#19110B] text-white text-[11px] border border-[#19110B] hover:bg-white hover:text-[#19110B] transition-all duration-300"
          style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
        >
          {banner.button}
        </button>
      </div>
    </div>
  )
}
