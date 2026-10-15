import type { ReactNode } from 'react'
import { ArrowRight, Globe2 } from 'lucide-react'

export function SiteHeader() {
  return <>
    <div className="announcement"><span className="announce-dot" /> EMSXPRESS CUSTOMER PORTAL <span className="portal-live">● NETWORK LIVE</span></div>
    <header className="site-header">
      <a className="brand" href="/" aria-label="EMSXpress home"><span className="brand-mark"><span /><span /><span /></span><span className="brand-name">EMS<span>Xpress</span></span></a>
      <nav className="route-nav"><a href="/shipping">Ship</a><a href="/services">Services</a><a href="/tracking">Track</a><a href="/locations">Locations</a><a href="/company/about">About</a><a href="/help">Support</a></nav>
      <div className="header-actions"><a className="login-btn" href="/register">Sign up</a><a className="login-btn" href="/dashboard">Log in</a><a className="button button-dark small" href="/shipping">Ship now <ArrowRight size={14} /></a></div>
    </header>
  </>
}

export function SiteFooter() {
  return <footer className="portal-footer"><a className="brand" href="/"><span className="brand-mark"><span /><span /><span /></span><span className="brand-name">EMS<span>Xpress</span></span></a><span>© 2026 EMSXpress. All rights reserved.</span><span>Need help? <a href="mailto:support@emsxpress.com">Contact our team</a></span></footer>
}

export function PageFrame({ children, eyebrow, title, description }: { children: ReactNode; eyebrow: string; title: ReactNode; description: string }) {
  return <><SiteHeader /><main className="portal-main"><div className="portal-heading"><span className="eyebrow"><span className="eyebrow-icon"><Globe2 size={14} /></span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children}</main><SiteFooter /></>
}
