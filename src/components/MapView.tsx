import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

type LatLng = [number, number]

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])))
      map.fitBounds(bounds.pad(0.2))
    }
  }, [map, JSON.stringify(points)])
  return null
}

export interface StopPoint {
  station_id?: number
  lat?: number
  lon?: number
  name?: string
  city?: string
  state?: string
  price?: number
  address?: string
  gallons_purchased?: number
  cost?: number
  mile_on_route?: number
}

export default function MapView({
  route,
  baseRoute,
  stops,
  startPoint,
  finishPoint,
  startLabel,
  finishLabel
}: {
  route: LatLng[]
  baseRoute?: LatLng[]
  stops?: StopPoint[]
  startPoint?: LatLng | null
  finishPoint?: LatLng | null
  startLabel?: string
  finishLabel?: string
}) {
  const apiKeyRaw = import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined
  const apiKey = apiKeyRaw ? apiKeyRaw.trim().replace(/^['"]+|['"]+$/g, '') : undefined
  const useGeoapify = Boolean(apiKey && apiKey.length > 0)

  const tileUrl = useGeoapify
    ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  const attribution = useGeoapify
    ? 'Map data © OpenStreetMap contributors, Tiles © Geoapify'
    : 'Map data © OpenStreetMap contributors'

  const defaultIcon = L.icon({
    iconUrl: markerIconUrl,
    iconRetinaUrl: markerIcon2xUrl,
    shadowUrl: markerShadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })

  // Colored pins for start/finish (red) and stops (yellow)
  const redPin = L.divIcon({
    className: 'pin-wrapper',
    html: '<div class="marker-pin pin-red"><span class="pin-dot"></span></div>',
    iconSize: [24, 36],
    iconAnchor: [12, 24],
    popupAnchor: [0, -18]
  })
  const yellowPin = L.divIcon({
    className: 'pin-wrapper',
    html: '<div class="marker-pin pin-yellow"><span class="pin-dot"></span></div>',
    iconSize: [24, 36],
    iconAnchor: [12, 24],
    popupAnchor: [0, -18]
  })

  // default map center: continental US
  const center: LatLng = [39.5, -98.35]

  // Helper to approximate divergence between the base A->B route and the
  // actual route that visits fuel stops. We classify segments into:
  // - blue: detour route segments that are close to the base route
  // - red: detour route segments that are far from the base (true detours)
  // - green: the whole base route for context
  const base = baseRoute && baseRoute.length > 1 ? baseRoute : null
  const detour = route && route.length > 1 ? route : null

  function dist2(a: LatLng, b: LatLng): number {
    const dx = a[0] - b[0]
    const dy = a[1] - b[1]
    return dx * dx + dy * dy
  }

  function minDist2ToBase(p: LatLng): number {
    if (!base) return Number.POSITIVE_INFINITY
    let best = Number.POSITIVE_INFINITY
    for (let i = 0; i < base.length; i++) {
      const d2 = dist2(p, base[i])
      if (d2 < best) best = d2
    }
    return best
  }

  const greenSegments: LatLng[][] = []
  const redSegments: LatLng[][] = []

  if (detour && base) {
    const GREEN_THRESHOLD_DEG2 = 0.0005 * 0.0005
    let current: LatLng[] = []
    let currentIsGreen = false

    for (let i = 0; i < detour.length; i++) {
      const pt = detour[i]
      const near = minDist2ToBase(pt) <= GREEN_THRESHOLD_DEG2
      if (i === 0) {
        currentIsGreen = near
        current.push(pt)
        continue
      }
      if (near === currentIsGreen) {
        current.push(pt)
      } else {
        if (current.length > 1) {
          if (currentIsGreen) greenSegments.push(current)
          else redSegments.push(current)
        }
        current = [detour[i - 1], pt]
        currentIsGreen = near
      }
    }
    if (current.length > 1) {
      if (currentIsGreen) greenSegments.push(current)
      else redSegments.push(current)
    }
  }

  return (
    <MapContainer center={center} zoom={4} className="map-pane absolute inset-0" style={{ height: '100%', width: '100%' }}>
      <TileLayer url={tileUrl} attribution={attribution} />
      {startPoint && (
        <Marker position={[startPoint[0], startPoint[1]]} icon={redPin}>
          <Popup>{startLabel ? `Start: ${startLabel}` : 'Start'}</Popup>
        </Marker>
      )}
      {finishPoint && (
        <Marker position={[finishPoint[0], finishPoint[1]]} icon={redPin}>
          <Popup>{finishLabel ? `Finish: ${finishLabel}` : 'Finish'}</Popup>
        </Marker>
      )}
      {/* Always show the base A->B route in blue for context */}
      {base && base.length > 0 && (
        <>
          {/* Base route: dark outline + green stroke */}
          <Polyline positions={base} pathOptions={{ color: '#0f172a', weight: 7, opacity: 0.95 }} />
          <Polyline positions={base} pathOptions={{ color: '#16a34a', weight: 5, opacity: 1 }} />
          <FitBounds points={base} />
        </>
      )}
      {/* Show blue segments where the actual route follows the base */}
      {greenSegments.map((seg, idx) => (
        <React.Fragment key={`g-${idx}`}>
          <Polyline positions={seg} pathOptions={{ color: '#0f172a', weight: 9, opacity: 0.95 }} />
          <Polyline positions={seg} pathOptions={{ color: '#2563eb', weight: 7, opacity: 1 }} />
        </React.Fragment>
      ))}
      {/* Show red segments where the actual route detours away from the base (into/out of stops) */}
      {redSegments.map((seg, idx) => (
        <React.Fragment key={`r-${idx}`}>
          <Polyline positions={seg} pathOptions={{ color: '#0f172a', weight: 9, opacity: 0.95 }} />
          <Polyline positions={seg} pathOptions={{ color: '#dc2626', weight: 7, opacity: 1 }} />
        </React.Fragment>
      ))}
      {stops
        ?.filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number')
        .map((s, idx) => (
          <Marker key={s.station_id ?? idx} position={[s.lat!, s.lon!]} icon={yellowPin}
          >
            <Popup>
              <div>
                <div><strong>{s.name || 'Fuel stop'}</strong></div>
                {s.address && <div>{s.address}</div>}
                <div>{[s.city, s.state].filter(Boolean).join(', ')}</div>
                {typeof s.mile_on_route === 'number' && (
                  <div>At mile: {s.mile_on_route.toFixed(1)} mi</div>
                )}
                {typeof s.price === 'number' && (
                  <div>Price: ${s.price?.toFixed(3)}/gal</div>
                )}
                {(typeof s.gallons_purchased === 'number' || typeof s.cost === 'number') && (
                  <div>
                    Refuel: {typeof s.gallons_purchased === 'number' ? `+${s.gallons_purchased.toFixed(1)} gal` : ''}
                    {typeof s.cost === 'number' ? ` = $${s.cost.toFixed(2)}` : ''}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  )
}
