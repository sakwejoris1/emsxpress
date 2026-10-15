import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import RoutePages from './RoutePages'
import './styles.css'
import './typography.css'

const path = window.location.pathname.replace(/\/$/, '') || '/'
const Page = path === '/' ? App : RoutePages
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Page /></React.StrictMode>)
