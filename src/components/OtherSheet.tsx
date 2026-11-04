import type { RefObject } from 'preact'
import { useMemo, useState } from 'preact/hooks'

type OtherSheetProps = {
  inputRef: RefObject<HTMLInputElement | null>
  open: boolean
  suggestions: string[]
  onSave: (subCategory: string) => void
  onCancel: () => void
}

export function OtherSheet({
  inputRef,
  open,
  suggestions,
  onSave,
  onCancel,
}: OtherSheetProps) {
  const [value, setValue] = useState('')

  const uniqueSuggestions = useMemo(
    () => [...new Set(suggestions)].slice(0, 10),
    [suggestions],
  )

  const close = (): void => {
    inputRef.current?.blur()
    setValue('')
  }

  const submit = (next?: string): void => {
    const finalValue = (next ?? value).trim()
    if (!finalValue) {
      return
    }
    close()
    onSave(finalValue)
  }

  const cancel = (): void => {
    close()
    onCancel()
  }

  return (
    <div class={`other-sheet ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div class="sheet-panel">
        <div class="sheet-header">
          <h3>other sub-category</h3>
          <button type="button" onClick={cancel}>
            cancel
          </button>
        </div>
        {/* Always mounted so it can be focused synchronously from the radial menu's touch handler. */}
        <input
          ref={inputRef}
          type="text"
          tabIndex={open ? 0 : -1}
          enterKeyHint="done"
          autoCapitalize="words"
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
