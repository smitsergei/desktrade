'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Activity,
  Target,
  AlertCircle,
  Download
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
import EditTickerModal from '@/components/ui/EditTickerModal'
import ExportModal from '@/components/ui/ExportModal'
import DraggableTaskList from '@/components/ui/DraggableTaskList'

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
function TickerItem({ item, onResolve, onDelete, onEdit }: {
  item: Ticker
  onResolve: (id: string, status: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
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
              Цена: {item.predictionPrice?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold ${getStatusColor(item.status)}`}>
            {getStatusText(item.status)}
          </span>
        </div>
      </div>

      {item.notes && (
        <div className="mb-2 p-2 rounded" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-medium" style={{ color: 'var(--accent-cyan)' }}>Заметка:</span> {item.notes}
          </p>
        </div>
      )}

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

      {showActions && (
        <div className="flex gap-1 animate-slide-in">
          {item.status === 'pending' && (
            <>
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
            </>
          )}
          <button
            onClick={() => onEdit(item.id)}
            className="p-1 text-xs rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-all"
            title={item.status !== 'pending' ? 'Редактировать сделку' : 'Редактировать'}
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1 text-xs rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-all"
            title="Удалить сделку"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

// Enhanced Input Component
function TickerInput({ dayKey, type, onSuccess }: {
  dayKey: string,
  type: string,
  onSuccess?: () => void
}) {
  const [ticker, setTicker] = useState('')
  const [rating, setRating] = useState(3)
  const [predictionPrice, setPredictionPrice] = useState('0.50')
  const [notes, setNotes] = useState('')
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ticker || !predictionPrice) return

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
          confidenceLevel: rating
        })
      })

      if (response.ok) {
        setTicker('')
        setRating(3)
        setPredictionPrice('0.50')
        setNotes('')
        setShowForm(false)
        if (onSuccess) onSuccess()
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
        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
          Цена предикшена: <span className="font-mono text-cyan-400">{parseFloat(predictionPrice).toFixed(2)}</span>
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="0.01"
            max="0.99"
            step="0.01"
            value={predictionPrice}
            onChange={(e) => setPredictionPrice(e.target.value)}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${(parseFloat(predictionPrice) / 0.99) * 100}%, #374151 ${(parseFloat(predictionPrice) / 0.99) * 100}%, #374151 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.01</span>
            <span>0.50</span>
            <span>0.99</span>
          </div>
        </div>
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
function TickerList({ items, dayKey, type, onSuccess, onEditTicker }: {
  items: Ticker[]
  dayKey: string
  type: string
  onSuccess?: () => void
  onEditTicker?: (ticker: Ticker) => void
}) {
  const handleResolve = async (tickerId: string, status: string) => {
    try {
      const response = await fetch(`/api/tickers/${tickerId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        if (onSuccess) onSuccess()
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
        if (onSuccess) onSuccess()
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
          onEdit={() => onEditTicker && onEditTicker(item)}
        />
      ))}
    </div>
  )
}

// Enhanced Priority Tasks
function PriorityTasks({ tasks, onAddTask, onToggleTask, onEditTask, onDeleteTask, onReorder }: {
  tasks: WeekendTask[]
  onAddTask: (text: string, priority: number) => void
  onToggleTask: (id: string) => void
  onEditTask: (id: string, text: string, priority: number) => void
  onDeleteTask: (id: string) => void
  onReorder: (taskIds: string[]) => Promise<void>
}) {
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState(2)
  const [showInput, setShowInput] = useState(false)
  const [editingTask, setEditingTask] = useState<WeekendTask | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTask.trim()) {
      onAddTask(newTask.trim(), priority)
      setNewTask('')
      setPriority(2)
      setShowInput(false)
    }
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 3: return 'Высокий'
      case 2: return 'Средний'
      case 1: return 'Низкий'
      default: return 'Средний'
    }
  }

  return (
    <div className="glass-card rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(245, 158, 11, 0.03) 100%)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Target size={20} className="text-red-400" />
        <h3 className="font-bold text-gradient">Приоритетные задачи</h3>
        <span className="text-xs text-gray-400 ml-auto">Перетаскивайте для сортировки</span>
      </div>

      {tasks.length > 0 && (
        <div className="mb-4">
          <DraggableTaskList
            tasks={tasks}
            onReorder={onReorder}
            onToggleTask={onToggleTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onEdit={setEditingTask}
          />
        </div>
      )}

      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="w-full py-2 px-3 rounded-lg text-sm btn-secondary"
        >
          <Plus size={16} className="inline mr-1" />
          Добавить задачу
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Введите приоритетную задачу..."
            className="input-trading w-full px-3 py-2 rounded-lg text-sm"
            autoFocus
          />
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
              Приоритет
            </label>
            <div className="flex gap-1">
              {[
                { value: 1, label: 'Низкий', color: 'text-green-400' },
                { value: 2, label: 'Средний', color: 'text-yellow-400' },
                { value: 3, label: 'Высокий', color: 'text-red-400' }
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={`flex-1 py-2 px-2 rounded text-xs font-medium transition-all ${
                    priority === value
                      ? 'bg-white/10 border border-white/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className={priority === value ? color : 'var(--text-secondary)'}>
                    {label}
                  </span>
                  <div className={`text-xs mt-1 ${priority === value ? color : 'var(--text-muted)'}`}>
                    {'!'.repeat(value)}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary py-2 px-4 rounded text-sm flex-1">
              Добавить задачу
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInput(false)
                setNewTask('')
                setPriority(2)
              }}
              className="btn-secondary py-2 px-3 rounded text-sm"
            >
              <X size={16} />
            </button>
          </div>
        </form>
      )}

      {/* Модальное окно редактирования */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card rounded-lg p-4 max-w-md w-full mx-4">
            <h4 className="text-sm font-bold mb-3">Редактировать задачу</h4>
            <form onSubmit={(e) => {
              e.preventDefault()
              if (editingTask.text.trim()) {
                onEditTask(editingTask.id, editingTask.text, editingTask.priority)
                setEditingTask(null)
              }
            }}>
              <input
                type="text"
                value={editingTask.text}
                onChange={(e) => setEditingTask({ ...editingTask, text: e.target.value })}
                className="input-trading w-full px-3 py-2 rounded-lg text-sm mb-3"
                autoFocus
              />
              <div className="flex gap-1 mb-3">
                {[
                  { value: 1, label: 'Низкий' },
                  { value: 2, label: 'Средний' },
                  { value: 3, label: 'Высокий' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEditingTask({ ...editingTask, priority: value })}
                    className={`flex-1 py-1 px-1 rounded text-xs transition-all ${
                      editingTask.priority === value ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary py-1 px-3 rounded text-xs">
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="btn-secondary py-1 px-3 rounded text-xs"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
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
  const [editingTicker, setEditingTicker] = useState<Ticker | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Load data function - с параметром для контроля загрузки
  const loadData = useCallback(async (showLoading = false) => {
    if (!session) return

    try {
      if (showLoading) setLoading(true)
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = addDays(weekStart, 6)

      const response = await fetch(
        `/api/week?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
      )
      const data = await response.json()
      console.log('Loaded data:', data)
      setPlannerData(data)

      // Load settings
      const settingsResponse = await fetch('/api/settings')
      const settings = await settingsResponse.json()
      setUserSettings(settings)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [session, currentDate])

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }

    loadData(true)
  }, [status, loadData])

  const handleAddTask = async (text: string, priority: number = 2) => {
    try {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          weekStartDate: weekStart.toISOString(),
          priority
        })
      })

      if (response.ok) {
        // Обновляем данные без перезагрузки
        loadData()
      } else {
        const error = await response.json()
        console.error('Error adding task:', error)
      }
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  // Функция для переупорядочивания
  const handleReorder = async (taskIds: string[]) => {
    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds })
      })
      if (!response.ok) {
        throw new Error('Failed to reorder tasks')
      }
      // Перезагружаем данные после успешного переупорядочивания
      await loadData()
    } catch (error) {
      console.error('Error reordering tasks:', error)
    }
  }

  const handleToggleTask = async (taskId: string) => {
    try {
      // Находим текущую задачу в данных недели
      const currentTask = tasks?.find(task => task.id === taskId)

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !currentTask?.done })
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleEditTask = async (taskId: string, text: string, priority: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, priority })
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Error editing task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  // Функции для редактирования тикеров
  const handleEditTicker = (ticker: Ticker) => {
    setEditingTicker(ticker)
    setIsEditModalOpen(true)
  }

  const handleSaveTicker = async (tickerId: string, data: any) => {
    try {
      const response = await fetch(`/api/tickers/${tickerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        loadData()
        setIsEditModalOpen(false)
        setEditingTicker(null)
      } else {
        const error = await response.json()
        console.error('Error updating ticker:', error)
      }
    } catch (error) {
      console.error('Error updating ticker:', error)
    }
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingTicker(null)
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
                <div className="flex items-center gap-2 mt-1">
                  <Activity size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Трейдинг терминал
                  </span>
                </div>
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
                onClick={() => setIsExportModalOpen(true)}
                className="text-sm px-4 py-2 rounded-lg btn-secondary flex items-center gap-2"
              >
                <Download size={16} />
                Экспорт
              </button>

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

      {/* Main Grid - новый полноэкранный дизайн */}
      <main className="relative" style={{ zIndex: 10 }}>
        <div className="w-full p-4">
          {/* Основная сетка с задачами справа */}
          <div className="flex gap-4">

            {/* Недельные колонки - занимают основное пространство */}
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-3">
                {weekDays.map((day, index) => {
                  const dayKey = format(day, 'yyyy-MM-dd')
                  const isToday = isSameDay(day, new Date())
                  const dayData = plannerData[dayKey] || { preMarket: [], afterMarket: [] }

                  return (
                    <div
                      key={dayKey}
                      className={`glass-card rounded-xl p-3 hover:scale-[1.01] transition-all duration-300 ${
                        isToday ? 'ring-2 ring-red-500/50 shadow-lg shadow-red-500/20' : ''
                      }`}
                      style={{
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        minHeight: '600px'
                      }}
                    >
                      {/* Заголовок дня недели */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-center flex-1">
                          <div className="text-sm font-bold mb-1">
                            {format(day, 'EEEE', { locale: ru })}
                          </div>
                          <div className="text-xs text-gray-400">
                            {format(day, 'd MMM', { locale: ru })}
                          </div>
                        </div>
                      </div>

                      {/* Pre-Market Section */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Sun size={12} style={{ color: 'var(--warning-yellow)' }} />
                          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--warning-yellow)' }}>
                            До открытия
                          </h4>
                        </div>
                        <div className="space-y-2" style={{ minHeight: '200px' }}>
                          <TickerList
                            items={dayData.preMarket}
                            dayKey={dayKey}
                            type="pre_market"
                            onSuccess={loadData}
                            onEditTicker={handleEditTicker}
                          />
                        </div>
                        <TickerInput
                          dayKey={dayKey}
                          type="pre_market"
                          onSuccess={loadData}
                        />
                      </div>

                      {/* After-Market Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Moon size={12} style={{ color: 'var(--neutral-blue)' }} />
                          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neutral-blue)' }}>
                            После закрытия
                          </h4>
                        </div>
                        <div className="space-y-2" style={{ minHeight: '200px' }}>
                          <TickerList
                            items={dayData.afterMarket}
                            dayKey={dayKey}
                            type="after_market"
                            onSuccess={loadData}
                            onEditTicker={handleEditTicker}
                          />
                        </div>
                        <TickerInput
                          dayKey={dayKey}
                          type="after_market"
                          onSuccess={loadData}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Боковая панель с задачами - увеличенная ширина 500px */}
            <div className="w-[500px] flex-shrink-0">
              <PriorityTasks
                tasks={plannerData.weekendTasks || []}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onReorder={handleReorder}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Модальное окно редактирования тикера */}
      <EditTickerModal
        ticker={editingTicker}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveTicker}
      />

      {/* Модальное окно экспорта анализа */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  )
}