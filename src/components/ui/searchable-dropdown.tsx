"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, ChevronDown, X, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

interface SearchableDropdownProps {
  // Display props
  label: string
  placeholder?: string
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  
  // Search props
  onSearch: (searchTerm: string) => Promise<string[]>
  
  // UI props
  className?: string
  maxHeight?: string
  minSearchLength?: number
}

export function SearchableDropdown({
  label,
  placeholder = "Search...",
  selectedValues,
  onSelectionChange,
  onSearch,
  className = "",
  maxHeight = "h-[200px]",
  minSearchLength = 1
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [options, setOptions] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle search when debounced term changes
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchTerm.length < minSearchLength) {
        setOptions([])
        setHasSearched(false)
        return
      }

      setIsSearching(true)
      try {
        const results = await onSearch(debouncedSearchTerm)
        setOptions(results)
        setHasSearched(true)
      } catch (error) {
        console.error('Search error:', error)
        setOptions([])
      } finally {
        setIsSearching(false)
      }
    }

    performSearch()
  }, [debouncedSearchTerm, onSearch, minSearchLength])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleToggle = (checked: boolean, value: string) => {
    if (checked) {
      onSelectionChange([...selectedValues, value])
    } else {
      onSelectionChange(selectedValues.filter(v => v !== value))
    }
  }

  const handleClearSelection = () => {
    onSelectionChange([])
  }

  const handleClearSearch = () => {
    setSearchTerm("")
    setOptions([])
    setHasSearched(false)
  }

  const showNoResults = hasSearched && !isSearching && options.length === 0 && debouncedSearchTerm.length >= minSearchLength
  const showStartTyping = !hasSearched && !isSearching && debouncedSearchTerm.length < minSearchLength

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`bg-card border-border text-foreground hover:bg-accent ${className}`}
        >
          {label}
          {selectedValues.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {selectedValues.length}
            </Badge>
          )}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] bg-popover border-border" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-foreground">{label}</h4>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={handleClearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Options List */}
            <ScrollArea className={maxHeight}>
              <div className="space-y-2">
                {isSearching && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Searching...</span>
                  </div>
                )}

                {showStartTyping && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Start typing to search {label.toLowerCase()}
                    </p>
                  </div>
                )}

                {showNoResults && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      No {label.toLowerCase()} found for &quot;{debouncedSearchTerm}&quot;
                    </p>
                  </div>
                )}

                {options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${label}-${option}`}
                      checked={selectedValues.includes(option)}
                      onCheckedChange={(checked) => handleToggle(checked as boolean, option)}
                    />
                    <label
                      htmlFor={`${label}-${option}`}
                      className="text-sm text-foreground cursor-pointer flex-1"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Clear Selection */}
          {selectedValues.length > 0 && (
            <div className="pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="w-full text-xs"
              >
                Clear Selection ({selectedValues.length})
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
