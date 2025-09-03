import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { AuthProvider } from '../contexts/AuthContext'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow">
          <Component {...pageProps} />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  )
}