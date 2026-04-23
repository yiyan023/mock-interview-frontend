import { supabase } from './supabase'

const TIMES_TABLE = 'times-table'

type TimeRow = Record<string, unknown>

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function toPostgresDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toPostgresTimeKey(d: Date): string {
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const seconds = String(d.getUTCSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function rowDateTimeToInstant(dateStr: string, timeVal: unknown): Date | null {
  if (!isString(timeVal)) return null
  const time = timeVal.trim()

  // Whole instant already encoded in `time`
  if (/^\d{4}-\d{2}-\d{2}T/.test(time)) {
    const d = new Date(time)
    return Number.isNaN(d.getTime()) ? null : d
  }

  let combined = `${dateStr}T${time}`
  // Normalise short numeric offsets (+00 → +00:00) for broader JS parsing
  if (/[+-]\d{2}$/.test(combined) && !/[+-]\d{2}:\d{2}$/.test(combined)) {
    combined = combined.replace(/([+-]\d{2})$/, '$1:00')
  }
  // No zone: treat as UTC (prefer storing timetz in Supabase)
  if (!/[zZ]$/.test(combined) && !/[+-]\d{2}:\d{2}$/.test(combined)) {
    combined += 'Z'
  }

  const d = new Date(combined)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function fetchAvailableTimesForDate(selectedDate: Date): Promise<Date[]> {
  const dateKey = toPostgresDateKey(createDateOnly(selectedDate))

  const { data, error } = await supabase
    .from(TIMES_TABLE)
    .select('id, date, time')
    .eq('date', dateKey)
    .eq('is_booked', false)

  if (error) throw error

  const rows = (data ?? []) as TimeRow[]
  const instants: Date[] = []

  for (const row of rows) {
    if (!isString(row.date)) continue
    const instant = rowDateTimeToInstant(row.date, row.time)
    if (instant) instants.push(instant)
  }

  instants.sort((a, b) => a.getTime() - b.getTime())
  return instants
}

export async function bookTimeSlot(selectedTime: Date): Promise<void> {
  const dateKey = toPostgresDateKey(createDateOnly(selectedTime))
  const timeKey = toPostgresTimeKey(selectedTime)

  console.log('dateKey', dateKey)
  console.log('timeKey', timeKey)

  const { data: slotsRemaining, error } = await supabase.rpc('book_timeslot', {
    target_date: dateKey,
    target_time: timeKey,
  })

  if (error) {
    throw new Error(`Booking failed: ${error.message}`)
  }

  if (slotsRemaining === null) {
    throw new Error('This timeslot is no longer available.')
  }

  console.log(`Booking confirmed. Slots remaining on ${dateKey}:`, slotsRemaining)
}

function createDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function formatInstantInTimeZone(
  instant: Date,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(instant)
}
