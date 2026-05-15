import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { Card } from '@flowforge/ui'

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, register, error, loading, authenticated } = useAuth()
  const navigate = useNavigate()

  if (authenticated) {
    navigate('/workflows', { replace: true })
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') await login(email, password)
    else await register(email, password)
    if (!error) navigate('/workflows', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-white mb-1">FlowForge</h1>
        <p className="text-slate-400 text-sm mb-6">Workflow Orchestration Platform</p>

        <div className="flex gap-2 mb-6">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-800 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-800 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => { setEmail('demo@flowforge.io'); setPassword('demo') }}
          className="w-full py-2 text-slate-400 hover:text-white text-xs transition-colors mt-2"
        >
          Use demo account (demo@flowforge.io / demo)
        </button>
      </Card>
    </div>
  )
}
