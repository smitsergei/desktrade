import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - получить отдельный тикер
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticker = await prisma.ticker.findFirst({
      where: {
        id: params.id,
        weeklyEntry: {
          userId: session.user.id
        }
      }
    })

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker not found' }, { status: 404 })
    }

    // Конвертируем Decimal значения
    const convertedTicker = {
      ...ticker,
      predictionPrice: Number(ticker.predictionPrice),
      actualResult: ticker.actualResult ? Number(ticker.actualResult) : null
    }

    return NextResponse.json(convertedTicker)
  } catch (error) {
    console.error('Error fetching ticker:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - обновить тикер
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tickerId = params.id
    const body = await request.json()

    // Проверяем, что тикер принадлежит пользователю
    const existingTicker = await prisma.ticker.findFirst({
      where: {
        id: tickerId,
        weeklyEntry: {
          userId: session.user.id
        }
      }
    })

    if (!existingTicker) {
      return NextResponse.json({ error: 'Ticker not found' }, { status: 404 })
    }

    // Обновляем тикер
    const updatedTicker = await prisma.ticker.update({
      where: { id: tickerId },
      data: {
        ...(body.ticker !== undefined && { ticker: body.ticker }),
        ...(body.rating !== undefined && { rating: body.rating }),
        ...(body.predictionPrice !== undefined && { predictionPrice: body.predictionPrice }),
        ...(body.actualResult !== undefined && { actualResult: body.actualResult }),
        ...(body.confidenceLevel !== undefined && { confidenceLevel: body.confidenceLevel }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.status !== undefined && { status: body.status })
      }
    })

    return NextResponse.json(updatedTicker)
  } catch (error) {
    console.error('Error updating ticker:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tickerId = params.id

    // Проверяем, что тикер принадлежит пользователю
    const ticker = await prisma.ticker.findFirst({
      where: {
        id: tickerId,
        weeklyEntry: {
          userId: session.user.id
        }
      }
    })

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker not found' }, { status: 404 })
    }

    // Удаляем тикер
    await prisma.ticker.delete({
      where: {
        id: tickerId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ticker:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}