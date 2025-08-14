import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function CompareRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the new compare page
    router.replace('/compare-v2')
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to the new compare page...</p>
      </div>
    </div>
  )
}