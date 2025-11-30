import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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
    const { status } = await request.json()

    // Получаем тикер пользователя
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

    // Обновляем только статус сделки
    await prisma.ticker.update({
      where: { id: tickerId },
      data: {
        status,
        resolvedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      status
    })
  } catch (error) {
    console.error('Error resolving ticker:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}