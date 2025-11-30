'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wallet, TrendingUp, Shield } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState({
    deposit: 1000,
    riskPercentage: 2,
    maxPositionSize: 10
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }

    fetchSettings()
  }, [session, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${session?.user?.email}`
        }
      })

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

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.email}`
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Ошибка при сохранении настроек')
    } finally {
      setSaving(false)
    }
  }

  const calculateRiskAmount = () => {
    return (settings.deposit * settings.riskPercentage / 100).toFixed(2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            Назад к журналу
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Настройки
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Управление депозитом и риск-менеджментом
          </p>
        </div>

        <div className="space-y-6">
          {/* Депозит */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Депозит
              </h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Текущий баланс ($)
              </label>
              <input
                type="number"
                value={settings.deposit}
                onChange={(e) => setSettings({ ...settings, deposit: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                min="0"
                step="100"
              />
            </div>
          </div>

          {/* Риск на сделку */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-green-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Риск-менеджмент
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Риск на сделку (% от депозита)
                </label>
                <input
                  type="number"
                  value={settings.riskPercentage}
                  onChange={(e) => setSettings({ ...settings, riskPercentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="0.1"
                  max="10"
                  step="0.1"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Сумма риска: ${calculateRiskAmount()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Максимальный размер позиции (% от депозита)
                </label>
                <input
                  type="number"
                  value={settings.maxPositionSize}
                  onChange={(e) => setSettings({ ...settings, maxPositionSize: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="1"
                  max="50"
                  step="1"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Максимально: ${(settings.deposit * settings.maxPositionSize / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Информация */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="text-blue-600 mt-0.5" size={20} />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Как работает расчет риска
                </h3>
                <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                  Размер позиции рассчитывается автоматически: (Депозит × Риск%) / Цена предикшена.
                  Это позволяет управлять риском и сохранить капитал при проигрышных сделках.
                </p>
              </div>
            </div>
          </div>

          {/* Кнопка сохранения */}
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
    </div>
  )
}