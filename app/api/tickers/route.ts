import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ticker, rating, predictionPrice, type, positionSize, confidenceLevel, weeklyEntryId } = body

    // Получаем или создаем weekly entry
    const entry = await prisma.weeklyEntry.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: new Date(weeklyEntryId)
        }
      },
      update: {},
      create: {
        userId: session.user.id,
        date: new Date(weeklyEntryId)
      }
    })

    // Создаем тикер
    const newTicker = await prisma.ticker.create({
      data: {
        weeklyEntryId: entry.id,
        ticker,
        rating,
        predictionPrice,
        type,
        positionSize,
        confidenceLevel,
        status: 'pending'
      }
    })

    return NextResponse.json(newTicker)
  } catch (error) {
    console.error('Error creating ticker:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}