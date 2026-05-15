import { useState, useCallback } from 'react'
import { api } from '../lib/api.js'
import { setToken, clearToken, isAuthenticated } from '../lib/auth.js'

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { token } = await api.auth.login(email, password)
      setToken(token)
      setAuthenticated(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { token } = await api.auth.register(email, password)
      setToken(token)
      setAuthenticated(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setAuthenticated(false)
  }, [])

  return { authenticated, login, register, logout, error, loading }
}
