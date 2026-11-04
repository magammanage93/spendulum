export type Category = {
  id: string
  name: string
  icon: string
  slot: number
  isOther: boolean
}

export type Expense = {
  id?: number
  amount: number
  categoryId: string
  subCategory?: string
  note?: string
  createdAt: number
  date: string
}

export type AppSettings = {
  id: 'main'
  currency: string
  lastBackupAt?: number
}

export type BackupPayload = {
  schemaVersion: 1
  exportedAt: string
  categories: Category[]
  expenses: Expense[]
  settings: AppSettings
}
