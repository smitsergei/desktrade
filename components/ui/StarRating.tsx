'use client'

import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function StarRating({
  value,
  onChange,
  disabled = false,
  size = 'md',
  className = ''
}: StarRatingProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating)
    }
  }

  return (
    <div className={`flex gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={disabled}
          className={`${sizes[size]} transition-all duration-200 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
          }`}
        >
          <Star
            className={`${sizes[size]} ${
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}