import { User } from 'next-auth'

export interface UserWithSettings extends User {
  settings?: {
    deposit: number
  }
}

export interface Ticker {
  id: string
  ticker: string
  rating: number
  predictionPrice: number
  type: 'pre_market' | 'after_market'
  status: 'pending' | 'won' | 'lost' | 'cancelled'
  actualResult?: number
  confidenceLevel: number
  notes?: string
  createdAt: Date
  resolvedAt?: Date
}

export interface WeekendTask {
  id: string
  text: string
  done: boolean
  priority: number // 1 - низкий, 2 - средний, 3 - высокий
  order: number // Порядок в пределах группы приоритета
  deadline?: Date | null // Опциональный дедлайн
  createdAt: Date
}

export interface WeekDay {
  date: Date
  preMarket: Ticker[]
  afterMarket: Ticker[]
}

