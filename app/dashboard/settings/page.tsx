'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Shield,
  Target,
  AlertCircle,
  Check
} from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState({
    deposit: 10000,
    riskPercentage: 2,
    maxPositionSize: 10
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }

    fetchSettings()
  }, [session, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')

      if (response.ok) {
        const data = await response.json()
        setSettings({
          deposit: Number(data.deposit),
          riskPercentage: Number(data.riskPercentage),
          maxPositionSize: Number(data.maxPositionSize)
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const calculateRiskAmount = () => {
    return (settings.deposit * settings.riskPercentage / 100).toFixed(2)
  }

  const calculateMaxPosition = (price: number = 0.5) => {
    const riskAmount = settings.deposit * settings.riskPercentage / 100
    return (riskAmount / price).toFixed(0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 border-b" style={{ borderBottomColor: 'var(--border-accent)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft size={20} style={{ color: 'var(--accent-cyan)' }} />
            </button>
            <h1 className="text-xl font-bold">Настройки риска</h1>
            {saved && (
              <div className="flex items-center gap-2 ml-auto text-green-400 animate-slide-in">
                <Check size={20} />
                <span className="text-sm">Сохранено</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative" style={{ zIndex: 10 }}>
        <div className="max-w-4xl mx-auto p-4 py-8">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Settings Form */}
            <div className="space-y-4">
              {/* Deposit Card */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(0, 217, 255, 0.1)' }}>
                    <Wallet size={24} className="text-cyan-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Начальный депозит</h2>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Сумма депозита ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        $
                      </span>
                      <input
                        type="number"
                        value={settings.deposit}
                        onChange={(e) => setSettings({ ...settings, deposit: Number(e.target.value) })}
                        className="input-trading w-full pl-8 pr-4 py-3 rounded-lg text-lg font-mono"
                        min="100"
                        step="100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Settings Card */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                    <Shield size={24} className="text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Управление рисками</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Риск на сделку (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        value={settings.riskPercentage}
                        onChange={(e) => setSettings({ ...settings, riskPercentage: Number(e.target.value) })}
                        className="flex-1"
                        min="0.5"
                        max="10"
                        step="0.5"
                        style={{
                          background: `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${settings.riskPercentage * 10}%, var(--bg-secondary) ${settings.riskPercentage * 10}%, var(--bg-secondary) 100%)`
                        }}
                      />
                      <span className="text-lg font-mono w-16 text-right" style={{ color: 'var(--accent-purple)' }}>
                        {settings.riskPercentage}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Максимальный размер позиции
                    </label>
                    <input
                      type="number"
                      value={settings.maxPositionSize}
                      onChange={(e) => setSettings({ ...settings, maxPositionSize: Number(e.target.value) })}
                      className="input-trading w-full px-4 py-3 rounded-lg font-mono"
                      min="1"
                      max="100"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full btn-primary py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить настройки'
                )}
              </button>
            </div>

            {/* Info Panel */}
            <div className="space-y-4">
              {/* Risk Calculator */}
              <div className="glass-card rounded-xl p-6" style={{ background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Target size={24} className="text-cyan-400" />
                  <h3 className="font-semibold">Калькулятор риска</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Риск на сделку</span>
                      <span className="font-mono font-bold text-cyan-400">
                        ${calculateRiskAmount()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {settings.riskPercentage}% от депозита
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Пример размера позиции при цене 0.50
                    </div>
                    <div className="font-mono font-bold text-purple-400">
                      {calculateMaxPosition(0.5)} акций
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Tips */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle size={20} className="text-yellow-400 mt-0.5" />
                  <h3 className="font-semibold">Советы по управлению риском</h3>
                </div>

                <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>Не рискуйте более 2-3% от депозита на одну сделку</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>Диверсифицируйте сделки по разным активам</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>Установите стоп-лосс для каждой сделки</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>Ведите статистику для анализа результатов</span>
                  </li>
                </ul>
              </div>

              {/* Trading Stats Preview */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp size={24} className="text-green-400" />
                  <h3 className="font-semibold">Ваш профиль риска</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <span className="text-sm">Тип трейдера</span>
                    <span className="font-semibold" style={{ color: 'var(--accent-purple)' }}>
                      {settings.riskPercentage <= 1 ? 'Консервативный' :
                       settings.riskPercentage <= 3 ? 'Умеренный' : 'Агрессивный'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <span className="text-sm">Макс. просадка (10 сделок)</span>
                    <span className="font-semibold text-red-400">
                      -{(settings.riskPercentage * 10).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}