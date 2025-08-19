import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Navigation from '../components/Navigation'
import { AuthProvider } from '../contexts/AuthContext'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Navigation />
      <Component {...pageProps} />
    </AuthProvider>
  )
}