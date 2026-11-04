type KeypadProps = {
  disabled?: boolean
  onTap: (key: string) => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace']

export function Keypad({ disabled = false, onTap }: KeypadProps) {
  return (
    <div class={`keypad ${disabled ? 'disabled' : ''}`}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          class={`key ${key === 'backspace' ? 'wide' : ''}`}
          disabled={disabled}
          onClick={() => onTap(key)}
          aria-label={key === 'backspace' ? 'Backspace' : key}
        >
          {key === 'backspace' ? '⌫' : key}
        </button>
      ))}
      <button
        type="button"
        class="key clear"
        disabled={disabled}
        onClick={() => onTap('clear')}
      >
        clear
      </button>
    </div>
  )
}
