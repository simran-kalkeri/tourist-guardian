import React, { createContext, useContext, useState } from 'react'

// Simple className utility
const cn = (...inputs) => inputs.filter(Boolean).join(' ')

const SelectContext = createContext()

const Select = ({ children, value, onValueChange, ...props }) => {
  const [internalValue, setInternalValue] = useState(value || '')
  const [isOpen, setIsOpen] = useState(false)
  
  const handleValueChange = (newValue) => {
    setInternalValue(newValue)
    if (onValueChange) {
      onValueChange(newValue)
    }
    setIsOpen(false)
  }

  return (
    <SelectContext.Provider value={{
      value: value !== undefined ? value : internalValue,
      onValueChange: handleValueChange,
      isOpen,
      setIsOpen
    }}>
      <div className="relative" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = useContext(SelectContext)
  
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => context?.setIsOpen(!context?.isOpen)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="h-4 w-4 opacity-50" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef(({ className, placeholder, ...props }, ref) => {
  const context = useContext(SelectContext)
  
  return (
    <span
      ref={ref}
      className={cn("block truncate", className)}
      {...props}
    >
      {context?.value || placeholder}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = useContext(SelectContext)
  
  if (!context?.isOpen) return null
  
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        "top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const context = useContext(SelectContext)
  
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "hover:bg-gray-100 cursor-pointer px-3 py-2",
        className
      )}
      onClick={() => context?.onValueChange(value)}
      {...props}
    >
      {context?.value === value && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <CheckIcon className="h-4 w-4" />
        </span>
      )}
      {children}
    </div>
  )
})
SelectItem.displayName = "SelectItem"

// Simple icons as fallbacks
const ChevronDownIcon = ({ className }) => (
  <svg 
    className={className}
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const CheckIcon = ({ className }) => (
  <svg 
    className={className}
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }