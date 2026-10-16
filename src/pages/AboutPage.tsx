import { ArrowRight, Headphones, Leaf, Plane, ShieldCheck, Truck, Zap, FileCheck, Globe2 } from 'lucide-react'
import { images } from '../images'
import { SiteFooter, SiteHeader } from '../Layout'

const infrastructure = [
  { icon: Plane, title: 'Air gateways', text: 'Priority uplift agreements with major commercial and dedicated freighter networks across JFK, LHR, FRA and DXB.' },
  { icon: Truck, title: 'Road linehaul and fleet', text: 'A modern temperature-controlled and GPS-tracked trunking fleet that keeps cross-border transit seamless.' },
  { icon: FileCheck, title: 'Customs brokerage', text: 'In-house customs compliance experts who speed up import clearance and reduce border friction.' },
]

const values = [
  { icon: ShieldCheck, title: 'Trust', text: 'We do what we promise, and we tell you early when something changes.' },
  { icon: Globe2, title: 'Transparency', text: 'Every handoff is tracked, verified and timestamped, so there are no logistics black boxes.' },
  { icon: Zap, title: 'Speed', text: 'Express networks and next-flight-out recovery keep time-critical shipments moving.' },
  { icon: Leaf, title: 'Environmental responsibility', text: 'Sustainable routing and a modern, fuel-efficient fleet reduce emissions on every lane.' },
]

export default function AboutPage() {
  return <>
    <SiteHeader />
    <main className="np-page np-about">
      <section className="np-dark np-about-hero">
        <img className="np-bg" src={images.hero} alt="" fetchPriority="high" />
        <span className="np-eyebrow np-eyebrow-light">About EMSXpress</span>
        <h1 className="np-auth-title">Logistics built for absolute precision.</h1>
        <p className="np-lead np-lead-light">EMSXpress connects global markets through uncompromising scan-level transparency, elite air and ocean linehaul, and dependable door-to-door execution.</p>
      </section>

      <section className="np-counters" aria-label="Platform capabilities">
        <div><b>Shipment</b><span>Tracking records</span></div>
        <div><b>Route</b><span>Published rate cards</span></div>
        <div><b>Service</b><span>Verified locations</span></div>
        <div><b>Dispatch</b><span>Saved support requests</span></div>
      </section>

      <section className="np-section np-mission">
        <div>
          <span className="np-eyebrow">Our mission</span>
          <h2 className="np-h2">No black boxes between origin and door.</h2>
        </div>
        <div>
          <p className="np-lead">Shipping should never feel like a mystery. We track every handoff, verify it at the facility and timestamp it, so the status you see is the status on the warehouse floor. That is how we keep promises, and how we earn the trust of the businesses and families who rely on us.</p>
        </div>
      </section>

      <section className="np-section">
        <span className="np-eyebrow">Global infrastructure</span>
        <h2 className="np-h2">Built to reach the address, not just the city.</h2>
        <div className="np-cards3">
          {infrastructure.map(({ icon: Icon, title, text }) => <article className="np-card np-infra" key={title}>
            <span className="np-icon"><Icon size={20} /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>)}
        </div>
      </section>

      <figure className="np-photo-band"><img src={images.finalMile} alt="A courier moving a loaded hand truck of parcels along a delivery round" loading="lazy" /><figcaption>Consignments are scanned at every hand-off, from ramp to doorstep.</figcaption></figure>

      <section className="np-section">
        <span className="np-eyebrow">Our values</span>
        <h2 className="np-h2">What guides every shipment.</h2>
        <div className="np-cards4">
          {values.map(({ icon: Icon, title, text }) => <article className="np-value" key={title}>
            <span className="np-icon"><Icon size={18} /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>)}
        </div>
      </section>

      <section className="np-dark np-cta">
        <div>
          <h2 className="np-h2">Ready to move cargo with precision?</h2>
          <p className="np-lead np-lead-light">Book a collection in minutes, or talk to a logistics specialist about a tailored plan.</p>
        </div>
        <div className="np-cta-actions">
          <a className="np-btn np-btn-amber" href="/shipping">Ship Now <ArrowRight size={16} /></a>
          <a className="np-btn np-btn-ghost np-btn-on-dark" href="/contact"><Headphones size={16} /> Contact Support</a>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>
}
