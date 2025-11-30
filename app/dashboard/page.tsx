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
  Wallet
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

// Основной компонент приложения
export default function TraderPlanner() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [plannerData, setPlannerData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [userSettings, setUserSettings] = useState<any>(null)

  // Проверка аутентификации
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }

    // Загрузка данных
    fetchWeekData()
    fetchUserSettings()
  }, [session, status, router, currentDate])

  // Загрузка данных недели
  const fetchWeekData = async () => {
    try {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = addDays(weekStart, 4)

      const response = await fetch(`/api/week?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${session?.user?.email}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPlannerData(data)
      }
    } catch (error) {
      console.error('Error fetching week data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Загрузка настроек пользователя
  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${session?.user?.email}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUserSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  // Сохранение данных
  const saveData = async (endpoint: string, data: any) => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.email}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to save data')
      }

      return await response.json()
    } catch (error) {
      console.error('Error saving data:', error)
      throw error
    }
  }

  // Компонент для добавления тикера
  const TickerInput = ({ dayKey, type, existingItems }: {
    dayKey: string,
    type: 'pre_market' | 'after_market',
    existingItems: Ticker[]
  }) => {
    const [ticker, setTicker] = useState('')
    const [rating, setRating] = useState('')
    const [predictionPrice, setPredictionPrice] = useState('')
    const [confidenceLevel, setConfidenceLevel] = useState('50')

    const handleAdd = async () => {
      if (!ticker) return

      // Расчет размера позиции
      const riskAmount = userSettings?.deposit * (userSettings?.riskPercentage / 100)
      const positionSize = riskAmount / parseFloat(predictionPrice || 0.1)

      const newItem = {
        ticker: ticker.toUpperCase(),
        rating: parseInt(rating) || 1,
        predictionPrice: parseFloat(predictionPrice) || 0.5,
        type,
        positionSize,
        confidenceLevel: parseInt(confidenceLevel) || 50
      }

      try {
        await saveData('/api/tickers', {
          ...newItem,
          weeklyEntryId: dayKey
        })

        // Обновляем локальное состояние
        fetchWeekData()
        setTicker('')
        setRating('')
        setPredictionPrice('')
        setConfidenceLevel('50')
      } catch (error) {
        console.error('Error adding ticker:', error)
      }
    }

    return (
      <div className="flex flex-col gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 mt-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Тикер"
            className="p-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 uppercase font-bold text-slate-800 dark:text-white"
          />
          <input
            value={rating}
            type="number"
            min="1"
            max="3"
            onChange={(e) => setRating(e.target.value)}
            placeholder="Рейт (1-3)"
            className="p-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
          />
          <input
            value={predictionPrice}
            type="number"
            min="0"
            max="1"
            step="0.01"
            onChange={(e) => setPredictionPrice(e.target.value)}
            placeholder="Цена (0-1)"
            className="p-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
          />
          <input
            value={confidenceLevel}
            type="number"
            min="1"
            max="100"
            onChange={(e) => setConfidenceLevel(e.target.value)}
            placeholder="Уверенность (%)"
            className="p-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
          />
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors w-full"
        >
          <Plus size={14} /> Добавить
        </button>
      </div>
    )
  }

  // Компонент для отображения тикера
  const TickerItem = ({ item }: { item: Ticker & { id?: string } }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [showResolve, setShowResolve] = useState(false)

    const getRatingColor = (r: number) => {
      if (r === 3) return "border-l-4 border-green-500 bg-green-50/50 dark:bg-green-900/20"
      if (r === 2) return "border-l-4 border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/20"
      return "border-l-4 border-slate-300 bg-white dark:bg-slate-700"
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'won': return 'text-green-600 dark:text-green-400'
        case 'lost': return 'text-red-600 dark:text-red-400'
        case 'pending': return 'text-yellow-600 dark:text-yellow-400'
        default: return 'text-slate-500'
      }
    }

    const handleResolve = async (result: 'won' | 'lost') => {
      try {
        await fetch(`/api/tickers/${item.id}/resolve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.user?.email}`
          },
          body: JSON.stringify({ status: result })
        })

        fetchWeekData()
        setShowResolve(false)
      } catch (error) {
        console.error('Error resolving ticker:', error)
      }
    }

    const handleDelete = async () => {
      try {
        await fetch(`/api/tickers/${item.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.user?.email}`
          }
        })

        fetchWeekData()
      } catch (error) {
        console.error('Error deleting ticker:', error)
      }
    }

    return (
      <div className={`p-2 rounded shadow-sm mt-2 transition-colors ${getRatingColor(item.rating)}`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.ticker}</div>
            <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-300 mt-1">
              <span className="flex items-center gap-1 font-medium">
                <Star size={10} className={item.rating >= 2 ? "fill-current" : ""} /> {item.rating}/3
              </span>
              <span className="flex items-center gap-1">
                <DollarSign size={10} /> {item.predictionPrice}
              </span>
              <span className={`flex items-center gap-1 ${getStatusColor(item.status)}`}>
                Статус: {item.status === 'won' ? 'Выигрыш' : item.status === 'lost' ? 'Проигрыш' : 'В ожидании'}
              </span>
            </div>
            {item.positionSize && (
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Размер позиции: ${item.positionSize.toFixed(2)}
              </div>
            )}
            {item.profitLoss !== undefined && (
              <div className={`text-xs font-medium mt-1 ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                P&L: ${item.profitLoss.toFixed(2)}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {item.status === 'pending' && (
              <button
                onClick={() => setShowResolve(!showResolve)}
                className="text-slate-400 hover:text-blue-500 p-0.5"
                title="Закрыть сделку"
              >
                <Check size={12} />
              </button>
            )}
            <button
              onClick={handleDelete}
              className="text-slate-400 hover:text-red-500 p-0.5"
              title="Удалить"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {showResolve && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleResolve('won')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-2 rounded"
            >
              Выигрыш
            </button>
            <button
              onClick={() => handleResolve('lost')}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded"
            >
              Проигрыш
            </button>
          </div>
        )}
      </div>
    )
  }

  // Компонент списка тикеров
  const TickerList = ({ items, dayKey, type }: {
    items: Ticker[],
    dayKey: string,
    type: 'pre_market' | 'after_market'
  }) => {
    if (!items || items.length === 0) {
      return <div className="text-xs text-slate-400 italic p-2">Нет записей</div>
    }

    return (
      <div className="space-y-2">
        {items.map((item) => (
          <TickerItem key={item.id} item={item} />
        ))}
      </div>
    )
  }

  // Компонент задач на выходные
  const WeekendNotes = ({ weekId }: { weekId: string }) => {
    const [newTask, setNewTask] = useState('')
    const tasks = plannerData.weekendTasks || []

    const addTask = async () => {
      if (!newTask.trim()) return

      try {
        await saveData('/api/tasks', {
          text: newTask,
          weekStartDate: weekId
        })

        fetchWeekData()
        setNewTask('')
      } catch (error) {
        console.error('Error adding task:', error)
      }
    }

    const toggleTask = async (taskId: string, done: boolean) => {
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.user?.email}`
          },
          body: JSON.stringify({ done })
        })

        fetchWeekData()
      } catch (error) {
        console.error('Error updating task:', error)
      }
    }

    const deleteTask = async (taskId: string) => {
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.user?.email}`
          }
        })

        fetchWeekData()
      } catch (error) {
        console.error('Error deleting task:', error)
      }
    }

    return (
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 h-full border-t-4 border-indigo-500 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 flex items-center gap-2">
          <CheckSquare className="text-indigo-500" />
          Выходные & Идеи
        </h3>
        <p className="text-xs text-slate-500 mb-4">Задачи, анализ, подготовка к следующей неделе</p>

        <div className="flex gap-2 mb-4">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Новая задача..."
            className="flex-1 p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
          />
          <button onClick={addTask} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">
            <Plus size={18} />
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
          {tasks.map((task: WeekendTask) => (
            <div key={task.id} className={`flex items-start gap-2 p-2 rounded ${task.done ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-white dark:bg-slate-700'}`}>
              <input
                type="checkbox"
                checked={task.done}
                onChange={(e) => toggleTask(task.id, e.target.checked)}
                className="mt-1 accent-indigo-600 cursor-pointer"
              />
              <span className={`flex-1 text-sm break-words ${task.done ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                {task.text}
              </span>
              <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-center text-slate-400 text-sm mt-4">Список пуст</p>
          )}
        </div>
      </div>
    )
  }

  // Логика дат
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekId = format(weekStart, 'yyyy-MM-dd')
  const weekDays = Array.from({ length: 5 }).map((_, i) => addDays(weekStart, i))

  const changeWeek = (direction: 'next' | 'prev') => {
    setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-500">
        <div className="animate-pulse">Загрузка еженедельника...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <TrendingUp size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Трейдерский Журнал</h1>
              {userSettings && (
                <div className="text-sm text-slate-500 flex items-center gap-1">
                  <Wallet size={14} />
                  Баланс: ${userSettings.deposit.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
            <button onClick={() => changeWeek('prev')} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium min-w-[140px] text-center flex items-center justify-center gap-2">
              <Calendar size={16} className="text-slate-500" />
              {format(weekStart, 'd MMM', { locale: ru })} - {format(addDays(weekStart, 4), 'd MMM', { locale: ru })}
            </span>
            <button onClick={() => changeWeek('next')} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          <button
            onClick={() => router.push('/dashboard/settings')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Настройки
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Weekdays Container */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {weekDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const isToday = isSameDay(day, new Date())
              const dayData = plannerData[dayKey] || { preMarket: [], afterMarket: [] }

              return (
                <div
                  key={dayKey}
                  className={`flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border ${isToday ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  {/* Day Header */}
                  <div className={`p-3 border-b border-slate-100 dark:border-slate-700 rounded-t-xl ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold capitalize text-slate-700 dark:text-slate-200">
                        {format(day, 'EEEE', { locale: ru })}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isToday ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        {format(day, 'd MMM', { locale: ru })}
                      </span>
                    </div>
                  </div>

                  {/* Pre-Market Section */}
                  <div className="flex-1 p-3 border-b border-slate-100 dark:border-slate-700 bg-orange-50/30 dark:bg-orange-900/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun size={14} className="text-orange-500" />
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">До открытия</h4>
                    </div>
                    <TickerList
                      items={dayData.preMarket}
                      dayKey={dayKey}
                      type="pre_market"
                    />
                    <TickerInput
                      dayKey={dayKey}
                      type="pre_market"
                      existingItems={dayData.preMarket}
                    />
                  </div>

                  {/* After-Market Section */}
                  <div className="flex-1 p-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-b-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon size={14} className="text-blue-500" />
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">На закрытии</h4>
                    </div>
                    <TickerList
                      items={dayData.afterMarket}
                      dayKey={dayKey}
                      type="after_market"
                    />
                    <TickerInput
                      dayKey={dayKey}
                      type="after_market"
                      existingItems={dayData.afterMarket}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Weekend / Notes Sidebar */}
          <div className="lg:w-80 w-full flex-shrink-0">
            <div className="sticky top-24">
              <WeekendNotes weekId={weekId} />

              <div className="mt-6 p-4 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs text-slate-500 leading-relaxed">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">Совет недели</h4>
                <p>
                  "Планируй сделку и торгуй по плану." Заполняйте раздел "До открытия" до начала торгов, чтобы избежать эмоциональных решений во время волатильности.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}