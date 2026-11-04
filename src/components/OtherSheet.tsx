import { useEffect, useMemo, useRef, useState } from 'preact/hooks'

type OtherSheetProps = {
  open: boolean
  suggestions: string[]
  onSave: (subCategory: string) => void
  onCancel: () => void
}

export function OtherSheet({
  open,
  suggestions,
  onSave,
  onCancel,
}: OtherSheetProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const uniqueSuggestions = useMemo(
    () => [...new Set(suggestions)].slice(0, 10),
    [suggestions],
  )

  const submit = (next?: string): void => {
    const finalValue = (next ?? value).trim()
    if (!finalValue) {
      return
    }
    onSave(finalValue)
    setValue('')
  }

  return (
    <div class={`other-sheet ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div class="sheet-panel">
        <div class="sheet-header">
          <h3>other sub-category</h3>
          <button type="button" onClick={onCancel}>
            cancel
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="type or tap a chip"
          value={value}
          onInput={(event) =>
            setValue((event.target as HTMLInputElement).value)
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
        />
        <div class="chips">
          {uniqueSuggestions.map((item) => (
            <button type="button" key={item} onClick={() => submit(item)}>
              {item}
            </button>
          ))}
        </div>
        <button type="button" class="primary" onClick={() => submit()}>
          save
        </button>
      </div>
    </div>
  )
}
