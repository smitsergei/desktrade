'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  Active,
  Over
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { GripVertical, Edit2, Trash2 } from 'lucide-react'
import { WeekendTask } from '@/types'
import DeadlineProgress from './DeadlineProgress'
import { isPast } from 'date-fns'

interface DraggableTaskListProps {
  tasks: WeekendTask[]
  onReorder: (taskIds: string[]) => Promise<void>
  onToggleTask: (id: string) => void
  onEditTask: (id: string, text: string, priority: number) => void
  onDeleteTask: (id: string) => void
  onEdit: (task: WeekendTask) => void
}

export default function DraggableTaskList({
  tasks,
  onReorder,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onEdit
}: DraggableTaskListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const activeTask = tasks.find(task => task.id === active.id)
      const overTask = tasks.find(task => task.id === over?.id)

      // Проверяем, что задачи в одной группе приоритета
      if (activeTask && overTask && activeTask.priority === overTask.priority) {
        // Получаем все задачи этого же приоритета
        const priorityTasks = tasks.filter(t => t.priority === activeTask.priority)

        const oldIndex = priorityTasks.findIndex(task => task.id === active.id)
        const newIndex = priorityTasks.findIndex(task => task.id === over?.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newPriorityTasks = arrayMove(priorityTasks, oldIndex, newIndex)

          // Создаем новый полный список задач, изменив только порядок в этой группе
          const newTasks = [...tasks]
          let priorityIndex = 0

          newTasks.forEach((task, index) => {
            if (task.priority === activeTask.priority) {
              newTasks[index] = newPriorityTasks[priorityIndex++]
            }
          })

          const newTaskIds = newTasks.map(task => task.id)
          await onReorder(newTaskIds)
        }
      }
    }

    setActiveId(null)
  }

  // Сначала сортируем все задачи по приоритету и порядку
  const sortedTasks = [...tasks].sort((a, b) => {
    // Сначала по приоритету (по убыванию: 3,2,1)
    if (a.priority !== b.priority) {
      return (b.priority || 1) - (a.priority || 1)
    }
    // Затем по порядку (по возрастанию)
    return (a.order || 0) - (b.order || 0)
  })

  // Группируем отсортированные задачи по приоритетам для отображения
  const tasksByPriority = sortedTasks.reduce((acc, task) => {
    const priority = task.priority || 1
    if (!acc[priority]) {
      acc[priority] = []
    }
    acc[priority].push(task)
    return acc
  }, {} as Record<number, typeof sortedTasks>)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map((task) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              onToggle={onToggleTask}
              onEdit={() => onEdit(task)}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId ? (
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-gray-600/50">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <div className="w-5 h-5 rounded-lg border-2 border-cyan-400/50 flex items-center justify-center">
                  <div className="w-3 h-3 bg-cyan-400/80 rounded-full"></div>
                </div>
              </div>
              <div className="flex-1">
                <span className="text-base text-white">
                  {tasks.find(t => t.id === activeId)?.text}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableTaskItem({
  task,
  onToggle,
  onEdit,
  onDelete
}: {
  task: WeekendTask
  onToggle: (id: string) => void
  onEdit: () => void
  onDelete: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return 'bg-red-500/10 border-red-500/30'
      case 2: return 'bg-yellow-500/10 border-yellow-500/30'
      case 1: return 'bg-green-500/10 border-green-500/30'
      default: return 'bg-yellow-500/10 border-yellow-500/30'
    }
  }

  // Определяем цвет рамки в зависимости от дедлайна
  const getDeadlineBorderColor = () => {
    if (!task.deadline) return 'border-gray-700/50'

    const now = new Date()
    const deadline = new Date(task.deadline)
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (isPast(deadline)) {
      return 'border-red-500/50 bg-red-500/5' // Просрочено - красный фон
    }
    if (hoursUntilDeadline <= 24) {
      return 'border-orange-500/50 bg-orange-500/5' // Срочно - оранжевый фон
    }
    if (hoursUntilDeadline <= 72) {
      return 'border-yellow-500/50 bg-yellow-500/5' // Скоро - желтый фон
    }

    return 'border-gray-700/50' // Есть время - стандартный цвет
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 3: return 'Высокий'
      case 2: return 'Средний'
      case 1: return 'Низкий'
      default: return 'Средний'
    }
  }

  const getPriorityColorText = (priority: number) => {
    switch (priority) {
      case 3: return 'text-red-400'
      case 2: return 'text-yellow-400'
      case 1: return 'text-green-400'
      default: return 'text-yellow-400'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-4 rounded-xl bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all cursor-move group border ${getDeadlineBorderColor()}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} className="text-gray-500 hover:text-gray-400 transition-colors" />
      </div>

      {/* Checkbox */}
      <div className="mt-1">
        <div
          className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
            task.done
              ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/25'
              : 'border-gray-600 hover:border-emerald-500/50 group-hover:border-emerald-500'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(task.id)
          }}
        >
          {task.done && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      {/* Task content */}
      <div className="flex-1 min-w-0">
        {/* Дедлайн - отображается если установлен */}
        {task.deadline && (
          <div className="mb-2">
            <DeadlineProgress
              deadline={new Date(task.deadline)}
              createdAt={new Date(task.createdAt)}
              compact={true}
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          {/* Priority indicator - less prominent */}
          <div className="flex items-center gap-2">
            <div
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                task.priority === 3
                  ? 'bg-red-500/20 text-red-400'
                  : task.priority === 2
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {task.priority === 3 ? '!' : task.priority === 2 ? '!!' : '!!!'}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-all hover:scale-110"
              style={{ color: 'var(--text-muted)' }}
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-all hover:scale-110"
              style={{ color: 'var(--text-muted)' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {/* Main task text - more prominent */}
        <div className="text-base leading-relaxed">
          <span
            className={`${task.done ? 'line-through opacity-50' : ''} font-normal`}
            style={{
              color: task.done ? 'var(--text-muted)' : 'var(--text-primary)'
            }}
          >
            {task.text}
          </span>
        </div>
        {/* Priority label - subtle */}
        <div className="mt-1">
          <span
            className={`text-xs ${
              task.priority === 3
                ? 'text-red-400/70'
                : task.priority === 2
                ? 'text-yellow-400/70'
                : 'text-emerald-400/70'
            }`}
          >
            {task.priority === 3 ? 'Высокий приоритет' : task.priority === 2 ? 'Средний приоритет' : 'Низкий приоритет'}
          </span>
        </div>
      </div>
    </div>
  )
}