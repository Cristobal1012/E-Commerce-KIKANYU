import { BigNumber, MedusaError, PaymentActions } from "@medusajs/framework/utils"
import type { WebhookActionResult } from "@medusajs/framework/types"

import type {
  MercadoPagoDecision,
  MercadoPagoOrder,
  MercadoPagoSessionData,
} from "./types"

export function toMercadoPagoAmount(amount: unknown) {
  const value =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
        ? Number(amount)
        : Number((amount as { valueOf?: () => unknown })?.valueOf?.())

  if (!Number.isFinite(value) || value < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid payment amount"
    )
  }

  return Math.round(value).toString()
}

export function normalizeCurrency(currency: string | null | undefined) {
  return (currency ?? "").trim().toLowerCase()
}

export function decideMercadoPagoOrder(order: MercadoPagoOrder): MercadoPagoDecision {
  const paymentStatus = order.transactions?.payments?.[0]?.status?.toLowerCase()
  const orderStatus = order.status?.toLowerCase()

  if (orderStatus === "processed" || paymentStatus === "approved") {
    return "approved"
  }

  if (orderStatus === "failed" || paymentStatus === "rejected") {
    return "rejected"
  }

  if (
    orderStatus === "cancelled" ||
    orderStatus === "canceled" ||
    orderStatus === "expired" ||
    orderStatus === "expiration_date_reached" ||
    paymentStatus === "cancelled" ||
    paymentStatus === "canceled" ||
    paymentStatus === "expired"
  ) {
    return "cancelled"
  }

  if (
    orderStatus === "created" ||
    orderStatus === "action_required" ||
    orderStatus === "in_process" ||
    paymentStatus === "pending" ||
    paymentStatus === "in_process"
  ) {
    return "pending"
  }

  return "unknown"
}

export function validateMercadoPagoTotals(input: {
  order: MercadoPagoOrder
  expectedAmount: string
  expectedCurrency: string
}) {
  const actualAmount = toMercadoPagoAmount(
    input.order.total_paid_amount ?? input.order.total_amount
  )
  const actualCurrency = normalizeCurrency(input.order.currency)
  const expectedCurrency = normalizeCurrency(input.expectedCurrency)

  return {
    amountMatches: actualAmount === input.expectedAmount,
    currencyMatches: actualCurrency === expectedCurrency,
    actualAmount,
    actualCurrency,
  }
}

export function buildWebhookResult(input: {
  order: MercadoPagoOrder
  session: MercadoPagoSessionData
}): WebhookActionResult {
  const decision = decideMercadoPagoOrder(input.order)
  const sessionId = input.session.session_id ?? ""
  const amount = new BigNumber(input.session.expected_amount ?? 0)

  switch (decision) {
    case "approved":
      return {
        action: PaymentActions.SUCCESSFUL,
        data: {
          session_id: sessionId,
          amount,
        },
      }
    case "rejected":
      return {
        action: PaymentActions.FAILED,
        data: {
          session_id: sessionId,
          amount,
        },
      }
    case "cancelled":
      return {
        action: PaymentActions.CANCELED,
        data: {
          session_id: sessionId,
          amount,
        },
      }
    case "pending":
      return {
        action: PaymentActions.PENDING,
        data: {
          session_id: sessionId,
          amount,
        },
      }
    default:
      return {
        action: PaymentActions.NOT_SUPPORTED,
        data: {
          session_id: sessionId,
          amount,
        },
      }
  }
}
