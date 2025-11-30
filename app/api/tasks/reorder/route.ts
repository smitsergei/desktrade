import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskIds } = await request.json()

    if (!Array.isArray(taskIds)) {
      return NextResponse.json({ error: 'taskIds must be an array' }, { status: 400 })
    }

    // Получаем все задачи, которые были перемещены
    const movingTasks = await prisma.weekendTask.findMany({
      where: {
        id: { in: taskIds },
        userId: session.user.id
      },
      select: { id: true, weekStartDate: true, priority: true }
    })

    if (movingTasks.length === 0) {
      return NextResponse.json({ error: 'No tasks found' }, { status: 404 })
    }

    // Берем дату недели из первой задачи
    const weekStartDate = movingTasks[0].weekStartDate

    // Получаем ВСЕ задачи пользователя за эту неделю
    const allTasks = await prisma.weekendTask.findMany({
      where: {
        userId: session.user.id,
        weekStartDate
      },
      select: { id: true, priority: true, order: true }
    })

    // Группируем все задачи по приоритетам
    const tasksByPriority = new Map<number, typeof allTasks>()
    allTasks.forEach(task => {
      if (!tasksByPriority.has(task.priority)) {
        tasksByPriority.set(task.priority, [])
      }
      tasksByPriority.get(task.priority)!.push(task)
    })

    // Для каждого приоритета обновляем порядок задач
    for (const [priority, tasks] of tasksByPriority.entries()) {
      // Находим задачи этого приоритета в новом порядке (из taskIds)
      const newOrderIds = taskIds.filter(id => {
        const task = tasks.find(t => t.id === id)
        return task?.priority === priority
      })

      // Если есть задачи этого приоритета в новом порядке
      if (newOrderIds.length > 0) {
        // Создаем обновления для нового порядка
        const updates = newOrderIds.map((id, index) =>
          prisma.weekendTask.update({
            where: { id },
            data: { order: index + 1 }
          })
        )

        await prisma.$transaction(updates)
      } else {
        // Если задачи этого приоритета не были перемещены,
        // но нужно убедиться что у них есть правильные order значения
        const needsOrderUpdate = tasks.some(task => !task.order || task.order === 0)

        if (needsOrderUpdate) {
          const updates = tasks.map((task, index) =>
            prisma.weekendTask.update({
              where: { id: task.id },
              data: { order: index + 1 }
            })
          )
          await prisma.$transaction(updates)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}