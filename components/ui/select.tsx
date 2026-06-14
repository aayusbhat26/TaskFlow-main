"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, ChevronDown } from "lucide-react"

interface SelectContextType {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  placeholder?: string
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

interface SelectProps {
  children: React.ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

const Select = ({ children, value: controlledValue, defaultValue, onValueChange, disabled }: SelectProps) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "")
  const [open, setOpen] = React.useState(false)

  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue

  const handleValueChange = React.useCallback((newValue: string) => {
    if (disabled) return

    setUncontrolledValue(newValue)
    if (onValueChange) {
      onValueChange(newValue)
    }
    setOpen(false)
  }, [onValueChange, disabled])

  const contextValue = React.useMemo(() => ({
    value,
    onValueChange: handleValueChange,
    open,
    setOpen,
  }), [value, handleValueChange, open])

  React.useEffect(() => {
    if (disabled && open) {
      setOpen(false)
    }
  }, [disabled, open])

  return (
    <SelectContext.Provider value={contextValue}>
      {children}
    </SelectContext.Provider>
  )
}

const useSelect = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('useSelect must be used within a Select')
  }
  return context
}

interface SelectTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  placeholder?: string
  disabled?: boolean
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, placeholder, disabled, onClick, onKeyDown, ...props }, ref) => {
    const { open, setOpen } = useSelect()

    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      setOpen(!open)
      onClick?.(e)
    }, [open, setOpen, disabled, onClick])

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(!open)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setOpen(true)
      }
      onKeyDown?.(e)
    }, [open, setOpen, disabled, onKeyDown])

    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

interface SelectValueProps {
  placeholder?: string
  className?: string
  children?: React.ReactNode
}

const SelectValue = ({ placeholder, className, children }: SelectValueProps) => {
  const { value } = useSelect()

  return (
    <span className={cn("line-clamp-1", className)}>
      {children || value || placeholder}
    </span>
  )
}
SelectValue.displayName = "SelectValue"

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: "popper" | "item-aligned"
  sideOffset?: number
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, position = "popper", ...props }, ref) => {
    const { open, setOpen } = useSelect()
    const contentRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          setOpen(false)
        }
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false)
        }
      }

      if (open) {
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
          document.removeEventListener('keydown', handleEscape)
        }
      }
    }, [open, setOpen])

    if (!open) return null

    return (
      <div
        ref={contentRef}
        role="listbox"
        className={cn(
          "absolute z-50 max-h-96 min-w-[8rem] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          position === "popper" && "mt-1",
          className
        )}
        {...props}
      >
        <div className="p-1">
          {children}
        </div>
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
  textValue?: string
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled, onClick, onKeyDown, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useSelect()
    const isSelected = selectedValue === value

    const handleClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return
      onValueChange(value)
      onClick?.(e)
    }, [value, onValueChange, disabled, onClick])

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onValueChange(value)
      }
      onKeyDown?.(e)
    }, [value, onValueChange, disabled, onKeyDown])

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          {isSelected && <Check className="h-4 w-4" />}
        </span>
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props}
    />
  )
)
SelectLabel.displayName = "SelectLabel"

const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  )
)
SelectSeparator.displayName = "SelectSeparator"

// For compatibility
const SelectGroup = ({ children }: { children: React.ReactNode }) => children
const SelectScrollUpButton = () => null
const SelectScrollDownButton = () => null

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
