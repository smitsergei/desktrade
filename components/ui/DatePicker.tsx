import { useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { format, isPast, isToday, startOfDay } from 'date-fns'

interface DatePickerProps {
  selectedDate?: Date | null
  onDateChange: (date: Date | null) => void
  minDate?: Date
  placeholder?: string
  className?: string
}

export default function DatePicker({
  selectedDate,
  onDateChange,
  minDate = startOfDay(new Date()),
  placeholder = 'Выберите дату',
  className = ''
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  )

  const handleDateSelect = (date: string) => {
    const newDate = new Date(date)
    setInputValue(date)
    onDateChange(newDate)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        onDateChange(date)
      }
    } else {
      onDateChange(null)
    }
  }

  const handleClear = () => {
    setInputValue('')
    onDateChange(null)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Генерация дат для календаря
  const generateCalendarDates = () => {
    const dates = []
    const today = startOfDay(new Date())
    const current = new Date(today.getFullYear(), today.getMonth(), 1)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0) // 3 месяца вперед

    while (current <= endDate) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  const calendarDates = generateCalendarDates()

  return (
    <div className={`relative ${className}`}>
      {/* Поле ввода */}
      <div className="relative">
        <input
          type="date"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          min={format(minDate, 'yyyy-MM-dd')}
          placeholder={placeholder}
          className={`
            w-full px-3 py-2 pr-10
            bg-gray-800/50 border border-gray-700/50 rounded-lg
            text-white placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
            transition-all duration-200
            ${inputValue && isPast(new Date(inputValue)) ? 'border-red-500/50' : ''}
          `}
        />

        {/* Кнопка очистки */}
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Подсказка */}
      {inputValue && isPast(new Date(inputValue)) && (
        <p className="mt-1 text-xs text-red-400">
          ⚠️ Дата не может быть в прошлом
        </p>
      )}

      {inputValue && !isPast(new Date(inputValue)) && isToday(new Date(inputValue)) && (
        <p className="mt-1 text-xs text-yellow-400">
          ⏰ Дедлайн сегодня
        </p>
      )}
    </div>
  )
}