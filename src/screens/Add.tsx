import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { addExpense, deleteExpense, getTodayIsoDay, listOtherSubCategories, OTHER_CATEGORY_ID } from '../db'
import { Keypad } from '../components/Keypad'
import { OtherSheet } from '../components/OtherSheet'
import { RadialMenu } from '../components/RadialMenu'
import type { Category } from '../types'

type AddScreenProps = {
  categories: Category[]
  currency: string
  onDataChanged: () => void
}

type UndoState = { id: number; label: string } | null

const formatCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)

const sanitizeAmount = (value: string): string => {
  if (!value) {
    return '0'
  }
  const next = value.replace(/[^\d.]/g, '')
  const parts = next.split('.')
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join('')}`
  }
  return next
}

export function AddScreen({ categories, currency, onDataChanged }: AddScreenProps) {
  const [amountRaw, setAmountRaw] = useState('0')
  const [radialOpen, setRadialOpen] = useState(false)
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherSuggestions, setOtherSuggestions] = useState<string[]>([])
  const [pendingOtherAmount, setPendingOtherAmount] = useState<number | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getTodayIsoDay())
  const [undo, setUndo] = useState<UndoState>(null)
  const otherInputRef = useRef<HTMLInputElement>(null)

  const amount = useMemo(() => Number.parseFloat(amountRaw) || 0, [amountRaw])

  useEffect(() => {
    if (!radialOpen) {
      return
    }
    const preventTouchMove = (event: TouchEvent) => event.preventDefault()
    document.body.classList.add('radial-open')
    window.addEventListener('touchmove', preventTouchMove, { passive: false })
    return () => {
      document.body.classList.remove('radial-open')
      window.removeEventListener('touchmove', preventTouchMove)
    }
  }, [radialOpen])

  useEffect(() => {
    if (!undo) {
      return
    }
    const timeout = window.setTimeout(() => setUndo(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [undo])

  const handleKeypadTap = (key: string): void => {
    if (key === 'clear') {
      setAmountRaw('0')
      return
    }
    if (key === 'backspace') {
      setAmountRaw((previous) => {
        const next = previous.slice(0, -1)
        return sanitizeAmount(next) || '0'
      })
      return
    }
    if (key === '.' && amountRaw.includes('.')) {
      return
    }
    setAmountRaw((previous) => {
      if (previous === '0' && key !== '.') {
        return key
      }
      return sanitizeAmount(`${previous}${key}`)
    })
  }

  const clearAfterSave = (): void => {
    setAmountRaw('0')
    setNote('')
    setDate(getTodayIsoDay())
  }

  const saveExpense = async (
    categoryId: string,
    subCategory?: string,
  ): Promise<void> => {
    if (amount <= 0) {
      return
    }
    const expenseId = await addExpense({
      amount,
      categoryId,
      subCategory,
      note: note.trim() || undefined,
      date,
    })
    setUndo({
      id: expenseId,
      label: `saved ${formatCurrency(amount, currency)}`,
    })
    clearAfterSave()
    onDataChanged()
  }

  const handleCategorySelect = (category: Category): void => {
    if (amount <= 0) {
      return
    }
    if (category.id === OTHER_CATEGORY_ID) {
      // iOS only shows the keyboard when focus() runs synchronously inside the touch handler.
      otherInputRef.current?.focus()
      setPendingOtherAmount(amount)
      setOtherOpen(true)
      void listOtherSubCategories().then(setOtherSuggestions)
      return
    }
    void saveExpense(category.id)
  }

  const saveOther = async (subCategory: string): Promise<void> => {
    if (!pendingOtherAmount || pendingOtherAmount <= 0) {
      setOtherOpen(false)
      return
    }
    const expenseId = await addExpense({
      amount: pendingOtherAmount,
      categoryId: OTHER_CATEGORY_ID,
      subCategory,
      note: note.trim() || undefined,
      date,
    })
    setUndo({
      id: expenseId,
      label: `saved ${formatCurrency(pendingOtherAmount, currency)} as other`,
    })
    setOtherOpen(false)
    setPendingOtherAmount(null)
    clearAfterSave()
    onDataChanged()
  }

  const undoLastSave = async (): Promise<void> => {
    if (!undo) {
      return
    }
    await deleteExpense(undo.id)
    setUndo(null)
    onDataChanged()
  }

  return (
    <section class="screen add-screen">
      <div class="amount-display">
        <span>{formatCurrency(amount || 0, currency)}</span>
      </div>

      <div class="radial-zone">
        <RadialMenu
          categories={categories}
          onOpenChange={setRadialOpen}
          onSelect={handleCategorySelect}
        />
      </div>

      <div class="more-toggle">
        <button type="button" onClick={() => setMoreOpen((value) => !value)}>
          {moreOpen ? 'hide more' : 'more'}
        </button>
      </div>

      {moreOpen && (
        <div class="more-fields">
          <label>
            date
            <input
              type="date"
              value={date}
              onInput={(event) =>
                setDate((event.target as HTMLInputElement).value)
              }
            />
          </label>
          <label>
            note
            <textarea
              rows={2}
              value={note}
              onInput={(event) =>
                setNote((event.target as HTMLTextAreaElement).value)
              }
            />
          </label>
        </div>
      )}

      <Keypad disabled={radialOpen} onTap={handleKeypadTap} />

      <OtherSheet
        inputRef={otherInputRef}
        open={otherOpen}
        suggestions={otherSuggestions}
        onCancel={() => {
          setOtherOpen(false)
          setPendingOtherAmount(null)
        }}
        onSave={(subCategory) => void saveOther(subCategory)}
      />

      {undo && (
        <div class="toast">
          <span>{undo.label}</span>
          <button type="button" onClick={() => void undoLastSave()}>
            undo
          </button>
        </div>
      )}
    </section>
  )
}
