import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '../contexts/AuthContext'

// Mock AuthContext for testing
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const mockAuthValue = {
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    loading: false,
    error: null,
    clearError: jest.fn()
  }

  return (
    <AuthProvider value={mockAuthValue}>
      {children}
    </AuthProvider>
  )
}

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: MockAuthProvider, ...options })

export * from '@testing-library/react'
export { customRender as render }