import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Category } from '../types'

type RadialMenuProps = {
  categories: Category[]
  onSelect: (category: Category) => void
  onOpenChange?: (open: boolean) => void
}

const MENU_RADIUS = 124
const DEAD_ZONE = 34

export function RadialMenu({ categories, onSelect, onOpenChange }: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const centerRef = useRef({ x: 0, y: 0 })

  const ordered = useMemo(
    () => [...categories].sort((a, b) => a.slot - b.slot),
    [categories],
  )

  useEffect(() => {
    return () => {
      onOpenChange?.(false)
    }
  }, [onOpenChange])

  const openMenu = (): void => {
    if (ordered.length === 0) {
      return
    }
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
    setIsOpen(true)
    onOpenChange?.(true)
  }

  const closeMenu = (): void => {
    setIsOpen(false)
    setActiveIndex(null)
    onOpenChange?.(false)
  }

  const getIndexFromPoint = (clientX: number, clientY: number): number | null => {
    if (ordered.length === 0) {
      return null
    }
    const dx = clientX - centerRef.current.x
    const dy = clientY - centerRef.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance < DEAD_ZONE) {
      return null
    }
    const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)
    const slice = (Math.PI * 2) / ordered.length
    const rawIndex = Math.floor((angle + slice / 2) / slice)
    return rawIndex % ordered.length
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (ordered.length === 0) {
      return
    }
    event.preventDefault()
    openMenu()
    setActiveIndex(getIndexFromPoint(event.clientX, event.clientY))

    const handleMove = (moveEvent: PointerEvent): void => {
      moveEvent.preventDefault()
      setActiveIndex(getIndexFromPoint(moveEvent.clientX, moveEvent.clientY))
    }

    const handleUp = (upEvent: PointerEvent): void => {
      upEvent.preventDefault()
      const pickedIndex = getIndexFromPoint(upEvent.clientX, upEvent.clientY)
      if (pickedIndex !== null) {
        onSelect(ordered[pickedIndex])
      }
      closeMenu()
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }

    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp, { passive: false, once: true })
    window.addEventListener('pointercancel', handleUp, { passive: false, once: true })
  }

  const slices = ordered.map((category, index) => {
    const angle = (index / ordered.length) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(angle) * MENU_RADIUS
    const y = Math.sin(angle) * MENU_RADIUS
    const isActive = activeIndex === index
    return (
      <button
        key={category.id}
        type="button"
        class={`slice ${isActive ? 'active' : ''}`}
        style={{
          transform: `translate(${x}px, ${y}px) ${isActive ? 'scale(1.12)' : ''}`,
        }}
        tabIndex={-1}
      >
        <span class="icon">{category.icon}</span>
        <span class="name">{category.name}</span>
      </button>
    )
  })

  return (
    <div class="radial-menu" aria-live="polite">
      {isOpen && <div class="overlay-blocker" />}
      <div class={`slice-ring ${isOpen ? 'visible' : ''}`}>{slices}</div>
      <button
        ref={buttonRef}
        type="button"
        class="core-button"
        onPointerDown={(event) => onPointerDown(event)}
      >
        hold + slide
      </button>
    </div>
  )
}
