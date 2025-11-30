import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = new Date(searchParams.get('start') || '')
    const endDate = new Date(searchParams.get('end') || '')

    // Получаем или создаем записи для каждой даты недели
    const weekDays = []
    const currentDay = new Date(startDate)
    while (currentDay <= endDate) {
      weekDays.push(currentDay)
      currentDay.setDate(currentDay.getDate() + 1)
    }

    const result: any = {}

    // Получаем weekly entries
    console.log('Searching entries between:', { startDate, endDate })
    const weeklyEntries = await prisma.weeklyEntry.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        tickers: true
      }
    })
    console.log('Found weekly entries:', weeklyEntries.length)

    // Создаем карту для быстрого доступа
    const entriesMap = new Map(
      weeklyEntries.map(entry => {
        const dayKey = format(entry.date, 'yyyy-MM-dd')
        console.log(`Entry for ${dayKey}:`, {
          id: entry.id,
          date: entry.date,
          tickersCount: entry.tickers.length
        })
        return [dayKey, entry]
      })
    )

    // Обрабатываем каждый день
    for (const day of weekDays) {
      const dayKey = format(day, 'yyyy-MM-dd')
      const entry = entriesMap.get(dayKey)

      if (entry) {
        // Конвертируем Decimal значения в тикерах
        const convertTickers = (tickers: any[]) => tickers.map(ticker => ({
          ...ticker,
          predictionPrice: Number(ticker.predictionPrice),
          profitLoss: ticker.profitLoss ? Number(ticker.profitLoss) : null,
          positionSize: ticker.positionSize ? Number(ticker.positionSize) : null,
          actualResult: ticker.actualResult ? Number(ticker.actualResult) : null
        }))

        result[dayKey] = {
          preMarket: convertTickers(entry.tickers.filter(t => t.type === 'pre_market')),
          afterMarket: convertTickers(entry.tickers.filter(t => t.type === 'after_market'))
        }
      } else {
        result[dayKey] = {
          preMarket: [],
          afterMarket: []
        }
      }
    }

    // Получаем задачи на выходные
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 })
    // Создаем диапазон дат для недели (понедельник - воскресенье)
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

    console.log('Fetching tasks for week:', { weekStart, weekEnd, userId: session.user.id })

    const weekendTasks = await prisma.weekendTask.findMany({
      where: {
        userId: session.user.id,
        weekStartDate: {
          gte: weekStart,
          lte: weekEnd
        }
      },
      orderBy: [
        { priority: 'desc' }, // Сначала по приоритету (высокий к низкому)
        { done: 'asc' },     // Затем невыполненные
        { createdAt: 'desc' } // Потом новые
      ]
    })

    console.log('Found tasks:', weekendTasks.length)

    result.weekendTasks = weekendTasks

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching week data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}