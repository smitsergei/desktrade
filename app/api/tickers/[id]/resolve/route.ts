import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tickerId = params.id
    const { status } = await request.json()

    // Получаем тикер и настройки пользователя
    const ticker = await prisma.ticker.findFirst({
      where: {
        id: tickerId,
        weeklyEntry: {
          userId: session.user.id
        }
      },
      include: {
        weeklyEntry: {
          include: {
            user: {
              include: {
                settings: true
              }
            }
          }
        }
      }
    })

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker not found' }, { status: 404 })
    }

    const settings = ticker.weeklyEntry.user.settings
    if (!settings) {
      return NextResponse.json({ error: 'User settings not found' }, { status: 404 })
    }

    // Рассчитываем P&L
    let profitLoss = 0
    if (status === 'won') {
      profitLoss = Number(ticker.positionSize) // При выигрыше получаем полную сумму
    } else if (status === 'lost') {
      profitLoss = -Number(ticker.positionSize) * Number(ticker.predictionPrice) // При проигрыше теряем позицию * цену
    }

    // Обновляем баланс
    const newBalance = Number(settings.deposit) + profitLoss

    // Обновляем транзакцией
    await prisma.$transaction([
      // Обновляем тикер
      prisma.ticker.update({
        where: { id: tickerId },
        data: {
          status,
          profitLoss,
          resolvedAt: new Date()
        }
      }),

      // Обновляем баланс пользователя
      prisma.userSettings.update({
        where: { userId: session.user.id },
        data: {
          deposit: newBalance
        }
      }),

      // Добавляем запись в историю баланса
      prisma.balanceHistory.create({
        data: {
          userId: session.user.id,
          balanceBefore: Number(settings.deposit),
          balanceAfter: newBalance,
          changeAmount: profitLoss,
          changePercentage: (profitLoss / Number(settings.deposit)) * 100,
          tickerId
        }
      })
    ])

    return NextResponse.json({
      success: true,
      profitLoss,
      newBalance
    })
  } catch (error) {
    console.error('Error resolving ticker:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}