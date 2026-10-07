import type { OrderResponse } from "mercadopago/dist/clients/order/commonTypes"

export type MercadoPagoPaymentOptions = {
  accessToken: string
  webhookSecret: string
  storefrontUrl: string
  backendUrl: string
  orderExpiration?: string
}

export type MercadoPagoSessionData = {
  session_id?: string
  mercadopago_order_id?: string
  checkout_url?: string
  expected_amount?: string
  expected_currency?: string
}

export type MercadoPagoWebhookBody = {
  action?: string
  type?: string
  data?: {
    id?: string
  }
}

export type MercadoPagoOrder = Pick<
  OrderResponse,
  | "id"
  | "status"
  | "status_detail"
  | "total_amount"
  | "total_paid_amount"
  | "currency"
  | "checkout_url"
  | "external_reference"
  | "transactions"
>

export type MercadoPagoDecision =
  | "approved"
  | "rejected"
  | "pending"
  | "cancelled"
  | "unknown"
