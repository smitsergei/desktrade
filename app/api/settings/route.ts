import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем настройки пользователя
    let settings = await prisma.userSettings.findUnique({
      where: {
        userId: session.user.id
      }
    })

    // Если настроек нет, создаем их по умолчанию
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          deposit: 1000,
          riskPercentage: 2,
          maxPositionSize: 10
        }
      })
    }

    // Конвертируем Decimal в числа
    const convertedSettings = {
      ...settings,
      deposit: Number(settings.deposit),
      riskPercentage: Number(settings.riskPercentage),
      maxPositionSize: Number(settings.maxPositionSize)
    }

    return NextResponse.json(convertedSettings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { deposit, riskPercentage, maxPositionSize } = body

    // Обновляем настройки
    const settings = await prisma.userSettings.upsert({
      where: {
        userId: session.user.id
      },
      update: {
        deposit,
        riskPercentage,
        maxPositionSize
      },
      create: {
        userId: session.user.id,
        deposit,
        riskPercentage,
        maxPositionSize
      }
    })

    // Конвертируем Decimal в числа
    const convertedSettings = {
      ...settings,
      deposit: Number(settings.deposit),
      riskPercentage: Number(settings.riskPercentage),
      maxPositionSize: Number(settings.maxPositionSize)
    }

    return NextResponse.json(convertedSettings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}