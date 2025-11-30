'use client'

import { useState, useEffect } from 'react'
import { Edit2, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import Modal from './Modal'
import FormField from './FormField'
import StarRating from './StarRating'
import StatusDropdown from './StatusDropdown'

interface Ticker {
  id: string
  ticker: string
  type: string
  status: string
  predictionPrice: number
  actualResult?: number
  profitLoss?: number
  positionSize?: number
  confidenceLevel: number
  notes?: string
}

interface EditTickerModalProps {
  ticker: Ticker | null
  isOpen: boolean
  onClose: () => void
  onSave: (tickerId: string, data: any) => Promise<void>
}

interface FormData {
  ticker: string
  status: string
  predictionPrice: string
  actualResult: string
  notes: string
  confidenceLevel: number
}

interface FormErrors {
  ticker?: string
  predictionPrice?: string
  actualResult?: string
}

export default function EditTickerModal({
  ticker,
  isOpen,
  onClose,
  onSave
}: EditTickerModalProps) {
  const [formData, setFormData] = useState<FormData>({
    ticker: '',
    status: 'pending',
    predictionPrice: '',
    actualResult: '',
    notes: '',
    confidenceLevel: 3
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Инициализация формы при открытии
  useEffect(() => {
    if (ticker && isOpen) {
      setFormData({
        ticker: ticker.ticker,
        status: ticker.status,
        predictionPrice: ticker.predictionPrice.toString(),
        actualResult: ticker.actualResult?.toString() || '',
        notes: ticker.notes || '',
        confidenceLevel: ticker.confidenceLevel || 3
      })
      setErrors({})
      setHasUnsavedChanges(false)
    }
  }, [ticker, isOpen])

  // Расчет P&L и размера позиции
  const calculatePnL = () => {
    if (!formData.actualResult || !formData.predictionPrice) return null

    const predictionPrice = parseFloat(formData.predictionPrice)
    const actualResult = parseFloat(formData.actualResult)

    if (isNaN(predictionPrice) || isNaN(actualResult)) return null

    // Для предикшен маркетов:
    // Win: +размер позиции
    // Loss: -размер позиции * цена предикшена
    const positionSize = 100 // Примерный размер позиции
    if (formData.status === 'won') {
      return positionSize
    } else if (formData.status === 'lost') {
      return -positionSize * predictionPrice
    }

    return 0
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Валидация тикера
    if (!formData.ticker.trim()) {
      newErrors.ticker = 'Тикер обязателен'
    } else if (formData.ticker.length > 10) {
      newErrors.ticker = 'Максимальная длина - 10 символов'
    }

    // Валидация цены предикшена
    if (!formData.predictionPrice) {
      newErrors.predictionPrice = 'Цена предикшена обязательна'
    } else {
      const price = parseFloat(formData.predictionPrice)
      if (isNaN(price) || price < 0.01 || price > 0.99) {
        newErrors.predictionPrice = 'Цена должна быть от 0.01 до 0.99'
      }
    }

    // Валидация фактического результата
    if (formData.actualResult) {
      const result = parseFloat(formData.actualResult)
      if (isNaN(result) || result < 0.01 || result > 0.99) {
        newErrors.actualResult = 'Результат должен быть от 0.01 до 0.99'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !ticker) return

    setIsSubmitting(true)

    try {
      const updateData = {
        ticker: formData.ticker.toUpperCase(),
        status: formData.status,
        predictionPrice: parseFloat(formData.predictionPrice),
        actualResult: formData.actualResult ? parseFloat(formData.actualResult) : null,
        notes: formData.notes,
        confidenceLevel: formData.confidenceLevel
      }

      await onSave(ticker.id, updateData)
      setHasUnsavedChanges(false)
      onClose()
    } catch (error) {
      console.error('Error saving ticker:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    // Очищаем ошибку при изменении поля
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // Предотвращение закрытия с несохраненными данными
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('Есть несохраненные изменения. Вы уверены, что хотите закрыть?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  const calculatedPnL = calculatePnL()

  if (!ticker) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <Edit2 size={20} />
          Редактирование сделки
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Левая колонка */}
          <div className="space-y-4">
            <FormField label="Тикер" error={errors.ticker} required>
              <input
                type="text"
                value={formData.ticker}
                onChange={(e) => handleInputChange('ticker', e.target.value)}
                className="input-trading w-full uppercase"
                placeholder="AAPL"
                maxLength={10}
              />
            </FormField>

            <FormField label="Тип сделки">
              <input
                type="text"
                value={formData.type === 'pre_market' ? 'До открытия' : 'После закрытия'}
                disabled
                className="input-trading w-full bg-gray-700/50 cursor-not-allowed"
              />
            </FormField>

            <FormField label="Статус">
              <StatusDropdown
                value={formData.status}
                onChange={(value) => handleInputChange('status', value)}
              />
            </FormField>

            <FormField label="Уверенность">
              <StarRating
                value={formData.confidenceLevel}
                onChange={(value) => handleInputChange('confidenceLevel', value)}
                size="lg"
              />
            </FormField>
          </div>

          {/* Правая колонка */}
          <div className="space-y-4">
            <FormField label="Цена предикшена" error={errors.predictionPrice} required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.99"
                  value={formData.predictionPrice}
                  onChange={(e) => handleInputChange('predictionPrice', e.target.value)}
                  className="input-trading w-full pl-8"
                  placeholder="0.50"
                />
              </div>
            </FormField>

            <FormField label="Фактический результат" error={errors.actualResult}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.99"
                  value={formData.actualResult}
                  onChange={(e) => handleInputChange('actualResult', e.target.value)}
                  className="input-trading w-full pl-8"
                  placeholder="0.75"
                />
              </div>
            </FormField>

            {calculatedPnL !== null && (
              <FormField label="P&L">
                <div className={`p-3 rounded-lg border ${
                  calculatedPnL > 0
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : calculatedPnL < 0
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                }`}>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} />
                    <span className="font-mono font-bold">
                      ${calculatedPnL.toFixed(2)}
                    </span>
                  </div>
                </div>
              </FormField>
            )}
          </div>
        </div>

        <FormField label="Заметки">
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="input-trading w-full min-h-[80px] resize-none"
            placeholder="Добавьте заметки по сделке..."
            maxLength={500}
          />
          <div className="text-xs text-gray-400 mt-1">
            {formData.notes.length}/500
          </div>
        </FormField>

        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertCircle size={16} className="text-yellow-400" />
            <span className="text-sm text-yellow-400">
              Есть несохраненные изменения
            </span>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary py-2 px-6 rounded-lg flex-1"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2 px-6 rounded-lg flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}