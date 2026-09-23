"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  /** Label of the "no filter" entry, which is always first and always selectable. */
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  /** Value used for the "no filter" entry. */
  allValue?: string
  loading?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Combobox used by the filter dialogs: same look as a Select trigger, but the
 * list is searchable, which matters for long city/venue/event lists.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  allValue = "all",
  loading = false,
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = options.find((option) => option.value === value)?.label

  const select = (nextValue: string) => {
    onValueChange(nextValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : value === allValue || !selectedLabel ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedLabel
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[260px]">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem value={allValue} keywords={[placeholder]} onSelect={() => select(allValue)}>
                <Check className={cn("mr-2 h-4 w-4", value === allValue ? "opacity-100" : "opacity-0")} />
                {placeholder}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // cmdk filters on value + keywords, and option values can be ids.
                  value={option.value}
                  keywords={[option.label]}
                  onSelect={() => select(option.value)}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
