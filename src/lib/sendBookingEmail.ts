import type { IntakeFormState } from './fetchForm'

type BookingEmailPayload = {
  selectedTimeIso: string
  timezone: string
  form: IntakeFormState
}

const apiBase = String(import.meta.env.VITE_API_URL_DEV).replace(/\/$/, '')

async function postBookingEndpoint(
  path: string,
  payload: BookingEmailPayload,
  fallbackMessage: string,
): Promise<void> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await res.json().catch(() => ({}))) as { error?: string }

  if (!res.ok) {
    throw new Error(data.error || fallbackMessage)
  }
}

export async function sendBookingSummaryEmail(payload: BookingEmailPayload): Promise<void> {
  await Promise.all([
    postBookingEndpoint('/api/email/booking-summary', payload, 'Could not send email.'),
    postBookingEndpoint('/api/calendar/create-event', payload, 'Could not create calendar event.'),
  ])
}
