import { useEffect, useMemo, useState } from 'preact/hooks'
import {
  deleteExpense,
  formatMonthKey,
  getAvailableMonths,
  getExpensesForMonth,
  updateExpense,
} from '../db'
import type { Category, Expense } from '../types'

type HistoryScreenProps = {
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

const formatDateHeading = (isoDay: string): string =>
  new Date(`${isoDay}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

export function HistoryScreen({
  categories,
  currency,
  refreshToken,
  onDataChanged,
}: HistoryScreenProps) {
  const [month, setMonth] = useState(formatMonthKey(new Date()))
  const [months, setMonths] = useState<string[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [editing, setEditing] = useState<Expense | null>(null)

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  useEffect(() => {
    const load = async (): Promise<void> => {
      const [availableMonths, monthExpenses] = await Promise.all([
        getAvailableMonths(),
        getExpensesForMonth(month),
      ])
      setMonths(availableMonths)
      setExpenses(monthExpenses)
    }
    void load()
  }, [month, refreshToken])

  const grouped = useMemo(() => {
    const buckets = new Map<string, Expense[]>()
    for (const expense of expenses) {
      const row = buckets.get(expense.date) ?? []
      row.push(expense)
      buckets.set(expense.date, row)
    }
    return [...buckets.entries()].sort(([left], [right]) =>
      left > right ? -1 : 1,
    )
  }, [expenses])

  const saveEdit = async (): Promise<void> => {
    if (!editing?.id) {
      return
    }
    await updateExpense(editing.id, {
      amount: editing.amount,
      categoryId: editing.categoryId,
      subCategory: editing.subCategory?.trim() || undefined,
      note: editing.note?.trim() || undefined,
      date: editing.date,
    })
    setEditing(null)
    onDataChanged()
  }

  const deleteSelected = async (): Promise<void> => {
    if (!editing?.id) {
      return
    }
    await deleteExpense(editing.id)
    setEditing(null)
    onDataChanged()
  }

  return (
    <section class="screen">
      <div class="toolbar">
        <label>
          month
          <select value={month} onInput={(event) => setMonth((event.target as HTMLSelectElement).value)}>
            {months.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div class="history-list">
        {grouped.length === 0 && <p class="empty">no expenses for this month</p>}
        {grouped.map(([day, rows]) => {
          const dayTotal = rows.reduce((sum, item) => sum + item.amount, 0)
          return (
            <section class="day-group" key={day}>
              <header>
                <h3>{formatDateHeading(day)}</h3>
                <span>{formatMoney(dayTotal, currency)}</span>
              </header>
              <ul>
                {rows.map((item) => {
                  const category = categoryMap.get(item.categoryId)
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => setEditing(item)}>
                        <div>
                          <strong>{formatMoney(item.amount, currency)}</strong>
                          <span>
                            {category?.icon ?? '•'} {category?.name ?? item.categoryId}
                            {item.subCategory ? ` · ${item.subCategory}` : ''}
                          </span>
                        </div>
                        {item.note && <small>{item.note}</small>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      {editing && (
        <div class="modal">
          <div class="modal-content">
            <h3>edit expense</h3>
            <label>
              amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={editing.amount}
                onInput={(event) =>
                  setEditing({
                    ...editing,
                    amount: Number((event.target as HTMLInputElement).value),
                  })
                }
              />
            </label>
            <label>
              category
              <select
                value={editing.categoryId}
                onInput={(event) =>
                  setEditing({
                    ...editing,
                    categoryId: (event.target as HTMLSelectElement).value,
                  })
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              sub-category
              <input
                type="text"
                value={editing.subCategory ?? ''}
                onInput={(event) =>
                  setEditing({
                    ...editing,
                    subCategory: (event.target as HTMLInputElement).value,
                  })
                }
              />
            </label>
            <label>
              note
              <input
                type="text"
                value={editing.note ?? ''}
                onInput={(event) =>
                  setEditing({
                    ...editing,
                    note: (event.target as HTMLInputElement).value,
                  })
                }
              />
            </label>
            <label>
              date
              <input
                type="date"
                value={editing.date}
                onInput={(event) =>
                  setEditing({
                    ...editing,
                    date: (event.target as HTMLInputElement).value,
                  })
                }
              />
            </label>
            <div class="modal-actions">
              <button type="button" class="danger" onClick={() => void deleteSelected()}>
                delete
              </button>
              <button type="button" onClick={() => setEditing(null)}>
                cancel
              </button>
              <button type="button" class="primary" onClick={() => void saveEdit()}>
                save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
