"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Calendar } from "@/components/ui/calendar"
import { ChevronUp, ChevronDown, Clock } from "lucide-react"
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
  // Convert to 12-hour format for display
  const get12HourFormat = (hour24: number) => {
    if (hour24 === 0) return 12
    if (hour24 > 12) return hour24 - 12
    return hour24
  }

  const getAmPm = (hour24: number) => {
    return hour24 >= 12 ? 'PM' : 'AM'
  }

  const [tempHour, setTempHour] = useState<number>(
    get12HourFormat(date?.getHours() || new Date().getHours())
  )
  const [tempMinute, setTempMinute] = useState<number>(date?.getMinutes() || 0)
  const [tempAmPm, setTempAmPm] = useState<'AM' | 'PM'>(
    getAmPm(date?.getHours() || new Date().getHours())
  )
  const [isOpen, setIsOpen] = useState(false)

  const handleSave = () => {
    // Convert to 24-hour format
    let hour24 = tempHour
    if (tempAmPm === 'PM' && tempHour !== 12) {
      hour24 = tempHour + 12
    } else if (tempAmPm === 'AM' && tempHour === 12) {
      hour24 = 0
    }

    const newDate = new Date(tempDate)
    newDate.setHours(hour24, tempMinute, 0, 0)
    
    setDate(newDate)
    setIsOpen(false)
  }

  const handleCancel = () => {
    // Reset to original values
    const originalDate = date || new Date()
    setTempDate(originalDate)
    setTempHour(get12HourFormat(originalDate.getHours()))
    setTempMinute(originalDate.getMinutes())
    setTempAmPm(getAmPm(originalDate.getHours()))
    setIsOpen(false)
  }

  const incrementHour = () => {
    setTempHour(prev => prev === 12 ? 1 : prev + 1)
  }

  const decrementHour = () => {
    setTempHour(prev => prev === 1 ? 12 : prev - 1)
  }

  const incrementMinute = () => {
    setTempMinute(prev => prev === 59 ? 0 : prev + 1)
  }

  const decrementMinute = () => {
    setTempMinute(prev => prev === 0 ? 59 : prev - 1)
  }

  const formatDisplayValue = () => {
    if (!date) return placeholder
    
    return format(date, "MMM dd, yyyy 'at' h:mm a")
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
            <div
              className="w-full px-2"
              style={{ ["--rdp-day" as any]: "min(12vw, 2.75rem)" }}
            >
              <Calendar
                mode="single"
                selected={tempDate}
                onSelect={(selectedDate) => selectedDate && setTempDate(selectedDate)}
                className="w-full rounded-md border"
              />
            </div>
          </div>

          {/* Time Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Select Time</h3>
            <div className="flex items-center justify-center space-x-8">
              {/* Hour */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 mb-2"
                  onClick={incrementHour}
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <div className="text-2xl font-bold min-w-[60px] text-center">
                  {tempHour.toString().padStart(2, '0')}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 mt-2"
                  onClick={decrementHour}
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>

              <div className="text-2xl font-bold">:</div>

              {/* Minute */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 mb-2"
                  onClick={incrementMinute}
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <div className="text-2xl font-bold min-w-[60px] text-center">
                  {tempMinute.toString().padStart(2, '0')}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 mt-2"
                  onClick={decrementMinute}
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>

              {/* AM/PM */}
              <div className="flex flex-col space-y-2">
                <Button
                  variant={tempAmPm === 'AM' ? 'default' : 'outline'}
                  size="sm"
                  className="w-14 h-10"
                  onClick={() => setTempAmPm('AM')}
                >
                  AM
                </Button>
                <Button
                  variant={tempAmPm === 'PM' ? 'default' : 'outline'}
                  size="sm"
                  className="w-14 h-10"
                  onClick={() => setTempAmPm('PM')}
                >
                  PM
                </Button>
              </div>
            </div>
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
