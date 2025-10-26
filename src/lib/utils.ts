import { clsx, type ClassValue } from "clsx"
import { addMinutes, differenceInMinutes, isBefore } from "date-fns"
import { fromZonedTime, toZonedTime } from "date-fns-tz"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const LAB_TIMEZONE = "America/Bogota"
export const LAB_OPEN_HOUR = 7
export const LAB_CLOSE_HOUR = 20

export function toUtcFromLocalTime(
  isoString: string,
  timezone: string = LAB_TIMEZONE
) {
  return fromZonedTime(isoString, timezone)
}

export function isWithinLabHours(
  start: Date,
  end: Date,
  timezone: string = LAB_TIMEZONE
) {
  if (!isBefore(start, end)) {
    return false
  }

  const zonedStart = toZonedTime(start, timezone)
  const zonedEnd = toZonedTime(end, timezone)

  const startHour =
    zonedStart.getHours() + zonedStart.getMinutes() / 60
  const endHour = zonedEnd.getHours() + zonedEnd.getMinutes() / 60

  return (
    startHour >= LAB_OPEN_HOUR &&
    endHour <= LAB_CLOSE_HOUR &&
    zonedStart.toDateString() === zonedEnd.toDateString()
  )
}

export function isValidDuration(
  start: Date,
  end: Date,
  options: { minMins?: number; maxMins?: number } = {}
) {
  const minMinutes = options.minMins ?? 30
  const maxMinutes = options.maxMins ?? 240

  const diff = differenceInMinutes(end, start)

  return diff >= minMinutes && diff <= maxMinutes
}

export function clampReservationEnd(start: Date) {
  return addMinutes(start, 60)
}
