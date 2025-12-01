import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import {
  format,
  differenceInHours,
  differenceInDays,
  isPast,
  isToday,
  intervalToDuration,
  startOfDay
} from 'date-fns'
import { ru } from 'date-fns/locale'

interface DeadlineProgressProps {
  deadline: Date
  createdAt?: Date
  className?: string
  compact?: boolean
}

export default function DeadlineProgress({
  deadline,
  createdAt = new Date(),
  className = '',
  compact = false
}: DeadlineProgressProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Обновляем каждую минуту

    return () => clearInterval(interval)
  }, [])

  const isOverdue = isPast(deadline)
  const isUrgent = !isOverdue && differenceInHours(deadline, currentTime) <= 24
  const isSoon = !isOverdue && !isUrgent && differenceInDays(deadline, currentTime) <= 3

  // Расчет прогресса
  const totalHours = differenceInHours(deadline, createdAt)
  const elapsedHours = isOverdue
    ? totalHours
    : differenceInHours(currentTime, createdAt)
  const progress = totalHours > 0
    ? Math.min(100, Math.max(0, (elapsedHours / totalHours) * 100))
    : 100

  // Форматирование оставшегося времени
  const formatTimeRemaining = () => {
    if (isOverdue) {
      const overdue = intervalToDuration({
        start: startOfDay(deadline),
        end: startOfDay(currentTime)
      })

      const parts = []
      if (overdue.days) parts.push(`${overdue.days} дн`)
      if (overdue.months) parts.push(`${overdue.months} мес`)

      return `Просрочено: ${parts.join(' ') || 'менее дня'}`
    }

    if (isToday(deadline)) {
      const hours = differenceInHours(deadline, currentTime)
      if (hours <= 1) return '< 1 часа'
      return `${hours} ч`
    }

    const days = differenceInDays(deadline, currentTime)
    const hours = differenceInHours(deadline, currentTime) % 24

    if (days === 0) {
      return `${hours} ч`
    }
    if (days === 1 && hours === 0) {
      return 'Завтра'
    }
    if (hours === 0) {
      return `${days} дн`
    }
    return `${days} дн ${hours} ч`
  }

  // Определение цвета прогресс-бара
  const getProgressColor = () => {
    if (isOverdue) return 'bg-red-500'
    if (isUrgent) return 'bg-orange-500'
    if (isSoon) return 'bg-yellow-500'
    return 'bg-emerald-500'
  }

  // Определение иконки и цвета текста
  const getMeta = () => {
    if (isOverdue) {
      return {
        icon: AlertTriangle,
        textClass: 'text-red-400',
        label: 'Просрочено'
      }
    }
    if (isUrgent) {
      return {
        icon: Clock,
        textClass: 'text-orange-400',
        label: 'Срочно'
      }
    }
    if (isSoon) {
      return {
        icon: Clock,
        textClass: 'text-yellow-400',
        label: 'Скоро'
      }
    }
    return {
      icon: CheckCircle,
      textClass: 'text-blue-400',
      label: 'Время'
    }
  }

  const { icon: Icon, textClass, label } = getMeta()

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/50 ${className}`}>
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="text-xs font-medium">
          {format(deadline, 'dd MMM', { locale: ru })}
        </span>
        <span className="text-xs text-gray-400">•</span>
        <span className="text-xs font-medium">{formatTimeRemaining()}</span>
      </div>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Дата и статус */}
      <div className={`flex items-center justify-between ${textClass}`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs font-medium">
            {format(deadline, 'dd MMMM, HH:mm', { locale: ru })}
          </span>
        </div>
        <span className="text-xs font-medium bg-black/30 px-2 py-0.5 rounded-full">
          {formatTimeRemaining()}
        </span>
      </div>

      {/* Прогресс-бар */}
      <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        />

        {/* Анимация для просроченных */}
        {isOverdue && (
          <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
        )}
      </div>

      {/* Подсказка */}
      {isOverdue && (
        <p className="text-xs text-red-400/80">
          Задача просрочена!
        </p>
      )}
    </div>
  )
}