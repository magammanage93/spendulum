import Dexie, { type EntityTable } from 'dexie'
import type { AppSettings, BackupPayload, Category, Expense } from './types'

const DEFAULT_CURRENCY = 'LKR'
export const OTHER_CATEGORY_ID = 'other'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: '🍜', slot: 0, isOther: false },
  { id: 'transport', name: 'Transport', icon: '🚌', slot: 1, isOther: false },
  { id: 'groceries', name: 'Groceries', icon: '🛒', slot: 2, isOther: false },
  { id: 'bills', name: 'Bills', icon: '💡', slot: 3, isOther: false },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', slot: 4, isOther: false },
  { id: 'health', name: 'Health', icon: '💊', slot: 5, isOther: false },
  { id: 'fun', name: 'Fun', icon: '🎉', slot: 6, isOther: false },
  { id: OTHER_CATEGORY_ID, name: 'Other', icon: '➕', slot: 7, isOther: true },
]

class SpendulumDb extends Dexie {
  expenses!: EntityTable<Expense, 'id'>
  categories!: EntityTable<Category, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('spendulum')
    this.version(1).stores({
      expenses: '++id, date, createdAt, categoryId, subCategory',
      categories: 'id, slot, isOther',
      settings: 'id',
    })
    this.on('populate', () => {
      void this.categories.bulkPut(DEFAULT_CATEGORIES)
      void this.settings.put({ id: 'main', currency: DEFAULT_CURRENCY })
    })
  }
}

export const db = new SpendulumDb()

const toIsoDay = (date: Date): string => date.toISOString().slice(0, 10)

export const getTodayIsoDay = (): string => toIsoDay(new Date())

export async function initDb(): Promise<void> {
  await db.open()
  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkPut(DEFAULT_CATEGORIES)
  }
  const settings = await db.settings.get('main')
  if (!settings) {
    await db.settings.put({ id: 'main', currency: DEFAULT_CURRENCY })
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    return false
  }
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export function formatMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export async function getCategories(): Promise<Category[]> {
  return db.categories.orderBy('slot').toArray()
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await db.categories.bulkPut(categories)
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get('main')
  if (settings) {
    return settings
  }
  return { id: 'main', currency: DEFAULT_CURRENCY }
}

export async function setCurrency(currency: string): Promise<void> {
  await db.settings.put({ ...(await getSettings()), currency })
}

export async function setLastBackupAt(timestamp = Date.now()): Promise<void> {
  await db.settings.put({ ...(await getSettings()), lastBackupAt: timestamp })
}

export async function addExpense(input: {
  amount: number
  categoryId: string
  date?: string
  subCategory?: string
  note?: string
}): Promise<number> {
  const expense: Expense = {
    amount: input.amount,
    categoryId: input.categoryId,
    subCategory: input.subCategory?.trim() || undefined,
    note: input.note?.trim() || undefined,
    createdAt: Date.now(),
    date: input.date ?? getTodayIsoDay(),
  }
  const id = await db.expenses.add(expense)
  return Number(id)
}

export async function getExpensesForMonth(monthKey: string): Promise<Expense[]> {
  const expenses = await db.expenses.where('date').startsWith(monthKey).toArray()
  return expenses.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getAllExpenses(): Promise<Expense[]> {
  const expenses = await db.expenses.toArray()
  return expenses.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getAvailableMonths(): Promise<string[]> {
  const expenses = await db.expenses.orderBy('date').reverse().toArray()
  const months = new Set<string>()
  for (const expense of expenses) {
    months.add(expense.date.slice(0, 7))
  }
  const currentMonth = formatMonthKey(new Date())
  months.add(currentMonth)
  return [...months]
}

export async function updateExpense(
  id: number,
  patch: Partial<Omit<Expense, 'id'>>,
): Promise<void> {
  await db.expenses.update(id, patch)
}

export async function deleteExpense(id: number): Promise<void> {
  await db.expenses.delete(id)
}

export async function listOtherSubCategories(monthKey?: string): Promise<string[]> {
  const entries = await db.expenses.where('categoryId').equals(OTHER_CATEGORY_ID).toArray()
  const values = new Set<string>()
  for (const expense of entries) {
    if (!expense.subCategory) {
      continue
    }
    if (monthKey && !expense.date.startsWith(monthKey)) {
      continue
    }
    values.add(expense.subCategory)
  }
  return [...values].sort((a, b) => a.localeCompare(b))
}

export async function moveOtherSubCategoryExpenses(
  subCategory: string,
  targetCategoryId: string,
  monthKey: string,
): Promise<void> {
  await db.expenses
    .where('categoryId')
    .equals(OTHER_CATEGORY_ID)
    .filter(
      (expense) =>
        expense.subCategory === subCategory && expense.date.startsWith(monthKey),
    )
    .modify({ categoryId: targetCategoryId, subCategory: undefined })
}

export async function exportBackupPayload(): Promise<BackupPayload> {
  const [categories, expenses, settings] = await Promise.all([
    getCategories(),
    getAllExpenses(),
    getSettings(),
  ])
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    categories,
    expenses,
    settings,
  }
}

const csvEscape = (value: string): string => {
  const sanitized = value.replace(/"/g, '""')
  return `"${sanitized}"`
}

export function toCsv(expenses: Expense[], categories: Category[]): string {
  const categoryMap = new Map(categories.map((category) => [category.id, category]))
  const header = [
    'id',
    'amount',
    'category',
    'sub_category',
    'note',
    'date',
    'created_at',
  ]
  const lines = [header.join(',')]

  for (const expense of expenses) {
    const category = categoryMap.get(expense.categoryId)
    lines.push(
      [
        String(expense.id ?? ''),
        String(expense.amount),
        csvEscape(category?.name ?? expense.categoryId),
        csvEscape(expense.subCategory ?? ''),
        csvEscape(expense.note ?? ''),
        csvEscape(expense.date),
        String(expense.createdAt),
      ].join(','),
    )
  }

  return lines.join('\n')
}

export async function importBackupPayload(payload: BackupPayload): Promise<void> {
  const categories = payload.categories?.length
    ? payload.categories
    : DEFAULT_CATEGORIES
  const expenses = payload.expenses ?? []
  const settings = payload.settings ?? { id: 'main', currency: DEFAULT_CURRENCY }

  const normalizedCategories = categories.some((category) => category.isOther)
    ? categories
    : [...categories, DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]]

  await db.transaction('rw', db.categories, db.expenses, db.settings, async () => {
    await db.categories.clear()
    await db.expenses.clear()
    await db.settings.clear()
    await db.categories.bulkPut(normalizedCategories)
    await db.expenses.bulkAdd(
      expenses.map((expense) => ({
        ...expense,
        id: undefined,
        createdAt: expense.createdAt ?? Date.now(),
        date: expense.date ?? getTodayIsoDay(),
      })),
    )
    await db.settings.put({
      id: 'main',
      currency: settings.currency || DEFAULT_CURRENCY,
      lastBackupAt: settings.lastBackupAt,
    })
  })
}
