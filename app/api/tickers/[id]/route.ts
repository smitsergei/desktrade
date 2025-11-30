import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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