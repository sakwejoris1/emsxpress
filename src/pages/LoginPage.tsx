import { useState, type FormEvent } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { PageFrame } from '../Layout'

export default function LoginPage(){
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  const submit=async(event:FormEvent)=>{event.preventDefault();setBusy(true);setError('');try{const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',email,password})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not sign in.');window.location.assign('/dashboard')}catch(cause){setError(cause instanceof Error?cause.message:'Could not sign in.')}finally{setBusy(false)}}
  return <PageFrame eyebrow="SHIPPER ACCOUNT" title={<>Welcome<br/><span>back.</span></>} description="Sign in to manage your shipments, manifests, and invoices."><form className="portal-panel admin-login" onSubmit={submit}><span className="admin-lock"><ShieldCheck size={22}/></span><h2>Sign in to EMSXpress</h2><p>Your account sessions are protected and your password is never stored in the browser.</p><label>EMAIL ADDRESS<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>PASSWORD<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="form-error">{error}</p>}<button className="button button-accent" disabled={busy}>{busy?'Signing in…':'Sign in'} <ArrowRight size={15}/></button><small className="admin-secure-note">New to EMSXpress? <a href="/register">Create an account</a></small></form></PageFrame>
}
