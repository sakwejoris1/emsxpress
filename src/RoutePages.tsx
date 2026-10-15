import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react'
import { PageFrame } from './Layout'
import ShippingPage from './pages/ShippingPage'
import RegisterPage from './pages/RegisterPage'
import AboutPage from './pages/AboutPage'
import AdminPage from './pages/AdminPage'
import { ArrowRight, BadgeCheck, Box, Building2, Check, ChevronRight, Clock3, Download, FileUp, Globe2, Headphones, MapPin, PackageCheck, Plane, Search, ShieldCheck, Ship, Truck, X } from 'lucide-react'

type TrackingEvent = { id: string; status: string; location: string; facility: string | null; description: string; latitude: number | null; longitude: number | null; timestamp: string }
type ShipmentResult = {
  trackingNumber: string; serviceType: string; status: string
  senderCity: string; senderCountry: string; senderLatitude: number | null; senderLongitude: number | null
  receiverCity: string; receiverCountry: string; receiverLatitude: number | null; receiverLongitude: number | null
  estimatedDelivery: string | null; signedBy: string | null; deliveredAt: string | null; events: TrackingEvent[]
}

const statusLabel = (status: string) => status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const formatDate = (date: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
const mapUrl = (latitude: number, longitude: number) => {
  const left = longitude - 0.55, right = longitude + 0.55
  const bottom = Math.max(-85, latitude - 0.35), top = Math.min(85, latitude + 0.35)
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`
}

const locations = [
  { name: 'Jersey City Service Center', address: '1200 Harbor Point Drive, Jersey City, NJ 07305', type: 'Service center', hours: 'Mon–Fri 07:00–19:00 · Sat 08:00–14:00', cutoff: 'Express cutoff 17:30', lat: 40.711, lon: -74.064 },
  { name: 'Manhattan Midtown Depot', address: '350 W 31st Street, New York, NY 10001', type: 'Depot', hours: 'Mon–Fri 08:00–20:00 · Sat 09:00–16:00', cutoff: 'Express cutoff 18:00', lat: 40.750, lon: -73.994 },
  { name: 'Brooklyn Atlantic Counter', address: '410 Atlantic Avenue, Brooklyn, NY 11217', type: 'Drop-off counter', hours: 'Mon–Fri 08:30–18:00 · Sat 09:00–13:00', cutoff: 'Express cutoff 16:30', lat: 40.686, lon: -73.979 },
  { name: 'Newark Gateway Hub', address: '55 Brewster Road, Newark, NJ 07114', type: 'Gateway hub', hours: 'Open 24 hours', cutoff: 'Last acceptance 21:00', lat: 40.689, lon: -74.174 },
]

const faqs = [
  ['Customs', 'What paperwork do I need for international shipping?', 'Most international shipments need a completed commercial invoice with an accurate description, quantity, and value for each item. Some commodities need permits or additional certificates.'],
  ['Packaging', 'How should I package a shipment?', 'Use a rigid, appropriately sized box with cushioning on all sides. Seal every opening with shipping tape and remove old labels. Pallets should be stable, wrapped, and accessible for forklift handling.'],
  ['Claims', 'How do I report a damaged or missing shipment?', 'Contact our claims team with the tracking number, photos of the packaging and contents, and proof of value. Reporting promptly helps us investigate with the handling facility.'],
  ['Prohibited items', 'Are there items I cannot send?', 'Dangerous goods, counterfeit goods, cash, weapons, and certain perishables are restricted or prohibited. Rules vary by destination; ask our team before tendering uncertain items.'],
]

function TrackPage() {
  const initialNumber = decodeURIComponent(window.location.pathname.split('/').filter(Boolean)[1] || new URLSearchParams(window.location.search).get('numbers') || '')
  const [numbers, setNumbers] = useState(initialNumber || 'EMS-2048-7319')
  const [searched, setSearched] = useState(true)
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
    <form className="portal-panel track-search-panel" onSubmit={submit}><label className="portal-label" htmlFor="tracking-ids">TRACKING NUMBERS <span>Up to 10 · separate with commas or new lines</span></label><div className="portal-search-row"><textarea id="tracking-ids" value={numbers} onChange={e => setNumbers(e.target.value)} placeholder="EMS-2048-7319, EMS-2048-7320" rows={2}/><button className="button button-accent" type="submit"><Search size={15}/> Track shipment{trackingNumbers.length > 1 ? 's' : ''}</button></div>{error && <p className="form-error">{error}</p>}</form>
    {loading && <div className="portal-panel tracking-message">Loading the latest shipment scans…</div>}
    {apiError && <div className="portal-panel tracking-message tracking-error">{apiError}</div>}
    {searched && shipments.map((shipment, idx) => {
      const number = trackingNumbers[idx]
      if (!shipment) return <div className="portal-panel tracking-message" key={number}><b>{number}</b> was not found. Check the number and try again.</div>
      const latest = shipment.events[0]
      const latitude = latest?.latitude ?? shipment.senderLatitude
      const longitude = latest?.longitude ?? shipment.senderLongitude
      return <article className="portal-panel shipment-result" key={shipment.trackingNumber}>
        <div className="shipment-result-head"><div><span className={`status-pill status-${shipment.status.toLowerCase()}`}><i/> {statusLabel(shipment.status)}</span><h2>{shipment.trackingNumber}</h2><small>{statusLabel(shipment.serviceType)}{latest ? ` · Updated ${formatDate(latest.timestamp)}` : ''}</small></div><div className="estimate-block"><span>ESTIMATED DELIVERY</span><b>{shipment.estimatedDelivery ? new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date(shipment.estimatedDelivery)) : 'To be confirmed'}</b><small>{shipment.status === 'DELIVERED' ? `Delivered ${shipment.deliveredAt ? formatDate(shipment.deliveredAt) : ''}` : 'Delivery estimate from shipment record'}</small></div></div>
        <div className="shipment-route-card"><div><span className="route-dot-blue"/><small>ORIGIN</small><b>{shipment.senderCity}</b><span>{shipment.senderCountry}</span></div><div className="portal-route-line"><Plane size={16}/><i/><i/><i/><i/><i/></div><div><span className="route-dot-amber"/><small>DESTINATION</small><b>{shipment.receiverCity}</b><span>{shipment.receiverCountry}</span></div></div>
        <section className="tracking-map-card"><div className="tracking-map-head"><span><MapPin size={16}/><b>Current shipment location</b></span><small>Refreshes every 30 seconds from latest scan</small></div>{latitude !== null && longitude !== null ? <iframe className="tracking-osm-map" title={`Live shipment map for ${shipment.trackingNumber}`} loading="lazy" src={mapUrl(latitude, longitude)}/> : <div className="tracking-map-empty">Map location will appear when the next scan includes coordinates.</div>}<div className="tracking-map-caption"><span>{latest?.location ?? `${shipment.senderCity}, ${shipment.senderCountry}`}</span>{latitude !== null && longitude !== null && <a href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=8/${latitude}/${longitude}`} target="_blank" rel="noreferrer">Open larger map <ArrowRight size={13}/></a>}</div></section>
        <h3 className="timeline-heading">Shipment progress <span>{shipment.events.length} scans</span></h3><div className="portal-timeline tracking-timeline">{shipment.events.length ? shipment.events.map((event, i) => <div className={`portal-event ${i === 0 ? 'current' : 'complete'}`} key={event.id}><span className="portal-event-marker">{i === 0 ? <i/> : <Check size={11}/>}</span><div><b>{statusLabel(event.status)}</b><small>{event.description}{event.facility ? ` · ${event.facility}` : ''} · {event.location}</small></div><time>{formatDate(event.timestamp)}</time></div>) : <p>No scan events are recorded yet.</p>}</div>
        {shipment.status === 'DELIVERED' && <div className="shipment-result-foot"><span><ShieldCheck size={14}/> Signed by {shipment.signedBy || 'recipient'}</span><button className="text-link" onClick={() => window.print()}>Print tracking details <Download size={14}/></button></div>}
      </article>
    })}
  </PageFrame>
}

function QuotePage() {
  const [unit, setUnit] = useState<'cm' | 'in'>('cm')
  const [weight, setWeight] = useState('1')
  const [length, setLength] = useState('25')
  const [width, setWidth] = useState('18')
  const [height, setHeight] = useState('8')
  const [packageType, setPackageType] = useState('Parcel')
  const [showRates, setShowRates] = useState(false)
  const dimWeight = Number(length || 0) * Number(width || 0) * Number(height || 0) / (unit === 'cm' ? 5000 : 305); const billable = Math.max(Number(weight || 0), dimWeight)
  const dimensions: [string, string, (value: string) => void][] = [['LENGTH', length, setLength], ['WIDTH', width, setWidth], ['HEIGHT', height, setHeight]]
  const rates = [{ name: 'Express International', icon: Plane, days: '2–4 business days', price: 24 + billable * 12.5, badge: 'FASTEST' }, { name: 'Standard International', icon: Globe2, days: '4–8 business days', price: 16 + billable * 8.25, badge: 'BEST VALUE' }, { name: 'Cargo & Freight', icon: Ship, days: '6–12 business days', price: 10 + billable * 5.4, badge: 'ECONOMY' }]
  return <PageFrame eyebrow="INSTANT SHIPPING ESTIMATE" title={<>Plan the journey.<br/><span>Know the cost.</span></>} description="Enter your route and package details to compare estimated service rates and transit windows.">
    <div className="quote-layout"><form className="portal-panel quote-calculator" onSubmit={e => { e.preventDefault(); setShowRates(true) }}><h2>Shipment details</h2><p>All fields marked with * are required.</p><div className="form-grid"><label>ORIGIN COUNTRY *<select defaultValue="United States"><option>United States</option><option>United Kingdom</option><option>Cameroon</option><option>Canada</option><option>Germany</option></select></label><label>ORIGIN POSTAL CODE *<input required placeholder="e.g. 07305"/></label><label>DESTINATION COUNTRY *<select defaultValue="United Kingdom"><option>United Kingdom</option><option>United States</option><option>Cameroon</option><option>Canada</option><option>Germany</option></select></label><label>DESTINATION POSTAL CODE *<input required placeholder="e.g. SW1A 1AA"/></label><label>PACKAGE TYPE<select value={packageType} onChange={e => setPackageType(e.target.value)}>{['Document','Parcel','Pallet','Container'].map(p => <option key={p}>{p}</option>)}</select></label><label>WEIGHT *<span className="input-with-unit"><input required min="0.1" step="0.1" type="number" value={weight} onChange={e => setWeight(e.target.value)}/><em>kg</em></span></label><div className="dimension-label">PACKAGE DIMENSIONS <div className="unit-switch"><button type="button" className={unit === 'cm' ? 'selected' : ''} onClick={() => setUnit('cm')}>cm</button><button type="button" className={unit === 'in' ? 'selected' : ''} onClick={() => setUnit('in')}>in</button></div></div>{dimensions.map(([label,value,setter])=><label key={label}>{label}<span className="input-with-unit"><input min="1" type="number" value={value} onChange={e => setter(e.target.value)}/><em>{unit}</em></span></label>)}</div><div className="dim-note"><BadgeCheck size={15}/> Billable weight is calculated from actual and dimensional weight.</div><button className="button button-accent calculate-btn" type="submit">Calculate my rates <ArrowRight size={15}/></button></form>
      <aside className="quote-aside"><div className="quote-aside-top"><span className="eyebrow light"><span className="eyebrow-icon"><PackageCheck size={14}/></span> RATE COMPARISON</span><h2>Move at your<br/>own pace.</h2><p>See the best service for your shipment, with clear delivery windows and no surprises.</p></div><div className="rate-box">{showRates ? rates.map(({name,icon:Icon,days,price,badge})=><div className="rate-row" key={name}><span className="rate-icon"><Icon size={17}/></span><div><b>{name}</b><small>{days} · {badge}</small></div><strong>${price.toFixed(2)}</strong></div>) : <div className="rate-placeholder"><Box size={27}/><b>Your rates will appear here</b><small>Complete the shipment details to compare available services.</small></div>}</div><small className="rate-disclaimer">Estimates shown in USD. Duties, taxes, and surcharges may apply.</small></aside></div>
  </PageFrame>
}

function LocationsPage() {
  const [query, setQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(locations[0])
  const filtered = locations.filter(l => `${l.name} ${l.address} ${l.type}`.toLowerCase().includes(query.toLowerCase()))
  return <PageFrame eyebrow="SERVICE POINT LOCATOR" title={<>Close to your business.<br/><span>Connected to the world.</span></>} description="Find staffed counters, gateways, and depots. Search by city or postal code to plan a drop-off.">
    <div className="locations-toolbar"><label className="location-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search city, postal code, or location"/><button aria-label="Clear search" onClick={() => setQuery('')} type="button"><X size={15}/></button></label><span>{filtered.length} locations near New York</span></div><div className="locations-layout"><div className="location-list">{filtered.length ? filtered.map((location,i)=><article className={`location-card ${selectedLocation.name===location.name?'location-selected':''}`} key={location.name}><div className="location-card-top"><span className="location-type"><MapPin size={13}/>{location.type}</span><span className="distance">{(1.4 + i * 2.3).toFixed(1)} mi</span></div><h2>{location.name}</h2><p>{location.address}</p><div className="location-hours"><Clock3 size={14}/><span>{location.hours}<small>{location.cutoff}</small></span></div><div className="location-actions"><button className="text-link" onClick={()=>setSelectedLocation(location)}>Show on map <MapPin size={13}/></button><a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`} target="_blank" rel="noreferrer">Directions <ArrowRight size={14}/></a></div></article>) : <div className="portal-panel no-results">No service points match “{query}”. Try a nearby city or postal code.</div>}</div><div className="map-panel map-live"><iframe className="osm-map" title={`Interactive map centered on ${selectedLocation.name}`} loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=-74.25%2C40.55%2C-73.65%2C40.90&layer=mapnik&marker=${selectedLocation.lat}%2C${selectedLocation.lon}`}/><span className="map-map-label">NEW YORK METRO AREA <i/> LIVE MAP</span><div className="map-legend"><i/><span>{selectedLocation.name}</span></div><a className="map-external" href={`https://www.openstreetmap.org/?mlat=${selectedLocation.lat}&mlon=${selectedLocation.lon}#map=15/${selectedLocation.lat}/${selectedLocation.lon}`} target="_blank" rel="noreferrer">Open larger map <ArrowRight size={13}/></a></div></div>
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

function DashboardPage() {
  const [manifest, setManifest] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [fileName, setFileName] = useState('')
  const importManifest = (e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setFileName(file.name); const reader = new FileReader(); reader.onload = () => { const rows = String(reader.result).split(/\r?\n/).filter(Boolean); setManifest(rows.slice(1).map((row,i)=>row.split(',')[0]?.trim() || `EMS-NEW-${i+1}`).filter(Boolean)); setNotice(`${Math.max(rows.length-1,0)} shipment rows imported from ${file.name}.`) }; reader.readAsText(file) }
  const downloadManifest = () => { const csv = ['Tracking number,Service,Status,Destination','EMS-2048-7319,Express International,In Transit,London UK',...manifest.map(id=>`${id},Standard International,Label Created,Pending`)].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = 'emsxpress-manifest.csv'; a.click(); URL.revokeObjectURL(a.href) }
  const downloadInvoice = () => { const csv = ['EMSXpress monthly invoice','Invoice number,EMS-2026-10-0842','Billing period,October 2026','Due date,November 15 2026','Account,Acme Supply Co.','','Description,Amount USD','International shipping services,8420.00','Total due,8420.00'].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = 'emsxpress-invoice-october-2026.csv'; a.click(); URL.revokeObjectURL(a.href) }
  return <PageFrame eyebrow="BUSINESS SHIPPER PORTAL" title={<>Good morning, Alex.<br/><span>Here’s your operation.</span></>} description="Your shipments, shipping activity, and account tools in one place."><div className="demo-banner"><ShieldCheck size={15}/> Demo workspace · data shown is illustrative</div><div className="dashboard-kpis"><div><span>ACTIVE SHIPMENTS</span><b>248</b><small>↗ 12.8% vs last month</small></div><div><span>IN TRANSIT</span><b>186</b><small>72% of active shipments</small></div><div><span>DELIVERED THIS MONTH</span><b>1,402</b><small>↗ 8.2% vs last month</small></div><div><span>ON-TIME DELIVERY</span><b>98.4%</b><small>Across all services</small></div></div><div className="dashboard-columns"><section className="portal-panel manifest-panel"><div className="panel-heading"><div><h2>Shipment manifest</h2><p>Upload a CSV to create multiple shipping labels.</p></div><button className="button button-dark small" onClick={downloadManifest}><Download size={14}/> Export CSV</button></div><label className="upload-zone"><input type="file" accept=".csv,.txt" onChange={importManifest}/><span><FileUp size={22}/></span><b>{fileName || 'Drop a CSV here or browse files'}</b><small>CSV format · up to 5,000 rows · Max 10 MB</small></label>{notice && <div className="upload-notice"><Check size={14}/>{notice}</div>}<div className="manifest-preview"><span>TRACKING NUMBER</span><span>SERVICE</span><span>STATUS</span>{['EMS-2048-7319','EMS-2048-7320',...manifest.slice(0,4)].map((id,i)=><div className="manifest-row" key={`${id}-${i}`}><b>{id}</b><span>{i === 0 ? 'Express Intl.' : 'Standard Intl.'}</span><span className={i < 2 ? 'manifest-status' : ''}>{i===0?'In transit':i===1?'Collected':'Label created'}</span></div>)}</div></section><aside className="portal-panel account-panel"><div className="panel-heading"><div><h2>Account overview</h2><p>Business shipper · Acme Supply Co.</p></div><Building2 size={18}/></div><div className="account-stat"><span>MONTHLY CREDIT LIMIT</span><b>$25,000 <small>USD</small></b><div className="credit-bar"><i/></div><small>$8,420 used · $16,580 available</small></div><div className="invoice-row"><span><b>October invoice</b><small>Due November 15, 2026</small></span><strong>$8,420.00</strong></div><button className="download-invoice" onClick={downloadInvoice}>Download invoice <Download size={14}/></button><div className="account-help"><Headphones size={16}/><span><b>Your account manager</b><small>Jordan Lee · Business logistics</small></span><a href="mailto:business@emsxpress.com">Email</a></div></aside></div><div className="portal-panel active-shipments"><div className="panel-heading"><div><h2>Recent shipments</h2><p>Live overview of your latest activity.</p></div><a className="text-link" href="/tracking">View all shipments <ArrowRight size={14}/></a></div><div className="shipment-table"><div className="shipment-table-head"><span>TRACKING NUMBER</span><span>DESTINATION</span><span>SERVICE</span><span>STATUS</span><span>EST. DELIVERY</span></div>{[['EMS-2048-7319','London, UK','Express Intl.','In transit','Oct 18'],['EMS-2048-7320','Toronto, CA','Standard Intl.','Collected','Oct 20'],['EMS-2048-7321','Douala, CM','Express Intl.','Customs cleared','Oct 16']].map(([id,dest,service,status,date])=><div className="shipment-table-row" key={id}><b>{id}</b><span>{dest}</span><span>{service}</span><span><i className="table-status-dot"/>{status}</span><span>{date}</span></div>)}</div></div></PageFrame>
}

function HelpPage() {
  const [category, setCategory] = useState('All topics'); const [openFaq,setOpenFaq]=useState<number|null>(null);const [submitted,setSubmitted]=useState(false)
  const visible = faqs.filter(f => category === 'All topics' || f[0] === category)
  return <PageFrame eyebrow="HELP & SUPPORT" title={<>The right answer.<br/><span>From the right person.</span></>} description="Find quick guidance or send a message to the team best placed to help."><div className="support-layout"><div className="faq-panel"><div className="faq-filter">{['All topics','Customs','Packaging','Claims','Prohibited items'].map(c=><button className={category===c?'active':''} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div>{visible.map((faq,i)=><article className="help-faq" key={faq[1]}><button onClick={()=>setOpenFaq(openFaq===i?null:i)}><span><small>{faq[0]}</small><b>{faq[1]}</b></span><span>{openFaq===i?'−':'+'}</span></button>{openFaq===i&&<p>{faq[2]}</p>}</article>)}</div><form className="portal-panel contact-form" onSubmit={e=>{e.preventDefault();setSubmitted(true)}}><span className="eyebrow"><span className="eyebrow-icon"><Headphones size={14}/></span> CONTACT OUR TEAM</span><h2>How can we help?</h2><p>We’ll route your message to the right specialist.</p>{submitted?<div className="success-state"><span><Check size={20}/></span><b>Message received.</b><small>A specialist will be in touch within one business day.</small><button type="button" className="text-link" onClick={()=>setSubmitted(false)}>Send another message <ArrowRight size={14}/></button></div>:<><label>ROUTE TO<select defaultValue="Dispatch"><option>Dispatch</option><option>Claims</option><option>Sales</option></select></label><div className="form-grid"><label>YOUR NAME<input required placeholder="Full name"/></label><label>EMAIL ADDRESS<input required type="email" placeholder="you@company.com"/></label></div><label>TRACKING NUMBER <span className="optional">OPTIONAL</span><input placeholder="EMS-2048-7319"/></label><label>HOW CAN WE HELP?<textarea required rows={4} placeholder="Tell us a little about your request..."/></label><button className="button button-accent" type="submit">Send to support <ArrowRight size={15}/></button></>}</form></div><div className="support-contact-strip"><span><Headphones size={17}/><b>Speak to dispatch</b><a href="tel:+12125550142">+1 (212) 555-0142</a></span><span><Clock3 size={17}/><b>We're available</b><small>Mon–Fri 07:00–19:00 ET · Sat 08:00–14:00 ET</small></span><span><Globe2 size={17}/><b>Global support</b><small>Local expertise across 70+ cities</small></span></div></PageFrame>
}

export default function RoutePages() {
  const path = window.location.pathname.replace(/\/$/, '')
  if (path === '/admin') return <AdminPage/>
  if (path === '/tracking' || path.startsWith('/tracking/')) return <TrackPage/>
  if (path === '/quote' || path === '/ship') return <QuotePage/>
  if (path === '/shipping') return <ShippingPage/>
  if (path === '/register' || path === '/signup') return <RegisterPage/>
  if (path === '/company/about' || path === '/about') return <AboutPage/>
  if (path === '/locations') return <LocationsPage/>
  if (path === '/services') return <ServicesPage/>
  if (path === '/dashboard') return <DashboardPage/>
  if (path === '/help' || path === '/contact' || path === '/faqs') return <HelpPage/>
  return <PageFrame eyebrow="PAGE NOT FOUND" title={<>We lost this<br/><span>delivery route.</span></>} description="The page you’re looking for has moved. Find a service or head back to EMSXpress."><div className="portal-panel not-found"><a className="button button-accent" href="/">Back to home <ArrowRight size={15}/></a><a className="text-link" href="/tracking">Track a shipment <ChevronRight size={14}/></a></div></PageFrame>
}
