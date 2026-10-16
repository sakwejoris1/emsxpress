import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PageFrame } from './Layout'
import ShippingPage from './pages/ShippingPage'
import RegisterPage from './pages/RegisterPage'
import AboutPage from './pages/AboutPage'
import AdminPage from './pages/AdminPage'
import LiveQuotePage from './pages/LiveQuotePage'
import LiveLocationsPage from './pages/LiveLocationsPage'
import LiveHelpPage from './pages/LiveHelpPage'
import BusinessDashboardPage from './pages/BusinessDashboardPage'
import LoginPage from './pages/LoginPage'
import { ArrowRight, Box, Building2, Check, ChevronRight, Clock3, Download, Globe2, MapPin, Plane, Search, ShieldCheck, Ship, Truck } from 'lucide-react'

type TrackingEvent = { id: string; status: string; location: string; facility: string | null; description: string; latitude: number | null; longitude: number | null; timestamp: string }
type ShipmentPosition = { latitude: number; longitude: number; source: string; recordedAt: string }
type ShipmentResult = {
  trackingNumber: string; serviceType: string; status: string
  senderCity: string; senderCountry: string; senderLatitude: number | null; senderLongitude: number | null
  receiverCity: string; receiverCountry: string; receiverLatitude: number | null; receiverLongitude: number | null
  estimatedDelivery: string | null; signedBy: string | null; deliveredAt: string | null; events: TrackingEvent[]; currentPosition: ShipmentPosition | null
}

const statusLabel = (status: string) => status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const formatDate = (date: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
const mapUrl = (latitude: number, longitude: number) => {
  const left = longitude - 0.55, right = longitude + 0.55
  const bottom = Math.max(-85, latitude - 0.35), top = Math.min(85, latitude + 0.35)
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`
}

function TrackPage() {
  const initialNumber = decodeURIComponent(window.location.pathname.split('/').filter(Boolean)[1] || new URLSearchParams(window.location.search).get('numbers') || '')
  const [numbers, setNumbers] = useState(initialNumber)
  const [searched, setSearched] = useState(Boolean(initialNumber))
  const [error, setError] = useState('')
  const [shipments, setShipments] = useState<(ShipmentResult | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const trackingNumbers = useMemo(() => numbers.split(/[\n,]+/).map(n => n.trim()).filter(Boolean).slice(0, 10), [numbers])
  const numberKey = trackingNumbers.join(',')
  useEffect(() => {
    if (!searched || !numberKey) { setLoading(false); return }
    const controller = new AbortController()
    let firstLoad = true
    const refresh = async () => {
      try {
        const response = await fetch(`/api/track?numbers=${encodeURIComponent(numberKey)}`, { signal: controller.signal })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Tracking is temporarily unavailable.')
        setShipments(payload.shipments)
        setApiError('')
      } catch (cause) {
        if (!controller.signal.aborted) setApiError(cause instanceof Error ? cause.message : 'Could not load shipment tracking.')
      } finally {
        if (firstLoad) { firstLoad = false; setLoading(false) }
      }
    }
    setLoading(true)
    refresh()
    const timer = window.setInterval(refresh, 30000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [searched, numberKey])
  const submit = (e: FormEvent) => { e.preventDefault(); if (!trackingNumbers.length) { setError('Enter at least one tracking number.'); setSearched(false); return } setError(''); setSearched(true) }
  return <PageFrame eyebrow="SHIPMENT VISIBILITY" title={<>Every shipment.<br/><span>One clear picture.</span></>} description="Track one parcel or a full manifest. See scan events, delivery estimates, and exceptions in one place.">
    <form className="portal-panel track-search-panel" onSubmit={submit}><label className="portal-label" htmlFor="tracking-ids">TRACKING NUMBERS <span>Up to 10 · separate with commas or new lines</span></label><div className="portal-search-row"><textarea id="tracking-ids" value={numbers} onChange={e => setNumbers(e.target.value)} placeholder="Enter one or more tracking numbers" rows={2}/><button className="button button-accent" type="submit"><Search size={15}/> Track shipment{trackingNumbers.length > 1 ? 's' : ''}</button></div>{error && <p className="form-error">{error}</p>}</form>
    {loading && <div className="portal-panel tracking-message">Loading the latest shipment scans…</div>}
    {apiError && <div className="portal-panel tracking-message tracking-error">{apiError}</div>}
    {searched && shipments.map((shipment, idx) => {
      const number = trackingNumbers[idx]
      if (!shipment) return <div className="portal-panel tracking-message" key={number}><b>{number}</b> was not found. Check the number and try again.</div>
      const latest = shipment.events[0]
      const latitude = shipment.currentPosition?.latitude ?? latest?.latitude ?? shipment.senderLatitude
      const longitude = shipment.currentPosition?.longitude ?? latest?.longitude ?? shipment.senderLongitude
      const hasDevicePosition = Boolean(shipment.currentPosition)
      const devicePositionIsRecent = Boolean(shipment.currentPosition && Date.now() - new Date(shipment.currentPosition.recordedAt).getTime() < 20 * 60_000)
      return <article className="portal-panel shipment-result" key={shipment.trackingNumber}>
        <div className="shipment-result-head"><div><span className={`status-pill status-${shipment.status.toLowerCase()}`}><i/> {statusLabel(shipment.status)}</span><h2>{shipment.trackingNumber}</h2><small>{statusLabel(shipment.serviceType)}{latest ? ` · Updated ${formatDate(latest.timestamp)}` : ''}</small></div><div className="estimate-block"><span>ESTIMATED DELIVERY</span><b>{shipment.estimatedDelivery ? new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date(shipment.estimatedDelivery)) : 'To be confirmed'}</b><small>{shipment.status === 'DELIVERED' ? `Delivered ${shipment.deliveredAt ? formatDate(shipment.deliveredAt) : ''}` : 'Delivery estimate from shipment record'}</small></div></div>
        <div className="shipment-route-card"><div><span className="route-dot-blue"/><small>ORIGIN</small><b>{shipment.senderCity}</b><span>{shipment.senderCountry}</span></div><div className="portal-route-line"><Plane size={16}/><i/><i/><i/><i/><i/></div><div><span className="route-dot-amber"/><small>DESTINATION</small><b>{shipment.receiverCity}</b><span>{shipment.receiverCountry}</span></div></div>
        <section className="tracking-map-card"><div className="tracking-map-head"><span><MapPin size={16}/><b>{devicePositionIsRecent?'Live device location':hasDevicePosition?'Last device location':'Last recorded scan'}</b></span><small>Refreshes every 30 seconds{devicePositionIsRecent?` · ${shipment.currentPosition?.source}`:hasDevicePosition?' · Device coordinates':' · Scan coordinates'}</small></div>{latitude !== null && longitude !== null ? <iframe className="tracking-osm-map" title={`Shipment map for ${shipment.trackingNumber}`} loading="lazy" src={mapUrl(latitude, longitude)}/> : <div className="tracking-map-empty">Location appears when a device update or scan includes coordinates.</div>}<div className="tracking-map-caption"><span>{hasDevicePosition?`Device update ${formatDate(shipment.currentPosition!.recordedAt)}`:latest?.location ?? `${shipment.senderCity}, ${shipment.senderCountry}`}</span>{latitude !== null && longitude !== null && <a href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=8/${latitude}/${longitude}`} target="_blank" rel="noreferrer">Open larger map <ArrowRight size={13}/></a>}</div></section>
        <h3 className="timeline-heading">Shipment progress <span>{shipment.events.length} scans</span></h3><div className="portal-timeline tracking-timeline">{shipment.events.length ? shipment.events.map((event, i) => <div className={`portal-event ${i === 0 ? 'current' : 'complete'}`} key={event.id}><span className="portal-event-marker">{i === 0 ? <i/> : <Check size={11}/>}</span><div><b>{statusLabel(event.status)}</b><small>{event.description}{event.facility ? ` · ${event.facility}` : ''} · {event.location}</small></div><time>{formatDate(event.timestamp)}</time></div>) : <p>No scan events are recorded yet.</p>}</div>
        {shipment.status === 'DELIVERED' && <div className="shipment-result-foot"><span><ShieldCheck size={14}/> Signed by {shipment.signedBy || 'recipient'}</span><button className="text-link" onClick={() => window.print()}>Print tracking details <Download size={14}/></button></div>}
      </article>
    })}
  </PageFrame>
}

function ServicesPage() {
  const all = [
    { icon: Plane, title: 'Express International', eta: '2–4 business days', text: 'Priority air freight, earliest departure options, and next-flight-out recovery for urgent shipments.' },
    { icon: Globe2, title: 'Standard International', eta: '4–8 business days', text: 'Consolidated air and road linehaul for dependable cross-border delivery at a considered price.' },
    { icon: Ship, title: 'Cargo & Freight', eta: '6–28 days', text: 'Palletised air cargo, FCL and LCL ocean freight, and solutions for oversize or temperature-controlled goods.' },
    { icon: Box, title: 'E-commerce Delivery', eta: '3–6 business days', text: 'Storefront API integration, pick and pack, international delivery, and returns management.' },
    { icon: Building2, title: 'Business Logistics', eta: 'Scheduled to your operation', text: 'Scheduled trunking, warehousing, account support, and a single consolidated monthly invoice.' },
    { icon: Truck, title: 'Door-to-Door Delivery', eta: '3–7 business days', text: 'A complete service with pickup, customs brokerage, and a coordinated final mile to the receiver.' },
  ]
  return <PageFrame eyebrow="OUR SHIPPING SERVICES" title={<>One network.<br/><span>Every way forward.</span></>} description="Choose a service that fits your shipment, your schedule, and the promise you make to your customer."><div className="all-services-grid">{all.map(({icon:Icon,title,eta,text},i)=><article className="all-service-card" key={title}><div className="all-service-top"><span className="service-icon"><Icon size={20}/></span><span>0{i+1} / SERVICE</span></div><h2>{title}</h2><div className="service-time"><Clock3 size={14}/>{eta}</div><p>{text}</p><a className="text-link" href="/quote">Get a rate <ArrowRight size={14}/></a></article>)}</div><div className="service-callout"><div><span className="eyebrow light">NEED A CUSTOM SOLUTION?</span><h2>Let's design a better way to move.</h2><p>Our logistics specialists will work with your team on a network that fits your operation.</p></div><a className="button button-accent" href="/help">Talk to our team <ArrowRight size={15}/></a></div></PageFrame>
}

export default function RoutePages() {
  const path = window.location.pathname.replace(/\/$/, '')
  if (path === '/admin') return <AdminPage/>
  if (path === '/tracking' || path.startsWith('/tracking/')) return <TrackPage/>
  if (path === '/quote' || path === '/ship') return <LiveQuotePage/>
  if (path === '/shipping') return <ShippingPage/>
  if (path === '/register' || path === '/signup') return <RegisterPage/>
  if (path === '/login') return <LoginPage/>
  if (path === '/company/about' || path === '/about') return <AboutPage/>
  if (path === '/locations') return <LiveLocationsPage/>
  if (path === '/services') return <ServicesPage/>
  if (path === '/dashboard') return <BusinessDashboardPage/>
  if (path === '/help' || path === '/contact' || path === '/faqs') return <LiveHelpPage/>
  return <PageFrame eyebrow="PAGE NOT FOUND" title={<>We lost this<br/><span>delivery route.</span></>} description="The page you’re looking for has moved. Find a service or head back to EMSXpress."><div className="portal-panel not-found"><a className="button button-accent" href="/">Back to home <ArrowRight size={15}/></a><a className="text-link" href="/tracking">Track a shipment <ChevronRight size={14}/></a></div></PageFrame>
}
