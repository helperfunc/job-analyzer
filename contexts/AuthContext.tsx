import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface User {
  id: string
  username: string
  email: string
  displayName: string
  isVerified: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (data: { username: string, email: string, password: string, displayName?: string }) => Promise<boolean>
  loginWithGoogle: (googleUser: { id: string, email: string, name: string, picture?: string }) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me-simple', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          setUser({
            id: data.user.id,
            username: data.user.username,
            email: data.user.email,
            displayName: data.user.displayName || data.user.display_name,
            isVerified: data.user.isVerified || data.user.is_verified || true
          })
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      
      if (data.success) {
        setUser({
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          displayName: data.user.displayName,
          isVerified: data.user.isVerified
        })
        return true
      }
      
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const register = async (data: { 
    username: string, 
    email: string, 
    password: string, 
    displayName?: string 
  }): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      const responseData = await response.json()
      
      if (responseData.success) {
        setUser({
          id: responseData.user.id,
          username: responseData.user.username,
          email: responseData.user.email,
          displayName: responseData.user.displayName,
          isVerified: false
        })
        return true
      }
      
      return false
    } catch (error) {
      console.error('Register error:', error)
      return false
    }
  }

  const loginWithGoogle = async (googleUser: { 
    id: string, 
    email: string, 
    name: string, 
    picture?: string 
  }): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          googleId: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setUser({
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          displayName: data.user.displayName,
          isVerified: data.user.isVerified
        })
        return true
      }
      
      return false
    } catch (error) {
      console.error('Google login error:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      router.push('/auth')
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      loginWithGoogle,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}