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
    <div className="space-y-4">
      {[3, 2, 1].map(priority => {
        const priorityTasks = tasksByPriority[priority] || []
        if (priorityTasks.length === 0) return null

        const priorityLabel = priority === 3 ? 'Высокий приоритет' : priority === 2 ? 'Средний приоритет' : 'Низкий приоритет'
        const priorityColor = priority === 3 ? 'text-red-400' : priority === 2 ? 'text-yellow-400' : 'text-green-400'

        return (
          <div key={priority}>
            <div className={`text-xs font-medium mb-2 ${priorityColor}`}>
              {priorityLabel}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={priorityTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {priorityTasks.map((task) => (
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
                  <div className="bg-gray-800 rounded-lg p-3 shadow-2xl border border-cyan-500/50 opacity-95">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <div className="w-4 h-4 rounded border-2 border-cyan-400 flex items-center justify-center">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-white">
                          {tasks.find(t => t.id === activeId)?.text}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )
      })}
    </div>
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
      className={`flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-move group border ${
        getPriorityColor(task.priority || 1)
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} className="text-gray-500 hover:text-gray-400 transition-colors" />
      </div>

      {/* Checkbox */}
      <div className="mt-0.5">
        <div
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
            task.done
              ? 'bg-red-500 border-red-500'
              : 'border-gray-600 group-hover:border-red-400'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(task.id)
          }}
        >
          {task.done && <div className="w-2 h-2 bg-white rounded-full" />}
        </div>
      </div>

      {/* Task content */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${getPriorityColorText(task.priority || 1)}`}>
              {getPriorityLabel(task.priority || 1)}
            </span>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <span
          className={`text-sm ${task.done ? 'line-through opacity-60' : ''}`}
          style={{
            color: task.done ? 'var(--text-muted)' : 'var(--text-secondary)'
          }}
        >
          {task.text}
        </span>
      </div>
    </div>
  )
}