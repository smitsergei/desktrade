import { User } from 'next-auth'

export interface UserWithSettings extends User {
  settings?: {
    deposit: number
    riskPercentage: number
    maxPositionSize: number
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
  profitLoss?: number
  positionSize?: number
  confidenceLevel: number
  notes?: string
  createdAt: Date
  resolvedAt?: Date
}

export interface WeekendTask {
  id: string
  text: string
  done: boolean
  createdAt: Date
}

export interface WeekDay {
  date: Date
  preMarket: Ticker[]
  afterMarket: Ticker[]
}

export interface BalanceHistory {
  id: string
  balanceBefore?: number
  balanceAfter?: number
  changeAmount?: number
  changePercentage?: number
  createdAt: Date
  tickerId?: string
}