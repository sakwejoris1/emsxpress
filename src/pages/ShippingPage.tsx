import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { AlertTriangle, ArrowRight, Check, ClipboardList, Clock3, Info, MapPin, Truck } from 'lucide-react'
import { images } from '../images'
import { SiteFooter, SiteHeader } from '../Layout'

const countries = ['United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'Cameroon', 'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'United Arab Emirates', 'Singapore', 'Hong Kong', 'China', 'Japan', 'Australia', 'India', 'Brazil', 'Mexico']
const services = ['Express International', 'Standard International', 'Cargo & Freight', 'E-commerce Delivery', 'Business Logistics', 'Door-to-Door Delivery']
const contents = ['Parcel', 'Document', 'Pallet', 'Freight', 'Fragile Goods', 'Perishable']
const steps = [
  { icon: ClipboardList, title: 'Tell us the shipment', text: 'Route, contents, weight and ready time. No account needed.' },
  { icon: Clock3, title: 'We confirm rate and slot', text: 'Price, transit time and a collection window, sent to your email.' },
  { icon: Truck, title: 'We collect', text: 'A courier picks up and your first tracking scan is recorded.' },
  { icon: MapPin, title: 'Track to the door', text: 'Scan-level tracking all the way to the delivery signature.' },
]

type Form = {
  fullName: string; email: string; phone: string
  fromCountry: string; fromCity: string; toCountry: string; toCity: string
  service: string; contents: string; weight: string; packages: string; readyDate: string; notes: string
}
type Errors = Partial<Record<keyof Form, string>>

const initial: Form = {
  fullName: '', email: '', phone: '',
  fromCountry: 'United States', fromCity: '', toCountry: 'United Kingdom', toCity: '',
  service: 'Express International', contents: 'Parcel', weight: '', packages: '1', readyDate: '', notes: '',
}

function validate(f: Form): Errors {
  const e: Errors = {}
  const today = new Date().toISOString().slice(0, 10)
  if (!f.fullName.trim()) e.fullName = 'Enter your full name.'
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address.'
  if (f.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a phone number with country code.'
  if (!f.fromCity.trim()) e.fromCity = 'Enter the collection city.'
  if (!f.toCity.trim()) e.toCity = 'Enter the delivery city.'
  if (!(Number(f.weight) > 0)) e.weight = 'Enter a weight greater than 0 kg.'
  if (!Number.isInteger(Number(f.packages)) || Number(f.packages) < 1) e.packages = 'Enter at least 1 package.'
  if (!f.readyDate) e.readyDate = 'Choose the date the shipment is ready.'
  else if (f.readyDate < today) e.readyDate = 'Choose today or a later date.'
  return e
}

function Field({ label, error, hint, full, children }: { label: string; error?: string; hint?: string; full?: boolean; children: ReactNode }) {
  return <label className={`np-field${full ? ' np-full' : ''}${error ? ' np-invalid' : ''}`}>
    <span className="np-label">{label}</span>
    {children}
    {error ? <small className="np-error">{error}</small> : hint ? <small className="np-hint">{hint}</small> : null}
  </label>
}

const accordions = [
  { title: 'Customs and duties', body: 'Import duties and VAT are usually paid by the receiver. Our in-house customs team prepares the paperwork, and we confirm any expected charges before delivery.' },
  { title: 'Restricted goods', body: 'Cash, precious stones, live animals and dangerous goods are restricted or prohibited. Rules vary by destination, so ask us before tendering anything uncertain.' },
  { title: 'Delivery attempts', body: 'We make two delivery attempts on consecutive working days. If neither succeeds, the shipment is held for 5 days at the local service point for collection.' },
  { title: 'Proof of delivery and claims', body: 'Every delivery is captured with a signature at the address and appears in your tracking history. Report damage or loss within 7 days of delivery, with the tracking number, photos of the packaging and contents, and proof of value.' },
]

export default function ShippingPage() {
  const [form, setForm] = useState<Form>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [ref, setRef] = useState('')

  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er = validate(form)
    setErrors(er)
    if (Object.keys(er).length) return
    setRef('EMS-' + Math.floor(100000 + Math.random() * 900000))
  }

  const reset = () => { setForm(initial); setErrors({}); setRef('') }

  return <>
    <SiteHeader />
    <main className="np-page">
      <section className="np-hero">
        <span className="np-eyebrow">Shipping &amp; collection</span>
        <h1 className="np-h1">Book an international collection</h1>
        <p className="np-lead">Tell us what is moving and where it needs to be. We come back with the rate, the transit time and a pickup window.</p>
      </section>

      <img className="np-banner" src={images.finalMile} alt="A courier moving a loaded hand truck of parcels along a delivery round" loading="lazy" />

      <ol className="np-steps" aria-label="How booking works">
        {steps.map(({ icon: Icon, title, text }, i) => <li className="np-step" key={title}>
          <div className="np-step-top"><span className="np-step-num">{i + 1}</span><Icon size={20} /></div>
          <h3>{title}</h3>
          <p>{text}</p>
        </li>)}
      </ol>

      {ref ? <div className="np-card np-success">
        <span className="np-check"><Check size={20} /></span>
        <h2>Request received</h2>
        <p>Your reference is <b>{ref}</b>. We'll email your rate, transit time and pickup window to <b>{form.email}</b> shortly. Nothing has been charged.</p>
        <button className="np-btn np-btn-ghost" onClick={reset}>Submit another request</button>
      </div> :
      <form className="np-form-grid" onSubmit={submit} noValidate>
        <div className="np-card">
          <fieldset className="np-fieldset">
            <legend>Your details</legend>
            <div className="np-grid">
              <Field label="Full name" error={errors.fullName}><input value={form.fullName} onChange={set('fullName')} placeholder="Jane Doe" autoComplete="name" /></Field>
              <Field label="Email address" error={errors.email}><input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" autoComplete="email" /></Field>
              <Field label="Phone number" error={errors.phone} hint="Include your country code, e.g. +1 212 555 0142" full><input type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 212 555 0142" autoComplete="tel" /></Field>
            </div>
          </fieldset>

          <fieldset className="np-fieldset">
            <legend>Route</legend>
            <div className="np-grid">
              <Field label="Collection country"><select value={form.fromCountry} onChange={set('fromCountry')}>{countries.map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Collection city" error={errors.fromCity}><input value={form.fromCity} onChange={set('fromCity')} placeholder="e.g. Brooklyn" /></Field>
              <Field label="Delivery country"><select value={form.toCountry} onChange={set('toCountry')}>{countries.map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Delivery city" error={errors.toCity}><input value={form.toCity} onChange={set('toCity')} placeholder="e.g. London" /></Field>
            </div>
          </fieldset>

          <fieldset className="np-fieldset">
            <legend>Shipment specifications</legend>
            <div className="np-grid">
              <Field label="Service type"><select value={form.service} onChange={set('service')}>{services.map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Contents"><select value={form.contents} onChange={set('contents')}>{contents.map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Total weight (kg)" error={errors.weight}><input type="number" min="0" step="0.1" inputMode="decimal" value={form.weight} onChange={set('weight')} placeholder="0.0" /></Field>
              <Field label="Number of packages" error={errors.packages}><input type="number" min="1" step="1" value={form.packages} onChange={set('packages')} /></Field>
              <Field label="Ready for collection" error={errors.readyDate} hint="dd / mm / yyyy" full><input type="date" value={form.readyDate} onChange={set('readyDate')} min={new Date().toISOString().slice(0, 10)} /></Field>
              <Field label="Special instructions" full><textarea rows={4} value={form.notes} onChange={set('notes')} placeholder="Fragile contents, restricted access, preferred pickup window..." /></Field>
            </div>
          </fieldset>
        </div>

        <aside className="np-card np-aside">
          <h2>Next steps</h2>
          <ol className="np-aside-list">
            <li>We review your shipment details.</li>
            <li>You receive the rate and pickup window by email.</li>
            <li>You confirm, and we collect.</li>
          </ol>
          <div className="np-notice"><Info size={18} /><span><b>Nothing is charged at this step.</b> You confirm once we send the rate.</span></div>
          <button className="np-btn np-btn-amber np-block" type="submit">Request collection <ArrowRight size={16} /></button>
          <p className="np-hint">Demo form: requests are not sent to a booking system until the backend is connected.</p>
        </aside>
      </form>}

      <section className="np-section">
        <h2 className="np-h2">Delivery information</h2>
        <div className="np-transit">
          <div><b>2–4</b><span>days · Express International</span></div>
          <div><b>4–8</b><span>days · Standard International</span></div>
          <div><b>18–28</b><span>days · Sea freight</span></div>
        </div>
        <div className="np-acc-grid">
          {accordions.map((a, i) => <details className="np-acc" key={a.title} open={i === 0}>
            <summary>{a.title}<span aria-hidden="true">+</span></summary>
            <div className="np-acc-body">{a.body}</div>
          </details>)}
          <div className="np-acc np-acc-note"><AlertTriangle size={18} /><p>Transit times depend on the lane, customs clearance and carrier schedules. We quote the exact window before you confirm.</p></div>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>
}
