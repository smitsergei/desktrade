'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Activity, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('smit')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const result = await signIn('credentials', {
          username,
          password,
          redirect: false,
        })

        if (result?.error) {
          setError('Неверный логин или пароль')
        } else {
          router.push('/dashboard')
        }
      } else {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Ошибка регистрации')
        } else {
          const result = await signIn('credentials', {
            username,
            password,
            redirect: false,
          })

          if (result?.error) {
            setError('Ошибка автоматического входа')
          } else {
            router.push('/dashboard')
          }
        }
      }
    } catch (error) {
      setError('Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      {/* Background Pattern */}
      <div className="absolute inset-0" />

      {/* Animated Background Elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500 rounded-full opacity-10 blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass-card rounded-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl blur opacity-50"></div>
              <div className="relative p-4 rounded-xl" style={{ background: 'var(--bg-card)' }}>
                <TrendingUp size={48} className="text-gradient" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-gradient">DeskTrade</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Терминал для торговли предикшен маркетами
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Логин
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-trading w-full px-4 py-3 rounded-lg"
                placeholder="Введите логин"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-trading w-full px-4 py-3 rounded-lg pr-12"
                  placeholder={isLogin ? "Введите пароль" : "Придумайте пароль"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Activity size={20} className="animate-spin" />
                  Загрузка...
                </>
              ) : (
                isLogin ? 'Войти в терминал' : 'Создать аккаунт'
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="text-sm hover:text-cyan-400 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isLogin ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>

          {/* Demo Credentials */}
          {isLogin && (
            <div className="mt-6 p-4 rounded-lg" style={{ background: 'rgba(0, 217, 255, 0.05)' }}>
              <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                Демо доступ:<br />
                Логин: <span className="text-cyan-400">smit</span><br />
                Пароль: <span className="text-cyan-400">smit123</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2024 DeskTrade. Торговля с умом.
        </p>
      </div>
    </div>
  )
}