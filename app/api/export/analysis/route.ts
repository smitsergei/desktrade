import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format_type = searchParams.get('format') || 'csv'
    const periodType = searchParams.get('periodType') || 'custom'

    // Определяем даты
    let start: Date
    let end: Date

    if (periodType === 'all') {
      // Получаем самую раннюю дату
      const firstEntry = await prisma.weeklyEntry.findFirst({
        where: { userId: session.user.id },
        orderBy: { date: 'asc' }
      })
      start = firstEntry ? firstEntry.date : new Date()
      end = new Date()
    } else if (periodType === 'month') {
      const month = searchParams.get('month')
      const year = searchParams.get('year') || new Date().getFullYear().toString()
      if (month) {
        start = new Date(parseInt(year), parseInt(month) - 1, 1)
        end = new Date(parseInt(year), parseInt(month), 0)
      } else {
        // Текущий месяц
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
    } else if (periodType === 'year') {
      const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
      start = new Date(year, 0, 1)
      end = new Date(year, 11, 31)
    } else {
      // custom
      if (!startDate || !endDate) {
        return NextResponse.json({ error: 'startDate and endDate are required for custom period' }, { status: 400 })
      }
      start = new Date(startDate)
      end = new Date(endDate)
    }

    // Добавляем время к датам для полного охвата
    end.setHours(23, 59, 59, 999)

    // Получаем все тикеры за период
    const tickers = await prisma.ticker.findMany({
      where: {
        weeklyEntry: {
          userId: session.user.id,
          date: {
            gte: start,
            lte: end
          }
        }
      },
      include: {
        weeklyEntry: {
          select: {
            date: true
          }
        }
      },
      orderBy: [
        { weeklyEntry: { date: 'asc' } },
        { type: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // Анализируем данные
    const total = tickers.length
    const won = tickers.filter(t => t.status === 'won').length
    const lost = tickers.filter(t => t.status === 'lost').length
    const pending = tickers.filter(t => t.status === 'pending').length
    const cancelled = tickers.filter(t => t.status === 'cancelled').length

    const winRate = total > 0 ? (won / (won + lost)) * 100 : 0

    // Анализ по уверенности
    const confidenceByStatus = {
      won: 0,
      lost: 0,
      pending: 0
    }

    let wonConfidenceSum = 0
    let lostConfidenceSum = 0
    let wonConfidenceCount = 0
    let lostConfidenceCount = 0

    tickers.forEach(ticker => {
      if (ticker.status === 'won' && ticker.confidenceLevel) {
        wonConfidenceSum += ticker.confidenceLevel
        wonConfidenceCount++
      } else if (ticker.status === 'lost' && ticker.confidenceLevel) {
        lostConfidenceSum += ticker.confidenceLevel
        lostConfidenceCount++
      }
    })

    confidenceByStatus.won = wonConfidenceCount > 0 ? wonConfidenceSum / wonConfidenceCount : 0
    confidenceByStatus.lost = lostConfidenceCount > 0 ? lostConfidenceSum / lostConfidenceCount : 0

    // Самые успешные тикеры
    const tickerStats = new Map<string, { won: number, lost: number, total: number }>()

    tickers.forEach(ticker => {
      const current = tickerStats.get(ticker.ticker) || { won: 0, lost: 0, total: 0 }
      current.total++
      if (ticker.status === 'won') current.won++
      else if (ticker.status === 'lost') current.lost++
      tickerStats.set(ticker.ticker, current)
    })

    const topTickers = Array.from(tickerStats.entries())
      .filter(([_, stats]) => stats.total >= 3)
      .map(([ticker, stats]) => ({
        ticker,
        total: stats.total,
        winRate: stats.won + stats.lost > 0 ? (stats.won / (stats.won + stats.lost)) * 100 : 0,
        won: stats.won,
        lost: stats.lost
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10)

    // Временные тренды
    const monthlyStats = new Map<string, { won: number, lost: number, total: number }>()

    tickers.forEach(ticker => {
      const monthKey = format(ticker.weeklyEntry.date, 'yyyy-MM')
      const current = monthlyStats.get(monthKey) || { won: 0, lost: 0, total: 0 }
      current.total++
      if (ticker.status === 'won') current.won++
      else if (ticker.status === 'lost') current.lost++
      monthlyStats.set(monthKey, current)
    })

    const trendData = Array.from(monthlyStats.entries())
      .map(([month, stats]) => ({
        month,
        total: stats.total,
        winRate: stats.won + stats.lost > 0 ? (stats.won / (stats.won + stats.lost)) * 100 : 0,
        won: stats.won,
        lost: stats.lost
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Формируем ответ
    const analysisData = {
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        type: periodType
      },
      summary: {
        total,
        won,
        lost,
        pending,
        cancelled,
        winRate: winRate.toFixed(2)
      },
      confidence: {
        won: confidenceByStatus.won.toFixed(2),
        lost: confidenceByStatus.lost.toFixed(2)
      },
      topTickers,
      trends: trendData,
      tickers: tickers.map(t => ({
        date: format(t.weeklyEntry.date, 'yyyy-MM-dd'),
        ticker: t.ticker,
        type: t.type === 'pre_market' ? 'До открытия' : 'После закрытия',
        status: t.status === 'won' ? 'Успешно' : t.status === 'lost' ? 'Неудача' : t.status === 'pending' ? 'В ожидании' : 'Отменена',
        predictionPrice: Number(t.predictionPrice),
        actualResult: t.actualResult ? Number(t.actualResult) : null,
        confidenceLevel: t.confidenceLevel,
        notes: t.notes || ''
      }))
    }

    // В зависимости от формата возвращаем разные данные
    if (format_type === 'json') {
      return NextResponse.json(analysisData)
    } else if (format_type === 'csv') {
      // Генерируем CSV
      const headers = [
        'Дата', 'Тикер', 'Тип сделки', 'Статус',
        'Цена предикшена', 'Фактический результат', 'Уверенность', 'Заметки'
      ]

      const csvRows = [
        headers.join(','),
        ...analysisData.tickers.map(t => [
          t.date,
          t.ticker,
          t.type,
          t.status,
          t.predictionPrice,
          t.actualResult || '',
          t.confidenceLevel,
          `"${t.notes.replace(/"/g, '""')}"`
        ].join(','))
      ]

      // Добавляем статистику в конец
      csvRows.push('')
      csvRows.push('СТАТИСТИКА')
      csvRows.push(`Период: ${analysisData.period.start} - ${analysisData.period.end}`)
      csvRows.push(`Всего сделок: ${analysisData.summary.total}`)
      csvRows.push(`Успешных: ${analysisData.summary.won}`)
      csvRows.push(`Неудачных: ${analysisData.summary.lost}`)
      csvRows.push(`В ожидании: ${analysisData.summary.pending}`)
      csvRows.push(`Win Rate: ${analysisData.summary.winRate}%`)
      csvRows.push(`Средняя уверенность при успехе: ${analysisData.confidence.won}`)
      csvRows.push(`Средняя уверенность при неудаче: ${analysisData.confidence.lost}`)

      const csv = csvRows.join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="trading-analysis-${format(start, 'yyyy-MM-dd')}.csv"`
        }
      })
    } else {
      return NextResponse.json({ error: 'Unsupported format. Use csv or json' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error exporting analysis:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}