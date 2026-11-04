import { useEffect, useMemo, useState } from 'preact/hooks'
import {
  exportBackupPayload,
  formatMonthKey,
  getExpensesForMonth,
  getSettings,
  importBackupPayload,
  moveOtherSubCategoryExpenses,
  OTHER_CATEGORY_ID,
  saveCategories,
  setCurrency,
  setLastBackupAt,
  toCsv,
} from '../db'
import type { Category, Expense } from '../types'

type SummaryScreenProps = {
  categories: Category[]
  currency: string
  refreshToken: number
  onDataChanged: () => void
}

const formatMoney = (amount: number, currency: string): string =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)

const toPreviousMonth = (month: string): string => {
  const [year, mon] = month.split('-').map(Number)
  const date = new Date(year, mon - 2, 1)
  return formatMonthKey(date)
}

const toNextMonth = (month: string): string => {
  const [year, mon] = month.split('-').map(Number)
  const date = new Date(year, mon, 1)
  return formatMonthKey(date)
}

const downloadTextFile = (filename: string, contents: string): void => {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function SummaryScreen({
  categories,
  currency,
  refreshToken,
  onDataChanged,
}: SummaryScreenProps) {
  const [month, setMonth] = useState(formatMonthKey(new Date()))
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [draftCategories, setDraftCategories] = useState<Category[]>(categories)
  const [currencyDraft, setCurrencyDraft] = useState(currency)
  const [lastBackupAt, setLastBackupTime] = useState<number | undefined>()
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({})

  useEffect(() => {
    setDraftCategories(categories)
  }, [categories])

  useEffect(() => {
    setCurrencyDraft(currency)
  }, [currency])

  useEffect(() => {
    const load = async (): Promise<void> => {
      const [rows, settings] = await Promise.all([
        getExpensesForMonth(month),
        getSettings(),
      ])
      setExpenses(rows)
      setLastBackupTime(settings.lastBackupAt)
    }
    void load()
  }, [month, refreshToken])

  const totalsByCategory = useMemo(() => {
    const totals = new Map<string, number>()
    for (const category of categories) {
      totals.set(category.id, 0)
    }
    for (const expense of expenses) {
      totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amount)
    }
    return totals
  }, [categories, expenses])

  const monthTotal = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses],
  )

  const otherSubCategoryTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const expense of expenses) {
      if (expense.categoryId !== OTHER_CATEGORY_ID || !expense.subCategory) {
        continue
      }
      totals.set(expense.subCategory, (totals.get(expense.subCategory) ?? 0) + expense.amount)
    }
    return [...totals.entries()].sort((left, right) => right[1] - left[1])
  }, [expenses])

  const maxCategoryTotal = useMemo(
    () => Math.max(...[...totalsByCategory.values(), 1]),
    [totalsByCategory],
  )

  const nonOtherCategories = categories.filter((category) => !category.isOther)

  const backupReminder = useMemo(() => {
    if (!lastBackupAt) {
      return 'last backup: never'
    }
    const days = Math.floor((Date.now() - lastBackupAt) / (1000 * 60 * 60 * 24))
    return `last backup: ${days} day${days === 1 ? '' : 's'} ago`
  }, [lastBackupAt])

  const exportJson = async (): Promise<void> => {
    const payload = await exportBackupPayload()
    downloadTextFile(
      `spendulum-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
    )
    await setLastBackupAt()
    onDataChanged()
  }

  const exportCsv = async (): Promise<void> => {
    const content = toCsv(expenses, categories)
    downloadTextFile(`spendulum-${month}.csv`, content)
    await setLastBackupAt()
    onDataChanged()
  }

  const onImportFile = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) {
      return
    }
    const content = await file.text()
    const payload = JSON.parse(content)
    await importBackupPayload(payload)
    input.value = ''
    onDataChanged()
  }

  const saveCategorySettings = async (): Promise<void> => {
    const normalized = draftCategories.map((category) =>
      category.isOther
        ? category
        : {
            ...category,
            name: category.name.trim() || 'Unnamed',
            icon: category.icon.trim() || '🏷️',
          },
    )
    await saveCategories(normalized)
    onDataChanged()
  }

  const saveCurrency = async (): Promise<void> => {
    const next = currencyDraft.trim().toUpperCase()
    if (!next) {
      return
    }
    await setCurrency(next)
    onDataChanged()
  }

  const moveOtherSubCategory = async (subCategory: string): Promise<void> => {
    const target = moveTargets[subCategory]
    if (!target) {
      return
    }
    await moveOtherSubCategoryExpenses(subCategory, target, month)
    onDataChanged()
  }

  return (
    <section class="screen">
      <div class="toolbar">
        <button type="button" onClick={() => setMonth((value) => toPreviousMonth(value))}>
          ←
        </button>
        <strong>{month}</strong>
        <button type="button" onClick={() => setMonth((value) => toNextMonth(value))}>
          →
        </button>
      </div>

      <p class="backup-reminder">{backupReminder}. export now.</p>
      <h3 class="month-total">{formatMoney(monthTotal, currency)}</h3>

      <div class="bars">
        {categories.map((category) => {
          const total = totalsByCategory.get(category.id) ?? 0
          const width = `${(total / maxCategoryTotal) * 100}%`
          return (
            <div key={category.id} class="bar-row">
              <label>
                {category.icon} {category.name}
              </label>
              <div class="bar-track">
                <div class="bar-fill" style={{ width }} />
              </div>
              <span>{formatMoney(total, currency)}</span>
            </div>
          )
        })}
      </div>

      <section class="card">
        <h4>other by sub-category</h4>
        {otherSubCategoryTotals.length === 0 && <p class="empty">no other entries this month</p>}
        {otherSubCategoryTotals.map(([subCategory, total]) => (
          <div key={subCategory} class="subcat-row">
            <div>
              <strong>{subCategory}</strong>
              <span>{formatMoney(total, currency)}</span>
            </div>
            <select
              value={moveTargets[subCategory] ?? ''}
              onInput={(event) =>
                setMoveTargets((previous) => ({
                  ...previous,
                  [subCategory]: (event.target as HTMLSelectElement).value,
                }))
              }
            >
              <option value="">move to...</option>
              {nonOtherCategories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void moveOtherSubCategory(subCategory)}>
              move
            </button>
          </div>
        ))}
      </section>

      <section class="card">
        <h4>settings</h4>
        <label>
          currency
          <input
            value={currencyDraft}
            maxLength={3}
            onInput={(event) =>
              setCurrencyDraft((event.target as HTMLInputElement).value.toUpperCase())
            }
          />
        </label>
        <button type="button" class="primary" onClick={() => void saveCurrency()}>
          save currency
        </button>

        <h5>categories</h5>
        {draftCategories
          .filter((category) => !category.isOther)
          .map((category) => (
            <div class="category-edit-row" key={category.id}>
              <input
                value={category.icon}
                maxLength={2}
                onInput={(event) =>
                  setDraftCategories((previous) =>
                    previous.map((item) =>
                      item.id === category.id
                        ? { ...item, icon: (event.target as HTMLInputElement).value }
                        : item,
                    ),
                  )
                }
              />
              <input
                value={category.name}
                onInput={(event) =>
                  setDraftCategories((previous) =>
                    previous.map((item) =>
                      item.id === category.id
                        ? { ...item, name: (event.target as HTMLInputElement).value }
                        : item,
                    ),
                  )
                }
              />
            </div>
          ))}
        <button type="button" class="primary" onClick={() => void saveCategorySettings()}>
          save categories
        </button>

        <h5>backup</h5>
        <div class="button-row">
          <button type="button" onClick={() => void exportJson()}>
            export json
          </button>
          <button type="button" onClick={() => void exportCsv()}>
            export csv
          </button>
          <label class="file-upload">
            import json
            <input type="file" accept="application/json" onChange={(event) => void onImportFile(event)} />
          </label>
        </div>
      </section>
    </section>
  )
}
