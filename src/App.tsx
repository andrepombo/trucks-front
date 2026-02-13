import React, { useMemo, useRef, useState } from 'react'
import MapView, { StopPoint } from './components/MapView'
import CityAutocomplete from './components/CityAutocomplete'
import { planRoute, PlanRouteResponse } from './api'

type LatLng = [number, number]

function toLatLngs(geometry?: { type?: string; coordinates?: any }): LatLng[] {
  if (!geometry || !geometry.coordinates) return []
  const coords = geometry.coordinates
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    const flat: number[][] = []
    for (const line of coords) {
      if (Array.isArray(line)) {
        for (const pt of line) {
          if (Array.isArray(pt) && pt.length >= 2) flat.push(pt as number[])
        }
      }
    }
    return flat.map(([lon, lat]) => [lat, lon])
  }
  return (coords as number[][])
    .filter((pt) => Array.isArray(pt) && pt.length >= 2)
    .map(([lon, lat]) => [lat, lon])
}

export default function App() {
  const [start, setStart] = useState('')
  const [finish, setFinish] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [route, setRoute] = useState<LatLng[]>([])
  const [stops, setStops] = useState<StopPoint[]>([])
  const [summary, setSummary] = useState<any | null>(null)
  const [startEmpty, setStartEmpty] = useState(true)
  const abortRef = useRef<AbortController | null>(null)
  const reqIdRef = useRef(0)

  const mapKey = useMemo(() => {
    const ids = (stops ?? [])
      .map((s) => (typeof s.station_id === 'number' ? String(s.station_id) : `${s.lat ?? ''},${s.lon ?? ''}`))
      .join(',')
    const n = summary?.stops_count ?? (stops?.length ?? 0)
    return `mv-${n}-${ids}`
  }, [stops, summary?.stops_count])

  function formatCityState(raw?: string): string | undefined {
    if (!raw) return raw
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const last = parts[parts.length - 1]
      const stateMatch = last.match(/\b([A-Za-z]{2})\b/)
      const state = stateMatch ? stateMatch[1].toUpperCase() : undefined
      const city = parts[parts.length - 2]
      if (city && state) return `${city}, ${state}`
    }
    return raw
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSummary(null)
    setRoute([])
    setStops([])
    if (!start || !finish) {
      setError('Please enter both Start and Finish.')
      return
    }
    try {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      const myId = ++reqIdRef.current
      setLoading(true)
      const res: PlanRouteResponse = await planRoute({ start, finish, start_empty: startEmpty }, ac.signal)
      if (res.error) {
        setError(res.error)
      }
      if (reqIdRef.current !== myId) {
        // A newer request has been issued; ignore this response
        return
      }
      const latlngs = toLatLngs(res.route?.geometry)
      setRoute(latlngs)
      const stopPts: StopPoint[] = Array.isArray(res.stops)
        ? res.stops.map((s: any) => ({
            station_id: typeof s.station_id === 'number' ? s.station_id : undefined,
            lat: typeof s.lat === 'number' ? s.lat : Array.isArray(s.coord) ? s.coord[1] : undefined,
            lon: typeof s.lon === 'number' ? s.lon : Array.isArray(s.coord) ? s.coord[0] : undefined,
            name: s.name,
            city: s.city,
            state: s.state,
            price: typeof s.price === 'number' ? s.price : undefined,
            address: s.address,
            gallons_purchased: typeof s.gallons_purchased === 'number' ? s.gallons_purchased : undefined,
            cost: typeof s.cost === 'number' ? s.cost : undefined,
            mile_on_route: typeof s.mile_on_route === 'number' ? s.mile_on_route : undefined
          }))
        : []
      // Deduplicate by station_id, or by lat/lon if id missing
      const seen = new Set<string>()
      const dedup: StopPoint[] = []
      for (const s of stopPts) {
        const key = typeof s.station_id === 'number'
          ? `id:${s.station_id}`
          : `ll:${s.lat?.toFixed?.(6) ?? ''},${s.lon?.toFixed?.(6) ?? ''}`
        if (!seen.has(key)) {
          seen.add(key)
          dedup.push(s)
        }
      }
      setStops(dedup)
      setSummary(res.summary || null)
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 app">
      <div className="px-4 py-3 bg-slate-900 text-white text-lg font-semibold shadow-sm header"><span role="img" aria-label="United States flag" style={{ marginRight: 8 }}>🇺🇸</span>Truck Route Planner - USA</div>
      <div className="flex flex-1 min-h-0 content">
        <aside className="w-52 md:w-56 shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-4 overflow-auto sidebar">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="form-row">
              <label htmlFor="startInput" className="text-sm font-medium text-slate-700">Start:</label>
              <CityAutocomplete
                id="startInput"
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 input"
                placeholder="e.g. Denver, CO"
                value={start}
                onChange={setStart}
              />
            </div>
            <div className="form-row">
              <label htmlFor="finishInput" className="text-sm font-medium text-slate-700">Finish:</label>
              <CityAutocomplete
                id="finishInput"
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 input"
                placeholder="e.g. Kansas City, MO"
                value={finish}
                onChange={setFinish}
              />
            </div>
            <div className="form-row">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  checked={startEmpty}
                  onChange={(e) => setStartEmpty(e.target.checked)}
                />
                Start with empty tank
              </label>
            </div>
            <button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-slate-400 disabled:cursor-not-allowed button" type="submit" disabled={loading}>
              {loading ? 'Planning...' : 'Plan route'}
            </button>
            {error && <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2 whitespace-pre-wrap error">{error}</div>}
            {summary && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 space-y-1 summary">
                <div>
                  <strong>Distance:</strong>{' '}
                  {(
                    (summary.distance_with_detours_miles ?? summary.distance_miles)?.toFixed?.(1) ?? ''
                  )}{' '}
                  mi
                </div>
                <div>
                  <strong>Duration:</strong> {summary.duration_hours} h
                </div>
                <div>
                  <strong>Stops:</strong> {stops?.length ?? 0}
                </div>
                {'total_cost' in summary && (
                  <div>
                    <strong>Estimated cost:</strong> ${Number(summary.total_cost).toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </form>
          <hr className="my-4 border-slate-200" />
          <div className="text-xs text-slate-500 space-y-1">
            
          </div>
        </aside>
        <div className="flex-1 min-w-0 min-h-0 relative map-pane">
          <MapView
            key={mapKey}
            route={route}
            stops={stops}
            startPoint={route && route.length > 0 ? route[0] : null}
            finishPoint={route && route.length > 0 ? route[route.length - 1] : null}
            startLabel={formatCityState(summary?.start ?? start)}
            finishLabel={formatCityState(summary?.finish ?? finish)}
          />
        </div>
      </div>
    </div>
  )
}
