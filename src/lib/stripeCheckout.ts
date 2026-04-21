import { loadStripe } from '@stripe/stripe-js'
import type { IntakeFormState } from './fetchForm'

type CreateCheckoutPayload = {
  selectedTimeIso: string
  timezone: string
  form: IntakeFormState
}

const apiBase = String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''

export const stripePromise = loadStripe(publishableKey)

export type EmbeddedCheckoutSessionResult = {
  clientSecret: string
  sessionId: string
}

export type StripeSessionStatus = {
  sessionId: string
  paymentStatus: string
  status: string
}

export async function createEmbeddedCheckoutSession(
  payload: CreateCheckoutPayload,
): Promise<EmbeddedCheckoutSessionResult> {
  const res = await fetch(`${apiBase}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await res.json().catch(() => ({}))) as {
    clientSecret?: string
    sessionId?: string
    error?: string
  }

  if (!res.ok) {
    throw new Error(
      data.error ||
        `Unable to create Stripe checkout session (${res.status} ${res.statusText}).`,
    )
  }
  if (data.error) {
    throw new Error(data.error)
  }
  if (!data.clientSecret) {
    throw new Error('Stripe client secret missing.')
  }
  if (!data.sessionId) {
    throw new Error('Stripe session id missing from server response.')
  }

  return { clientSecret: data.clientSecret, sessionId: data.sessionId }
}

export async function fetchStripeSessionStatus(
  sessionId: string,
): Promise<StripeSessionStatus> {
  const id = new URLSearchParams({ session_id: sessionId })
  const res = await fetch(`${apiBase}/api/stripe/session-status?${id}`)

  const data = (await res.json().catch(() => ({}))) as StripeSessionStatus & {
    error?: string
  }

  if (!res.ok) {
    throw new Error(data.error || 'Could not verify payment status.')
  }

  return data
}
