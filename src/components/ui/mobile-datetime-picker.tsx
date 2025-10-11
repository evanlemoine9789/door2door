"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Calendar } from "@/components/ui/calendar"
import { Clock } from "lucide-react"
import { format } from "date-fns"

interface MobileDateTimePickerProps {
  date?: Date
  setDate: (date: Date | undefined) => void
  label?: string
  placeholder?: string
}

export function MobileDateTimePicker({ 
  date, 
  setDate, 
  label = "Select date and time",
  placeholder = "Select date and time..."
}: MobileDateTimePickerProps) {
  const [tempDate, setTempDate] = useState<Date>(date || new Date())
  const [timeValue, setTimeValue] = useState<string>("")

  const [isOpen, setIsOpen] = useState(false)

  const handleSave = () => {
    setDate(tempDate)
    setIsOpen(false)
  }

  const handleCancel = () => {
    // Reset to original values
    const originalDate = date || new Date()
    setTempDate(originalDate)
    setIsOpen(false)
  }


  const formatDisplayValue = () => {
    if (!date) return placeholder
    
    return format(date, "MMM dd, yyyy")
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-11 justify-start text-left font-normal"
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatDisplayValue()}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-center">
          <DrawerTitle>{label}</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-2 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Date Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Select Date</h3>
            <div className="w-full px-2">
              <Calendar
                mode="single"
                selected={tempDate}
                onSelect={(selectedDate) => selectedDate && setTempDate(selectedDate)}
                className="w-full rounded-md border"
                classNames={{
                  day: "h-11 w-11 min-h-[44px] min-w-[44px] p-0 font-normal aria-selected:opacity-100 touch-manipulation",
                  cell: "h-11 w-11 min-h-[44px] min-w-[44px] text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  head_cell: "text-muted-foreground rounded-md w-11 min-w-[44px] font-normal text-[0.8rem]",
                  row: "flex w-full mt-2"
                }}
              />
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-2 px-4 mb-4">
            <label className="text-sm font-medium text-card-foreground">Meeting Time</label>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="flex h-12 w-full rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="--:--"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 p-4 border-t">
          <Button
            variant="outline"
            className="flex-1 h-11"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-11"
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
