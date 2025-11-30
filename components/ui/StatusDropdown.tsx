'use client'

import { ChevronDown } from 'lucide-react'

interface StatusOption {
  value: string
  label: string
  color: string
}

interface StatusDropdownProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

const statusOptions: StatusOption[] = [
  { value: 'pending', label: 'В ожидании', color: 'text-yellow-400' },
  { value: 'won', label: 'Успешно', color: 'text-green-400' },
  { value: 'lost', label: 'Неудача', color: 'text-red-400' },
  { value: 'cancelled', label: 'Отменена', color: 'text-gray-400' }
]

export default function StatusDropdown({
  value,
  onChange,
  disabled = false,
  className = ''
}: StatusDropdownProps) {
  const currentStatus = statusOptions.find(opt => opt.value === value)

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`input-trading w-full appearance-none pr-10 ${
          currentStatus ? currentStatus.color : 'text-gray-300'
        }`}
      >
        {statusOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  )
}