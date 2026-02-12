import React, { useEffect, useMemo, useRef, useState } from 'react'

interface Suggestion {
  label: string
}

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
}

export default function CityAutocomplete({ value, onChange, className, placeholder, id, ...rest }: Props) {
  const apiKeyRaw = import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined
  const apiKey = apiKeyRaw ? apiKeyRaw.trim().replace(/^['"]+|['"]+$/g, '') : undefined
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Suggestion[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const acRef = useRef<AbortController | null>(null)
  const debRef = useRef<number | null>(null)

  const canAutocomplete = Boolean(apiKey && apiKey.length > 0)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (!canAutocomplete) return

    const q = value?.trim() ?? ''
    if (q.length < 2) {
      setItems([])
      setOpen(false)
      setLoading(false)
      setError(null)
      acRef.current?.abort()
      return
    }

    if (debRef.current) window.clearTimeout(debRef.current)
    debRef.current = window.setTimeout(async () => {
      try {
        acRef.current?.abort()
        const ac = new AbortController()
        acRef.current = ac
        setLoading(true)
        setError(null)
        // Restrict to US cities only
        const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
        url.searchParams.set('text', q)
        url.searchParams.set('type', 'city')
        url.searchParams.set('filter', 'countrycode:us')
        url.searchParams.set('limit', '8')
        url.searchParams.set('lang', 'en')
        url.searchParams.set('format', 'json')
        url.searchParams.set('apiKey', apiKey!)
        const res = await fetch(url.toString(), { signal: ac.signal })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Autocomplete failed (${res.status}): ${text}`)
        }
        const data = await res.json()
        const results: any[] = Array.isArray(data?.results) ? data.results : []
        const mapped: Suggestion[] = results
          .map((r) => {
            const city = r.city || r.name || ''
            const state = r.state_code || r.state || ''
            const label = [city, state].filter(Boolean).join(', ') || r.formatted || ''
            return label ? { label } : null
          })
          .filter(Boolean) as Suggestion[]
        // Deduplicate labels
        const unique = Array.from(new Set(mapped.map((m) => m.label))).map((label) => ({ label }))
        setItems(unique)
        setOpen(unique.length > 0)
        setActiveIndex(-1)
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        setError(err?.message || String(err))
        setItems([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => {
      if (debRef.current) window.clearTimeout(debRef.current)
    }
  }, [value, canAutocomplete, apiKey])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + items.length) % items.length)
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault()
        const sel = items[activeIndex]
        onChange(sel.label)
        setOpen(false)
        setActiveIndex(-1)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  // Fallback: plain input if no API key configured
  if (!canAutocomplete) {
    return (
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        {...rest}
      />
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (items.length > 0) setOpen(true)
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        {...rest}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
          <ul role="listbox" className="max-h-64 overflow-auto">
            {items.map((s, idx) => (
              <li
                key={s.label + idx}
                role="option"
                aria-selected={idx === activeIndex}
                className={`px-3 py-2 cursor-pointer text-sm ${idx === activeIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(s.label)
                  setOpen(false)
                  setActiveIndex(-1)
                }}
              >
                {s.label}
              </li>
            ))}
            {loading && (
              <li className="px-3 py-2 text-sm text-slate-500">Loading…</li>
            )}
            {!loading && items.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-500">No results</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
