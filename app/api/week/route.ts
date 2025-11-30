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

    // Создаем карту для быстрого доступа
    const entriesMap = new Map(
      weeklyEntries.map(entry => [format(entry.date, 'yyyy-MM-dd'), entry])
    )

    // Обрабатываем каждый день
    for (const day of weekDays) {
      const dayKey = format(day, 'yyyy-MM-dd')
      const entry = entriesMap.get(dayKey)

      if (entry) {
        result[dayKey] = {
          preMarket: entry.tickers.filter(t => t.type === 'pre_market'),
          afterMarket: entry.tickers.filter(t => t.type === 'after_market')
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
    const weekendTasks = await prisma.weekendTask.findMany({
      where: {
        userId: session.user.id,
        weekStartDate: weekStart
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

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