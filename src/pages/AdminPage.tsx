import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, AlertTriangle, ArrowRight, Box, Check, ChevronRight, Clock3, LogOut, MapPin, PackageCheck, Plus, RefreshCw, Search, ShieldCheck, Truck } from 'lucide-react'
import { PageFrame } from '../Layout'
import './admin.css'

type EventRow = { id: string; status: string; location: string; facility: string | null; description: string; latitude: number | null; longitude: number | null; timestamp: string }
type ShipmentRow = {
  trackingNumber: string; serviceType: string; status: string; senderName: string; senderCity: string; senderCountry: string
  senderLatitude: number | null; senderLongitude: number | null; receiverName: string; receiverCity: string; receiverCountry: string
  receiverLatitude: number | null; receiverLongitude: number | null; weightKg: number; estimatedDelivery: string | null
  signedBy: string | null; deliveredAt: string | null; updatedAt: string; events: EventRow[]
}

const statuses = ['LABEL_CREATED', 'COLLECTED', 'ORIGIN_GATEWAY', 'IN_TRANSIT', 'CUSTOMS_HOLD', 'CUSTOMS_CLEARED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION']
const services = ['EXPRESS_INTL', 'STANDARD_INTL', 'CARGO_FREIGHT', 'ECOMMERCE', 'BUSINESS_LOGISTICS', 'DOOR_TO_DOOR']
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
const mapSrc = (lat: number, lon: number) => `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.55}%2C${lat - 0.35}%2C${lon + 0.55}%2C${lat + 0.35}&layer=mapnik&marker=${lat}%2C${lon}`
const numberOrUndefined = (value: string) => value.trim() === '' ? undefined : Number(value)

const blankShipment = {
  trackingNumber: '', serviceType: 'EXPRESS_INTL', senderName: '', senderAddress: '', senderCity: '', senderCountry: '',
  receiverName: '', receiverAddress: '', receiverCity: '', receiverCountry: '', weightKg: '1', estimatedDelivery: '',
  senderLatitude: '', senderLongitude: '', receiverLatitude: '', receiverLongitude: '',
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [shipments, setShipments] = useState<ShipmentRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selectedNumber, setSelectedNumber] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [shipmentForm, setShipmentForm] = useState(blankShipment)
  const [scan, setScan] = useState({ status: 'IN_TRANSIT', location: '', facility: '', description: '', latitude: '', longitude: '', signedBy: '', estimatedDelivery: '' })

  const selected = shipments.find(shipment => shipment.trackingNumber === selectedNumber) ?? shipments[0]
  const visible = useMemo(() => shipments.filter(shipment => {
    const text = `${shipment.trackingNumber} ${shipment.senderName} ${shipment.senderCity} ${shipment.receiverCity} ${shipment.receiverCountry}`.toLowerCase()
    return (!query || text.includes(query.toLowerCase())) && (statusFilter === 'ALL' || shipment.status === statusFilter)
  }), [shipments, query, statusFilter])

  const loadShipments = async () => {
    const response = await fetch('/api/admin/shipments', { credentials: 'same-origin' })
    const payload = await response.json()
    if (response.status === 401) { setAuthenticated(false); return }
    if (!response.ok) throw new Error(payload.error || 'Could not load shipments.')
    setShipments(payload.shipments)
    setCounts(payload.counts)
    setSelectedNumber(current => payload.shipments.some((shipment: ShipmentRow) => shipment.trackingNumber === current) ? current : payload.shipments[0]?.trackingNumber ?? '')
  }

  useEffect(() => {
    fetch('/api/admin/auth', { credentials: 'same-origin' })
      .then(response => response.json())
      .then(result => { setAuthenticated(result.authenticated); if (result.authenticated) return loadShipments() })
      .catch(cause => setError(cause instanceof Error ? cause.message : 'Admin service unavailable.'))
      .finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    if (!authenticated) return
    const timer = window.setInterval(() => loadShipments().catch(() => {}), 30000)
    return () => window.clearInterval(timer)
  }, [authenticated])

  useEffect(() => {
    if (!selected) return
    const latest = selected.events[0]
    setScan({
      status: selected.status,
      location: latest?.location ?? `${selected.senderCity}, ${selected.senderCountry}`,
      facility: latest?.facility ?? '', description: '', latitude: latest?.latitude == null ? '' : String(latest.latitude),
      longitude: latest?.longitude == null ? '' : String(latest.longitude), signedBy: selected.signedBy ?? '', estimatedDelivery: '',
    })
  }, [selectedNumber, shipments])

  const signIn = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const response = await fetch('/api/admin/auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not sign in.')
      setAuthenticated(true); setPassword(''); await loadShipments()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in.') }
    finally { setBusy(false) }
  }

  const signOut = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE', credentials: 'same-origin' })
    setAuthenticated(false); setShipments([])
  }

  const createShipment = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    const form = shipmentForm
    const body = {
      ...form, trackingNumber: form.trackingNumber.trim().toUpperCase(), weightKg: Number(form.weightKg),
      estimatedDelivery: form.estimatedDelivery || undefined,
      senderLatitude: numberOrUndefined(form.senderLatitude), senderLongitude: numberOrUndefined(form.senderLongitude),
      receiverLatitude: numberOrUndefined(form.receiverLatitude), receiverLongitude: numberOrUndefined(form.receiverLongitude),
    }
    try {
      const response = await fetch('/api/admin/shipments', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not create shipment.')
      setNotice(`Shipment ${payload.shipment.trackingNumber} created.`); setShowCreate(false); setShipmentForm(blankShipment)
      await loadShipments(); setSelectedNumber(payload.shipment.trackingNumber)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create shipment.') }
    finally { setBusy(false) }
  }

  const addScan = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return
    setBusy(true); setError(''); setNotice('')
    const body = {
      trackingNumber: selected.trackingNumber, status: scan.status, location: scan.location, facility: scan.facility || undefined,
      description: scan.description, latitude: numberOrUndefined(scan.latitude), longitude: numberOrUndefined(scan.longitude),
      signedBy: scan.status === 'DELIVERED' ? scan.signedBy || undefined : undefined,
      estimatedDelivery: scan.estimatedDelivery || undefined,
    }
    try {
      const response = await fetch('/api/admin/shipments', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not record this shipment update.')
      setNotice(`${selected.trackingNumber} updated to ${label(payload.shipment.status)}.`)
      setScan(current => ({ ...current, description: '', estimatedDelivery: '' }))
      await loadShipments()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update shipment.') }
    finally { setBusy(false) }
  }

  if (checking) return <PageFrame eyebrow="ADMIN CONTROL CENTER" title={<>Operations,<br/><span>at a glance.</span></>} description="Securely manage shipments and scan updates."><div className="admin-loading">Checking admin access…</div></PageFrame>

  if (!authenticated) return <PageFrame eyebrow="RESTRICTED ACCESS" title={<>EMSXpress<br/><span>admin sign in.</span></>} description="Sign in to manage shipment records, scan events, and delivery status."><form className="admin-login portal-panel" onSubmit={signIn}><span className="admin-lock"><ShieldCheck size={22}/></span><h2>Administrator access</h2><p>Your password is checked securely by the server. The browser never stores it.</p><label>ADMIN PASSWORD<input autoComplete="current-password" type="password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your admin password"/></label>{error && <div className="admin-alert error"><AlertTriangle size={15}/>{error}</div>}<button className="button button-accent" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to admin'} <ArrowRight size={15}/></button><small className="admin-secure-note"><ShieldCheck size={13}/> Protected session · expires after 8 hours</small></form></PageFrame>

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  const inTransit = (counts.IN_TRANSIT ?? 0) + (counts.OUT_FOR_DELIVERY ?? 0)
  const exceptions = (counts.EXCEPTION ?? 0) + (counts.CUSTOMS_HOLD ?? 0)
  const delivered = counts.DELIVERED ?? 0
  const latest = selected?.events[0]
  const mapLatitude = latest?.latitude ?? selected?.senderLatitude
  const mapLongitude = latest?.longitude ?? selected?.senderLongitude

  return <PageFrame eyebrow="EMSXPRESS ADMIN" title={<>Operations,<br/><span>at a glance.</span></>} description="Manage your shipment records and publish scan updates to customer tracking.">
    <div className="admin-toolbar"><div className="admin-live"><i/> Admin session active <span>·</span> Data refreshes every 30 seconds</div><div><a className="admin-toolbar-link" href="/">Public site <ArrowRight size={14}/></a><button className="admin-toolbar-button" onClick={() => loadShipments().catch(cause => setError(cause.message))}><RefreshCw size={14}/> Refresh</button><button className="admin-toolbar-button" onClick={signOut}><LogOut size={14}/> Sign out</button></div></div>
    {notice && <div className="admin-alert success"><Check size={15}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    {error && <div className="admin-alert error"><AlertTriangle size={15}/>{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

    <section className="admin-metrics">
      <article><span className="admin-metric-icon blue"><Box size={17}/></span><small>ALL SHIPMENTS</small><b>{total}</b><em>In the shipment database</em></article>
      <article><span className="admin-metric-icon amber"><Truck size={17}/></span><small>IN MOTION</small><b>{inTransit}</b><em>In transit or out for delivery</em></article>
      <article><span className="admin-metric-icon green"><PackageCheck size={17}/></span><small>DELIVERED</small><b>{delivered}</b><em>Completed consignments</em></article>
      <article><span className="admin-metric-icon red"><AlertTriangle size={17}/></span><small>NEEDS ATTENTION</small><b>{exceptions}</b><em>Exceptions and customs holds</em></article>
    </section>

    <div className="admin-workspace">
      <section className="admin-shipments portal-panel">
        <div className="admin-panel-heading"><div><span className="eyebrow"><span className="eyebrow-icon"><Activity size={14}/></span> SHIPMENT CONTROL</span><h2>All shipments <span>{total}</span></h2></div><button className="button button-accent small" onClick={() => { setShowCreate(value => !value); setError('') }}><Plus size={15}/>{showCreate ? 'Close form' : 'New shipment'}</button></div>
        {showCreate && <form className="admin-create" onSubmit={createShipment}>
          <div className="admin-form-title"><b>Create shipment</b><small>Creates a shipment and initial label scan.</small></div>
          <div className="admin-form-grid">
            <label>TRACKING NUMBER<input required minLength={6} value={shipmentForm.trackingNumber} onChange={e => setShipmentForm({ ...shipmentForm, trackingNumber: e.target.value })} placeholder="EMS-2048-7322"/></label>
            <label>SERVICE<select value={shipmentForm.serviceType} onChange={e => setShipmentForm({ ...shipmentForm, serviceType: e.target.value })}>{services.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
            <label>SENDER NAME<input required value={shipmentForm.senderName} onChange={e => setShipmentForm({ ...shipmentForm, senderName: e.target.value })}/></label>
            <label>SENDER ADDRESS<input required value={shipmentForm.senderAddress} onChange={e => setShipmentForm({ ...shipmentForm, senderAddress: e.target.value })}/></label>
            <label>ORIGIN CITY<input required value={shipmentForm.senderCity} onChange={e => setShipmentForm({ ...shipmentForm, senderCity: e.target.value })}/></label>
            <label>ORIGIN COUNTRY<input required value={shipmentForm.senderCountry} onChange={e => setShipmentForm({ ...shipmentForm, senderCountry: e.target.value })}/></label>
            <label>RECEIVER NAME<input required value={shipmentForm.receiverName} onChange={e => setShipmentForm({ ...shipmentForm, receiverName: e.target.value })}/></label>
            <label>RECEIVER ADDRESS<input required value={shipmentForm.receiverAddress} onChange={e => setShipmentForm({ ...shipmentForm, receiverAddress: e.target.value })}/></label>
            <label>DESTINATION CITY<input required value={shipmentForm.receiverCity} onChange={e => setShipmentForm({ ...shipmentForm, receiverCity: e.target.value })}/></label>
            <label>DESTINATION COUNTRY<input required value={shipmentForm.receiverCountry} onChange={e => setShipmentForm({ ...shipmentForm, receiverCountry: e.target.value })}/></label>
            <label>WEIGHT (KG)<input required type="number" min="0.01" step="0.01" value={shipmentForm.weightKg} onChange={e => setShipmentForm({ ...shipmentForm, weightKg: e.target.value })}/></label>
            <label>ESTIMATED DELIVERY<input type="date" value={shipmentForm.estimatedDelivery} onChange={e => setShipmentForm({ ...shipmentForm, estimatedDelivery: e.target.value })}/></label>
          </div>
          <details className="admin-coordinates"><summary>Optional map coordinates</summary><div className="admin-form-grid"><label>ORIGIN LATITUDE<input type="number" step="any" value={shipmentForm.senderLatitude} onChange={e => setShipmentForm({ ...shipmentForm, senderLatitude: e.target.value })}/></label><label>ORIGIN LONGITUDE<input type="number" step="any" value={shipmentForm.senderLongitude} onChange={e => setShipmentForm({ ...shipmentForm, senderLongitude: e.target.value })}/></label><label>DESTINATION LATITUDE<input type="number" step="any" value={shipmentForm.receiverLatitude} onChange={e => setShipmentForm({ ...shipmentForm, receiverLatitude: e.target.value })}/></label><label>DESTINATION LONGITUDE<input type="number" step="any" value={shipmentForm.receiverLongitude} onChange={e => setShipmentForm({ ...shipmentForm, receiverLongitude: e.target.value })}/></label></div></details>
          <button className="button button-accent small" disabled={busy}>{busy ? 'Creating…' : 'Create shipment'} <ArrowRight size={14}/></button>
        </form>}
        <div className="admin-filters"><label><Search size={15}/><input placeholder="Search tracking, sender, destination" value={query} onChange={e => setQuery(e.target.value)}/></label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option>{statuses.map(status => <option key={status} value={status}>{label(status)}</option>)}</select></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>SHIPMENT</th><th>DESTINATION</th><th>STATUS</th><th>UPDATED</th><th/></tr></thead><tbody>{visible.map(shipment => <tr key={shipment.trackingNumber} className={selected?.trackingNumber === shipment.trackingNumber ? 'selected' : ''} onClick={() => setSelectedNumber(shipment.trackingNumber)}><td><b>{shipment.trackingNumber}</b><small>{label(shipment.serviceType)}</small></td><td><b>{shipment.receiverCity}</b><small>{shipment.receiverCountry}</small></td><td><span className={`status-pill status-${shipment.status.toLowerCase()}`}><i/>{label(shipment.status)}</span></td><td>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(shipment.updatedAt))}</td><td><ChevronRight size={15}/></td></tr>)}</tbody></table>{visible.length === 0 && <div className="admin-empty">No shipments match this search.</div>}</div>
        <div className="admin-table-foot">Showing up to 250 most recently updated shipments.</div>
      </section>

      <aside className="admin-detail portal-panel">
        {!selected ? <div className="admin-empty-detail"><Box size={25}/><b>Select a shipment</b><span>Shipment details and scan controls will appear here.</span></div> : <>
          <div className="admin-detail-head"><span className={`status-pill status-${selected.status.toLowerCase()}`}><i/>{label(selected.status)}</span><h2>{selected.trackingNumber}</h2><p>{label(selected.serviceType)} · {selected.weightKg} kg</p></div>
          <div className="admin-route"><div><small>ORIGIN</small><b>{selected.senderCity}</b><span>{selected.senderCountry}</span></div><ArrowRight size={16}/><div><small>DESTINATION</small><b>{selected.receiverCity}</b><span>{selected.receiverCountry}</span></div></div>
          <section className="admin-detail-map"><div className="admin-subhead"><b><MapPin size={14}/> Latest scan location</b><small>Scan-based</small></div>{mapLatitude != null && mapLongitude != null ? <iframe title={`Latest scan map for ${selected.trackingNumber}`} loading="lazy" src={mapSrc(mapLatitude, mapLongitude)}/> : <div className="admin-map-empty">Add scan coordinates to show a map location.</div>}<span>{latest?.location ?? `${selected.senderCity}, ${selected.senderCountry}`}</span></section>
          <form className="admin-scan-form" onSubmit={addScan}><div className="admin-subhead"><b><Activity size={14}/> Publish tracking update</b><small>Creates a timestamped scan</small></div>
            <label>NEW STATUS<select required value={scan.status} onChange={e => setScan({ ...scan, status: e.target.value })}>{statuses.map(status => <option key={status} value={status}>{label(status)}</option>)}</select></label>
            <label>LOCATION<input required value={scan.location} onChange={e => setScan({ ...scan, location: e.target.value })} placeholder="City, country or facility"/></label>
            <label>FACILITY<input value={scan.facility} onChange={e => setScan({ ...scan, facility: e.target.value })} placeholder="Gateway or service center"/></label>
            <label>SCAN DESCRIPTION<textarea required minLength={3} rows={3} value={scan.description} onChange={e => setScan({ ...scan, description: e.target.value })} placeholder="What happened at this scan?"/></label>
            <div className="admin-coord-row"><label>LATITUDE<input type="number" step="any" value={scan.latitude} onChange={e => setScan({ ...scan, latitude: e.target.value })} placeholder="40.7128"/></label><label>LONGITUDE<input type="number" step="any" value={scan.longitude} onChange={e => setScan({ ...scan, longitude: e.target.value })} placeholder="-74.0060"/></label></div>
            {scan.status === 'DELIVERED' && <label>RECEIVED BY<input value={scan.signedBy} onChange={e => setScan({ ...scan, signedBy: e.target.value })} placeholder="Recipient name"/></label>}
            <label>UPDATE DELIVERY ESTIMATE <span className="admin-optional">OPTIONAL</span><input type="date" value={scan.estimatedDelivery} onChange={e => setScan({ ...scan, estimatedDelivery: e.target.value })}/></label>
            <button className="button button-accent" disabled={busy}>{busy ? 'Saving scan…' : 'Save shipment update'} <ArrowRight size={14}/></button>
          </form>
          <div className="admin-event-list"><div className="admin-subhead"><b><Clock3 size={14}/> Recent scans</b><small>{selected.events.length}</small></div>{selected.events.slice(0, 5).map(event => <div className="admin-event" key={event.id}><i/><span><b>{label(event.status)}</b><small>{event.location} · {event.description}</small></span><time>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(event.timestamp))}</time></div>)}</div>
        </>}
      </aside>
    </div>
    <div className="admin-security-note"><ShieldCheck size={14}/> Shipment changes are validated on the server and recorded as scan events. <span>Customers see updates on their tracking page.</span></div>
  </PageFrame>
}
