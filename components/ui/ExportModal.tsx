'use client'

import { useState } from 'react'
import { Download, Calendar, FileText, FileSpreadsheet } from 'lucide-react'
import Modal from './Modal'
import FormField from './FormField'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FormData {
  periodType: 'custom' | 'month' | 'year' | 'all'
  startDate: string
  endDate: string
  month: string
  year: string
  format: 'csv' | 'json'
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [formData, setFormData] = useState<FormData>({
    periodType: 'all',
    startDate: '',
    endDate: '',
    month: new Date().getMonth().toString(),
    year: new Date().getFullYear().toString(),
    format: 'csv'
  })

  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Формируем URL с параметрами
      const params = new URLSearchParams()

      if (formData.periodType === 'custom') {
        if (!formData.startDate || !formData.endDate) {
          alert('Выберите начальную и конечную дату')
          return
        }
        params.append('startDate', formData.startDate)
        params.append('endDate', formData.endDate)
      } else if (formData.periodType === 'month') {
        params.append('month', formData.month)
        params.append('year', formData.year)
      } else if (formData.periodType === 'year') {
        params.append('year', formData.year)
      }

      params.append('format', formData.format)
      params.append('periodType', formData.periodType)

      // Скачиваем файл
      const response = await fetch(`/api/export/analysis?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Ошибка при экспорте')
      }

      if (formData.format === 'json') {
        // Для JSON формата скачиваем как файл
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `trading-analysis-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // Для CSV браузер автоматически скачает файл через headers
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || `trading-analysis.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      onClose()
    } catch (error) {
      console.error('Export error:', error)
      alert('Ошибка при экспорте данных')
    } finally {
      setIsExporting(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = [
    { value: '1', label: 'Январь' },
    { value: '2', label: 'Февраль' },
    { value: '3', label: 'Март' },
    { value: '4', label: 'Апрель' },
    { value: '5', label: 'Май' },
    { value: '6', label: 'Июнь' },
    { value: '7', label: 'Июль' },
    { value: '8', label: 'Август' },
    { value: '9', label: 'Сентябрь' },
    { value: '10', label: 'Октябрь' },
    { value: '11', label: 'Ноябрь' },
    { value: '12', label: 'Декабрь' }
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Экспорт анализа"
    >
      <div className="space-y-6">
        {/* Период экспорта */}
        <FormField label="Период">
          <select
            value={formData.periodType}
            onChange={(e) => setFormData(prev => ({ ...prev, periodType: e.target.value as any }))}
            className="input-trading w-full"
          >
            <option value="all">За всё время</option>
            <option value="custom">Указать даты</option>
            <option value="month">За месяц</option>
            <option value="year">За год</option>
          </select>
        </FormField>

        {formData.periodType === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Начальная дата">
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="input-trading w-full"
                max={new Date().toISOString().split('T')[0]}
              />
            </FormField>
            <FormField label="Конечная дата">
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="input-trading w-full"
                max={new Date().toISOString().split('T')[0]}
              />
            </FormField>
          </div>
        )}

        {formData.periodType === 'month' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Месяц">
              <select
                value={formData.month}
                onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                className="input-trading w-full"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Год">
              <select
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                className="input-trading w-full"
              >
                {years.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        )}

        {formData.periodType === 'year' && (
          <FormField label="Год">
            <select
              value={formData.year}
              onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
              className="input-trading w-full"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {/* Формат экспорта */}
        <FormField label="Формат файла">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, format: 'csv' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.format === 'csv'
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <FileSpreadsheet className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">CSV</span>
              <span className="text-xs text-gray-400 block mt-1">Для Excel/Google Sheets</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, format: 'json' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.format === 'json'
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <FileText className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">JSON</span>
              <span className="text-xs text-gray-400 block mt-1">Для программной обработки</span>
            </button>
          </div>
        </FormField>

        {/* Кнопки действий */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-secondary py-2 px-6 rounded-lg"
            disabled={isExporting}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 btn-primary py-2 px-6 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                <Download size={16} />
                Экспортировать
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}