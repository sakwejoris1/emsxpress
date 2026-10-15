import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Building2, Check, Eye, EyeOff, FileUp, Globe2, ShieldCheck, Truck, User } from 'lucide-react'
import { images } from '../images'
import { SiteFooter, SiteHeader } from '../Layout'

const codes = [['+1', 'United States'], ['+1', 'Canada'], ['+44', 'United Kingdom'], ['+49', 'Germany'], ['+33', 'France'], ['+237', 'Cameroon'], ['+234', 'Nigeria'], ['+233', 'Ghana'], ['+254', 'Kenya'], ['+27', 'South Africa'], ['+971', 'UAE'], ['+65', 'Singapore'], ['+86', 'China']]

const highlights = [
  { icon: FileUp, title: 'Bulk CSV manifests', text: 'Upload hundreds of parcels in a single file and create every label at once.' },
  { icon: ShieldCheck, title: 'Monthly credit terms', text: 'Ship now and settle with one consolidated invoice at the end of the month.' },
  { icon: Truck, title: 'Batch tracking', text: 'Follow every consignment in flight from one dashboard, with scan-level updates.' },
]

type Form = { accountType: 'personal' | 'business'; fullName: string; companyName: string; email: string; password: string; code: string; phone: string; terms: boolean }
type Errors = Partial<Record<keyof Form, string>>

const requirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  { label: 'Contains a symbol', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]
const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

function score(p: string) {
  let s = requirements.filter(r => r.test(p)).length
  if (p.length >= 12) s++
  return Math.min(s, 4)
}

export default function RegisterPage() {
  const [form, setForm] = useState<Form>({ accountType: 'personal', fullName: '', companyName: '', email: '', password: '', code: '+1', phone: '', terms: false })
  const [errors, setErrors] = useState<Errors>({})
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [notice, setNotice] = useState('')
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % highlights.length), 4500)
    return () => clearInterval(t)
  }, [])

  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const validate = (): Errors => {
    const e: Errors = {}
    if (form.accountType === 'business' && !form.companyName.trim()) e.companyName = 'Enter your company name.'
    if (!form.fullName.trim()) e.fullName = form.accountType === 'business' ? 'Enter the contact person’s name.' : 'Enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address.'
    if (!requirements.every(r => r.test(form.password))) e.password = 'Password does not meet the requirements.'
    if (form.phone.replace(/\D/g, '').length < 6) e.phone = 'Enter your phone number.'
    if (!form.terms) e.terms = 'Please accept the Terms and Privacy Policy.'
    return e
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er = validate()
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    setTimeout(() => { setBusy(false); setDone(true) }, 1200)
  }

  const sso = (provider: string) => setNotice(`${provider} sign-in needs the authentication backend to be connected.`)
  const pwScore = score(form.password)
  const business = form.accountType === 'business'
  const H = highlights[slide]
  const HIcon = H.icon

  return <>
    <SiteHeader />
    <main className="np-auth">
      <section className="np-auth-brand">
        <img className="np-bg" src={images.hero} alt="" />
        <div>
          <span className="np-eyebrow np-eyebrow-light"><Globe2 size={14} /> Join EMSXpress</span>
          <h1 className="np-auth-title">Ship globally. Pay once a month.</h1>
          <div className="np-trust"><b>Join 10,000+ businesses shipping globally</b><span>Trusted by exporters, online sellers and families across 70+ cities.</span></div>
        </div>
        <div className="np-highlight" key={slide}>
          <span className="np-highlight-icon"><HIcon size={20} /></span>
          <h3>{H.title}</h3>
          <p>{H.text}</p>
          <div className="np-dots">{highlights.map((_, i) => <button key={i} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} aria-label={`Highlight ${i + 1}`} />)}</div>
        </div>
      </section>

      <section className="np-auth-form">
        <div className="np-auth-card">
          {done ? <div className="np-success">
            <span className="np-check"><Check size={20} /></span>
            <h2>Form submitted</h2>
            <p className="np-hint">Demo form: no account has been created and your details were not saved. Connect the authentication backend to activate sign-up.</p>
            <button className="np-btn np-btn-ghost" onClick={() => setDone(false)}>Back to the form</button>
          </div> : <>
          <h2 className="np-h2">Create your account</h2>
          <p className="np-hint">Choose the account type that fits how you ship.</p>
          <div className="np-tabs" role="tablist" aria-label="Account type">
            <button role="tab" aria-selected={!business} className="np-tab" onClick={() => setForm(f => ({ ...f, accountType: 'personal' }))}><User size={16} /> Personal shipper</button>
            <button role="tab" aria-selected={business} className="np-tab" onClick={() => setForm(f => ({ ...f, accountType: 'business' }))}><Building2 size={16} /> Business shipper</button>
          </div>
          <p className="np-hint np-tab-hint">{business ? 'Bulk uploads, CSV manifests and monthly credit terms.' : 'For occasional international packages.'}</p>

          <form onSubmit={submit} noValidate className="np-stack">
            {business && <Field label="Company name" error={errors.companyName}><input value={form.companyName} onChange={set('companyName')} placeholder="Acme Supply Co." autoComplete="organization" /></Field>}
            <Field label={business ? 'Your full name (contact person)' : 'Full name'} error={errors.fullName}><input value={form.fullName} onChange={set('fullName')} placeholder="Jane Doe" autoComplete="name" /></Field>
            <Field label={business ? 'Work email address' : 'Email address'} error={errors.email}><input type="email" value={form.email} onChange={set('email')} placeholder={business ? 'you@company.com' : 'you@example.com'} autoComplete="email" /></Field>
            <Field label="Password" error={errors.password}>
              <span className="np-pw">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete="new-password" />
                <button type="button" className="np-pw-toggle" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </span>
              <span className="np-meter" aria-hidden="true">{[0, 1, 2, 3].map(i => <i key={i} className={pwScore > i ? `on-${pwScore}` : ''} />)}</span>
              <span className="np-hint">{form.password ? strengthLabels[pwScore] : 'Use 8+ characters with a number and a symbol.'}</span>
              <span className="np-reqs">{requirements.map(r => <span key={r.label} className={r.test(form.password) ? 'ok' : ''}>{r.test(form.password) ? '✓' : '○'} {r.label}</span>)}</span>
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <span className="np-phone">
                <select value={form.code} onChange={set('code')} aria-label="Country code">{codes.map(([c, n]) => <option key={n} value={c}>{c} {n}</option>)}</select>
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="212 555 0142" autoComplete="tel-national" />
              </span>
            </Field>
            <label className={`np-check-row${errors.terms ? ' np-invalid' : ''}`}>
              <input type="checkbox" checked={form.terms} onChange={set('terms')} />
              <span>I agree to the <a href="/legal/terms">Terms of Service</a> and <a href="/legal/privacy">Privacy Policy</a>.</span>
            </label>
            {errors.terms && <small className="np-error">{errors.terms}</small>}
            <button className="np-btn np-block" type="submit" disabled={busy}>{busy ? <><span className="np-spinner" aria-hidden="true" /> Creating account…</> : 'Create account'}</button>
          </form>

          <div className="np-divider">Or continue with</div>
          <div className="np-oauth">
            <button type="button" onClick={() => sso('Google')}><i style={{ background: '#4285F4' }}>G</i> Continue with Google</button>
            {business && <button type="button" onClick={() => sso('Microsoft')}><i style={{ background: '#0F172A' }}>M</i> Continue with Microsoft (Azure AD)</button>}
          </div>
          {notice && <p className="np-hint np-notice-line">{notice}</p>}
          <p className="np-footer-link">Already have a freight account? <a href="/dashboard">Log in</a></p>
          </>}
        </div>
      </section>
    </main>
    <SiteFooter />
  </>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className={`np-field${error ? ' np-invalid' : ''}`}><span className="np-label">{label}</span>{children}{error && <small className="np-error">{error}</small>}</label>
}
