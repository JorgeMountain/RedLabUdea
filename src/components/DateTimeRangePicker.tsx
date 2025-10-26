"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

type DateTimeRangePickerProps = {
  start: string
  end: string
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  min?: string
  max?: string
}

export function DateTimeRangePicker({
  start,
  end,
  onStartChange,
  onEndChange,
  min,
  max,
}: DateTimeRangePickerProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="start-datetime">Inicio</Label>
        <Input
          id="start-datetime"
          type="datetime-local"
          value={start}
          min={min}
          max={max}
          onChange={(event) => onStartChange(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end-datetime">Fin</Label>
        <Input
          id="end-datetime"
          type="datetime-local"
          value={end}
          min={start}
          max={max}
          onChange={(event) => onEndChange(event.target.value)}
          required
        />
      </div>
    </div>
  )
}
