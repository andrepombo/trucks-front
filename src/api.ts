export interface PlanRouteRequest {
  start: string
  finish: string
  mpg?: number
  max_range_miles?: number
  reserve_gallons?: number
  first_stop_emergency_gallons?: number
  summary_only?: boolean
  no_geometry?: boolean
  start_empty?: boolean
}

export interface Geometry {
  type: string
  coordinates: number[][]
}

export interface PlanRouteResponse {
  route?: {
    distance?: number
    duration?: number
    distance_miles?: number
    duration_seconds?: number
    geometry?: Geometry
  }
  stops?: any[]
  summary?: any
  error?: string
}

export async function planRoute(body: PlanRouteRequest, signal?: AbortSignal): Promise<PlanRouteResponse> {
  const res = await fetch('/api/plan-route/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${text}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`)
  }
}

export interface RouteThroughStopsResponse {
  route?: {
    distance?: number
    duration?: number
    duration_seconds?: number
    geometry?: Geometry
  }
  error?: string
}

export async function routeThroughStops(
  waypoints: number[][],
  signal?: AbortSignal
): Promise<RouteThroughStopsResponse> {
  const res = await fetch('/api/route-through-stops/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ waypoints }),
    signal
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${text}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`)
  }
}
