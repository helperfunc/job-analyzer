import React, { ReactElement, createContext } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Create a mock AuthContext
const AuthContext = createContext<any>(undefined)

// Mock AuthContext for testing
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const mockAuthValue = {
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    loginWithGoogle: jest.fn(),
    checkAuth: jest.fn(),
    loading: false,
    isAuthenticated: false,
    error: null,
    clearError: jest.fn()
  }

  return (
    <AuthContext.Provider value={mockAuthValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: MockAuthProvider, ...options })

export * from '@testing-library/react'
export { customRender as render }