'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  TrendingUp,
  Sun,
  Moon,
  Calendar,
  DollarSign,
  Star,
  CheckSquare,
  Edit2,
  Check,
  X,
  Wallet,
  Activity,
  Target,
  AlertCircle
} from 'lucide-react'
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { Ticker, WeekendTask } from '@/types'

// Enhanced Loading Component
function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-4 loading-pulse rounded-full">
          <Activity size={40} className="text-cyan-400" />
        </div>
        <h2 className="text-xl font-semibold text-gradient mb-2">Загрузка терминала</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Инициализация торговых данных...
        </p>
      </div>
    </div>
  )
}

// Enhanced Ticker Component
function TickerItem({ item, onResolve, onDelete }: {
  item: Ticker
  onResolve: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const [showActions, setShowActions] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'status-won'
      case 'lost': return 'status-lost'
      default: return 'status-pending'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'won': return 'WIN'
      case 'lost': return 'LOSS'
      default: return 'PENDING'
    }
  }

  return (
    <div
      className="group glass-card rounded-lg p-3 mb-2 animate-slide-in neon-border"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-mono font-semibold text-cyan-400">{item.ticker}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Цена: {item.predictionPrice.toFixed(2)}
            </span>
            {item.positionSize && (
              <span className="text-xs text-mono" style={{ color: 'var(--accent-purple)' }}>
                {item.positionSize.toFixed(0)} шт
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold ${getStatusColor(item.status)}`}>
            {getStatusText(item.status)}
          </span>
          {item.profitLoss !== null && item.profitLoss !== undefined && (
            <span className={`text-xs font-mono ${item.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {item.profitLoss >= 0 ? '+' : ''}{item.profitLoss.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {item.confidenceLevel && (
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-secondary)' }}>Уверенность</span>
            <span className="text-mono">{item.confidenceLevel}/5</span>
          </div>
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500"
              style={{ width: `${(item.confidenceLevel / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {showActions && item.status === 'pending' && (
        <div className="flex gap-1 animate-slide-in">
          <button
            onClick={() => onResolve(item.id, 'won')}
            className="flex-1 py-1 px-2 text-xs font-medium rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
          >
            <Check size={12} className="inline mr-1" />
            Won
          </button>
          <button
            onClick={() => onResolve(item.id, 'lost')}
            className="flex-1 py-1 px-2 text-xs font-medium rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
          >
            <X size={12} className="inline mr-1" />
            Lost
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1 text-xs rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

// Enhanced Input Component
function TickerInput({ dayKey, type }: { dayKey: string, type: string }) {
  const [ticker, setTicker] = useState('')
  const [rating, setRating] = useState(3)
  const [predictionPrice, setPredictionPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [userSettings, setUserSettings] = useState<any>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setUserSettings)
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ticker || !predictionPrice) return

    // Calculate position size
    const riskAmount = userSettings ?
      Number(userSettings.deposit) * (Number(userSettings.riskPercentage) / 100) : 0
    const positionSize = riskAmount / parseFloat(predictionPrice)

    try {
      const response = await fetch('/api/tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayKey,
          type,
          ticker: ticker.toUpperCase(),
          rating,
          predictionPrice: parseFloat(predictionPrice),
          notes,
          positionSize,
          confidenceLevel: rating
        })
      })

      if (response.ok) {
        setTicker('')
        setRating(3)
        setPredictionPrice('')
        setNotes('')
        setShowForm(false)
        window.location.reload()
      }
    } catch (error) {
      console.error('Error adding ticker:', error)
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full p-3 border-2 border-dashed rounded-lg transition-all duration-300 hover:border-cyan-400/50 hover:bg-cyan-400/5 group"
        style={{ borderColor: 'var(--border-secondary)' }}
      >
        <Plus size={16} className="mx-auto mb-1 text-gray-500 group-hover:text-cyan-400 transition-colors" />
        <span className="text-xs text-gray-500 group-hover:text-cyan-400 transition-colors">
          Добавить тикер
        </span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-lg p-3 space-y-3">
      <div>
        <input
          type="text"
          placeholder="Тикер (AAPL)"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          className="input-trading w-full px-3 py-2 rounded-lg text-sm"
          maxLength={10}
        />
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
          Цена предикшена (0-1)
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max="0.99"
          placeholder="0.65"
          value={predictionPrice}
          onChange={(e) => setPredictionPrice(e.target.value)}
          className="input-trading w-full px-3 py-2 rounded-lg text-sm font-mono"
          required
        />
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
          Уверенность
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="flex-1 p-2 rounded transition-all"
              style={{
                background: rating >= value ? 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))' : 'var(--bg-secondary)',
                color: rating >= value ? 'var(--bg-primary)' : 'var(--text-secondary)'
              }}
            >
              <Star size={12} className={rating >= value ? 'fill-current' : ''} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1">
        <button
          type="submit"
          className="flex-1 btn-primary py-2 px-3 rounded-lg text-sm font-medium"
        >
          Добавить
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="px-3 py-2 rounded-lg text-sm btn-secondary"
        >
          <X size={16} />
        </button>
      </div>
    </form>
  )
}

// Enhanced Ticker List
function TickerList({ items, dayKey, type }: {
  items: Ticker[]
  dayKey: string
  type: string
}) {
  const handleResolve = async (tickerId: string, status: string) => {
    try {
      const response = await fetch(`/api/tickers/${tickerId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error resolving ticker:', error)
    }
  }

  const handleDelete = async (tickerId: string) => {
    try {
      const response = await fetch(`/api/tickers/${tickerId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error deleting ticker:', error)
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-4">
        <AlertCircle size={16} className="mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Нет активных сделок
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 custom-scrollbar" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {items.map((item) => (
        <TickerItem
          key={item.id}
          item={item}
          onResolve={handleResolve}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}

// Enhanced Weekend Notes
function WeekendNotes({ tasks, onAddTask, onToggleTask }: {
  tasks: WeekendTask[]
  onAddTask: (text: string) => void
  onToggleTask: (id: string) => void
}) {
  const [newTask, setNewTask] = useState('')
  const [showInput, setShowInput] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTask.trim()) {
      onAddTask(newTask.trim())
      setNewTask('')
      setShowInput(false)
    }
  }

  return (
    <div className="glass-card rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.02) 100%)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Target size={20} className="text-purple-400" />
        <h3 className="font-bold text-gradient">План на выходные</h3>
      </div>

      <div className="space-y-2 mb-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-purple-500/5 transition-colors cursor-pointer group"
            onClick={() => onToggleTask(task.id)}
          >
            <div className="mt-0.5">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                task.done
                  ? 'bg-purple-500 border-purple-500'
                  : 'border-gray-600 group-hover:border-purple-400'
              }`}>
                {task.done && <Check size={10} className="text-white" />}
              </div>
            </div>
            <span className={`text-sm ${task.done ? 'line-through' : ''}`} style={{
              color: task.done ? 'var(--text-muted)' : 'var(--text-secondary)'
            }}>
              {task.text}
            </span>
          </div>
        ))}
      </div>

      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="w-full py-2 px-3 rounded-lg text-sm btn-secondary"
        >
          <Plus size={16} className="inline mr-1" />
          Добавить задачу
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Новая задача..."
            className="input-trading w-full px-3 py-2 rounded-lg text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary py-1 px-3 rounded text-sm">
              Добавить
            </button>
            <button
              type="button"
              onClick={() => setShowInput(false)}
              className="btn-secondary py-1 px-3 rounded text-sm"
            >
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// Main Component
export default function TraderPlanner() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [plannerData, setPlannerData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [userSettings, setUserSettings] = useState<any>(null)

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }

    // Load data
    const loadData = async () => {
      try {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = addDays(weekStart, 6)

        const response = await fetch(
          `/api/week?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
        )
        const data = await response.json()
        setPlannerData(data)

        // Load settings
        const settingsResponse = await fetch('/api/settings')
        const settings = await settingsResponse.json()
        setUserSettings(settings)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session, currentDate])

  const handleAddTask = async (text: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          weekStartDate: startOfWeek(currentDate, { weekStartsOn: 1 })
        })
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const handleToggleTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH'
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  // Date logic
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekId = format(weekStart, 'yyyy-MM-dd')
  const weekDays = Array.from({ length: 5 }).map((_, i) => addDays(weekStart, i))

  const changeWeek = (direction: 'next' | 'prev') => {
    setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1))
  }

  if (status === 'loading' || loading) {
    return <LoadingScreen />
  }

  return (
    <div className="relative" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 border-b" style={{ borderBottomColor: 'var(--border-accent)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg blur opacity-50"></div>
                <div className="relative p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <TrendingUp size={28} className="text-gradient" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">DeskTrade Terminal</h1>
                {userSettings && (
                  <div className="flex items-center gap-2 mt-1">
                    <Wallet size={16} style={{ color: 'var(--text-secondary)' }} />
                    <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Баланс: <span className="text-cyan-400">${userSettings.deposit.toFixed(2)}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg">
                <button
                  onClick={() => changeWeek('prev')}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft size={20} style={{ color: 'var(--accent-cyan)' }} />
                </button>
                <span className="font-medium min-w-[160px] text-center flex items-center justify-center gap-2">
                  <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
                  <span className="font-mono text-sm">
                    {format(weekStart, 'dd MMM', { locale: ru })} - {format(addDays(weekStart, 4), 'dd MMM', { locale: ru })}
                  </span>
                </span>
                <button
                  onClick={() => changeWeek('next')}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <ChevronRight size={20} style={{ color: 'var(--accent-cyan)' }} />
                </button>
              </div>

              <button
                onClick={() => router.push('/dashboard/settings')}
                className="text-sm px-4 py-2 rounded-lg btn-secondary"
              >
                Настройки
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="relative" style={{ zIndex: 10 }}>
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col xl:flex-row gap-6">

            {/* Weekdays Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {weekDays.map((day, index) => {
                  const dayKey = format(day, 'yyyy-MM-dd')
                  const isToday = isSameDay(day, new Date())
                  const dayData = plannerData[dayKey] || { preMarket: [], afterMarket: [] }

                  return (
                    <div
                      key={dayKey}
                      className={`trading-card rounded-xl overflow-hidden animate-slide-in neon-border ${
                        isToday ? 'active' : ''
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {/* Day Header */}
                      <div
                        className={`p-4 border-b relative overflow-hidden ${
                          isToday ? 'border-cyan-400/50' : ''
                        }`}
                        style={{
                          background: isToday
                            ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)'
                            : 'var(--bg-secondary)'
                        }}
                      >
                        {isToday && (
                          <div className="absolute top-0 right-0 px-2 py-1 text-xs font-bold text-gradient">
                            TODAY
                          </div>
                        )}
                        <div className="text-center">
                          <div className="font-bold text-lg capitalize" style={{ color: 'var(--text-primary)' }}>
                            {format(day, 'EEEEEE', { locale: ru }).toUpperCase()}
                          </div>
                          <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {format(day, 'd MMM', { locale: ru })}
                          </div>
                        </div>
                      </div>

                      {/* Pre-Market Section */}
                      <div className="p-3 border-b pre-market">
                        <div className="flex items-center gap-2 mb-3">
                          <Sun size={14} style={{ color: 'var(--warning-yellow)' }} />
                          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--warning-yellow)' }}>
                            До открытия
                          </h4>
                        </div>
                        <TickerList
                          items={dayData.preMarket}
                          dayKey={dayKey}
                          type="pre_market"
                        />
                        <TickerInput
                          dayKey={dayKey}
                          type="pre_market"
                        />
                      </div>

                      {/* After-Market Section */}
                      <div className="p-3 after-market">
                        <div className="flex items-center gap-2 mb-3">
                          <Moon size={14} style={{ color: 'var(--neutral-blue)' }} />
                          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neutral-blue)' }}>
                            После закрытия
                          </h4>
                        </div>
                        <TickerList
                          items={dayData.afterMarket}
                          dayKey={dayKey}
                          type="after_market"
                        />
                        <TickerInput
                          dayKey={dayKey}
                          type="after_market"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="xl:w-80">
              <WeekendNotes
                tasks={plannerData.weekendTasks || []}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}