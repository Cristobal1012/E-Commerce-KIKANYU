import MercadoPagoConfig, {
  InvalidWebhookSignatureError,
  Order,
  WebhookSignatureValidator,
} from "mercadopago"
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

import {
  buildWebhookResult,
  decideMercadoPagoOrder,
  toMercadoPagoAmount,
  validateMercadoPagoTotals,
} from "./utils"
import type {
  MercadoPagoOrder,
  MercadoPagoPaymentOptions,
  MercadoPagoSessionData,
  MercadoPagoWebhookBody,
} from "./types"

type InjectedDependencies = {
  logger?: {
    warn: (message: string) => void
    error: (message: string) => void
  }
  paymentSessionService?: PaymentIncidentSessionService
  paymentService?: PaymentIncidentPaymentService
  remoteQuery?: RemoteQueryFunction
}

const PROVIDER_ID = "mercadopago"

type PersistedPaymentSession = {
  id?: string
  payment_collection_id?: string | null
  data?: Record<string, unknown> | null
  payment?: {
    id?: string
    data?: Record<string, unknown> | null
  } | null
}

type PaymentIncidentSessionService = {
  retrieve: (
    id: string,
    config?: Record<string, unknown>
  ) => Promise<PersistedPaymentSession>
  update: (data: {
    id: string
    data?: Record<string, unknown>
  }) => Promise<unknown>
}

type PaymentIncidentPaymentService = {
  update: (data: {
    id: string
    data?: Record<string, unknown>
  }) => Promise<unknown>
}

type RemoteQueryFunction = (query: {
  entryPoint: string
  variables: Record<string, unknown>
  fields: string[]
}) => Promise<Array<Record<string, unknown>>>

class MercadoPagoPaymentProviderService extends AbstractPaymentProvider<MercadoPagoPaymentOptions> {
  static identifier = PROVIDER_ID

  protected readonly options_: MercadoPagoPaymentOptions
  protected readonly orderClient_: Order
  protected readonly logger_: InjectedDependencies["logger"]
  protected readonly paymentService_?: PaymentIncidentPaymentService
  protected readonly paymentSessionService_?: PaymentIncidentSessionService
  protected readonly remoteQuery_?: RemoteQueryFunction

  constructor(container: InjectedDependencies, options: MercadoPagoPaymentOptions) {
    super(container, options)

    this.options_ = options
    this.logger_ = container.logger
    this.paymentService_ = container.paymentService
    this.paymentSessionService_ = container.paymentSessionService
    this.remoteQuery_ = container.remoteQuery
    this.orderClient_ = new Order(
      new MercadoPagoConfig({
        accessToken: options.accessToken,
      })
    )
  }

  static validateOptions(options: Record<string, unknown>) {
    const required = [
      "accessToken",
      "webhookSecret",
      "storefrontUrl",
      "notificationBaseUrl",
    ]

    for (const key of required) {
      if (typeof options[key] !== "string" || !options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Mercado Pago payment provider requires ${key}.`
        )
      }
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const sessionId = getString(input.data?.session_id)
    const expectedAmount = toMercadoPagoAmount(input.amount)
    const expectedCurrency = input.currency_code.toLowerCase()
    const idempotencyKey = getString(input.context?.idempotency_key) ?? sessionId

    if (!sessionId || !idempotencyKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Mercado Pago payment session is missing an idempotency key."
      )
    }

    const order = await this.orderClient_.create({
      requestOptions: {
        idempotencyKey,
      },
      body: {
        type: "online",
        processing_mode: "manual",
        capture_mode: "automatic_async",
        total_amount: expectedAmount,
        currency: expectedCurrency.toUpperCase(),
        external_reference: sessionId,
        expiration_time: this.options_.orderExpiration ?? "P1D",
        payer: input.context?.customer?.email
          ? {
              email: String(input.context.customer.email),
            }
          : undefined,
        items: [
          {
            title: "Compra online",
            unit_price: expectedAmount,
            quantity: 1,
            unit_measure: "unit",
          },
        ],
        config: {
          online: {
            callback_url: `${trimSlash(this.options_.notificationBaseUrl)}/hooks/payment/${PROVIDER_ID}_${PROVIDER_ID}`,
            success_url: `${trimSlash(this.options_.storefrontUrl)}/checkout/pago/success`,
            pending_url: `${trimSlash(this.options_.storefrontUrl)}/checkout/pago/pending`,
            failure_url: `${trimSlash(this.options_.storefrontUrl)}/checkout/pago/failure`,
            auto_return: "all",
          },
        },
      },
    })

    if (!order.id || !order.checkout_url) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Mercado Pago did not return a checkout URL."
      )
    }

    return {
      id: order.id,
      data: {
        session_id: sessionId,
        mercadopago_order_id: order.id,
        checkout_url: order.checkout_url,
        expected_amount: expectedAmount,
        expected_currency: expectedCurrency,
      },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const session = parseSessionData(input.data)
    const order = await this.retrieveMercadoPagoOrder(session)
    const validation = validateMercadoPagoTotals({
      order,
      expectedAmount: requireString(session.expected_amount, "expected_amount"),
      expectedCurrency: requireString(session.expected_currency, "expected_currency"),
    })

    if (!validation.amountMatches || !validation.currencyMatches) {
      this.logger_?.error(
        `Mercado Pago amount/currency mismatch for order ${order.id ?? "unknown"}`
      )

      return {
        status: PaymentSessionStatus.ERROR,
        data: session,
      }
    }

    const decision = decideMercadoPagoOrder(order)

    if (decision === "approved") {
      return {
        status: PaymentSessionStatus.CAPTURED,
        data: {
          ...session,
          mercadopago_payment_id: order.transactions?.payments?.[0]?.id,
          mercadopago_status: order.status,
          mercadopago_status_detail: order.status_detail,
        },
      }
    }

    if (decision === "pending") {
      return {
        status: PaymentSessionStatus.PENDING_AUTHORIZATION,
        data: session,
      }
    }

    return {
      status: PaymentSessionStatus.ERROR,
      data: session,
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const body = payload.data as MercadoPagoWebhookBody
    const orderId = getString(body.data?.id)
    const dataId = getString(
      (payload.data as Record<string, unknown>)?.["data.id"]
    ) ?? orderId

    WebhookSignatureValidator.validate({
      xSignature: getHeader(payload.headers, "x-signature"),
      xRequestId: getHeader(payload.headers, "x-request-id"),
      dataId,
      secret: this.options_.webhookSecret,
    })

    if (!orderId || body.type !== "order") {
      return unsupportedWebhook()
    }

    const order = await this.orderClient_.get({ id: orderId })
    const session = await this.getSessionDataFromOrder(order)
    const validation = validateMercadoPagoTotals({
      order,
      expectedAmount: requireString(session.expected_amount, "expected_amount"),
      expectedCurrency: requireString(session.expected_currency, "expected_currency"),
    })

    if (!validation.amountMatches || !validation.currencyMatches) {
      this.logger_?.error(
        `Mercado Pago webhook mismatch for order ${order.id ?? orderId}`
      )

      return unsupportedWebhook(session)
    }

    return buildWebhookResult({
      order,
      session,
    })
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const session = parseSessionData(input.data)
    const order = await this.retrieveMercadoPagoOrder(session)
    const decision = decideMercadoPagoOrder(order)

    if (decision === "approved") {
      return { status: PaymentSessionStatus.CAPTURED, data: session }
    }

    if (decision === "pending") {
      return { status: PaymentSessionStatus.PENDING, data: session }
    }

    if (decision === "cancelled") {
      return { status: PaymentSessionStatus.CANCELED, data: session }
    }

    return { status: PaymentSessionStatus.ERROR, data: session }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // Checkout Pro Orders captures the buyer payment in Mercado Pago's checkout
    // flow. Medusa may call this to record an internal capture; no additional
    // provider-side capture request is needed here.
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const session = parseSessionData(input.data)
    const orderId = requireString(
      session.mercadopago_order_id,
      "mercadopago_order_id"
    )

    try {
      const order = await this.orderClient_.cancel({
        id: orderId,
        requestOptions: {
          idempotencyKey: buildIdempotencyKey("cancel", session),
        },
      })

      return {
        data: {
          ...session,
          mercadopago_status: order.status,
          mercadopago_status_detail: order.status_detail,
        },
      }
    } catch (error) {
      await this.markPaymentForManualReview(
        session,
        `Mercado Pago cancel failed: ${getErrorMessage(error)}`
      )
      throw error
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const session = parseSessionData(input.data)
    const orderId = requireString(
      session.mercadopago_order_id,
      "mercadopago_order_id"
    )
    const expectedAmount = requireString(session.expected_amount, "expected_amount")
    const refundAmount = toMercadoPagoAmount(input.amount)
    const isPartialRefund = refundAmount !== expectedAmount
    const paymentId = getString(session.mercadopago_payment_id)

    try {
      const order = await this.orderClient_.refund({
        id: orderId,
        requestOptions: {
          idempotencyKey: buildIdempotencyKey("refund", session, refundAmount),
        },
        body: isPartialRefund
          ? {
              transactions: [
                {
                  id: requireString(paymentId, "mercadopago_payment_id"),
                  amount: refundAmount,
                },
              ],
            }
          : undefined,
      })
      const cartId = await this.getCartIdForPaymentSession(session.session_id)
      const orderCreated = cartId ? await this.hasOrderForCart(cartId) : true

      if (!orderCreated) {
        await this.markPaymentForManualReview(
          session,
          "Mercado Pago payment was refunded after Medusa could not complete the cart."
        )
      }

      return {
        data: {
          ...session,
          mercadopago_status: order.status,
          mercadopago_status_detail: order.status_detail,
          mercadopago_refunded_amount: refundAmount,
        },
      }
    } catch (error) {
      await this.markPaymentForManualReview(
        session,
        `Mercado Pago refund failed: ${getErrorMessage(error)}`
      )
      throw error
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data }
  }

  protected async retrieveMercadoPagoOrder(
    session: MercadoPagoSessionData
  ): Promise<MercadoPagoOrder> {
    const orderId = requireString(
      session.mercadopago_order_id,
      "mercadopago_order_id"
    )

    return this.orderClient_.get({ id: orderId })
  }

  protected async getSessionDataFromOrder(
    order: MercadoPagoOrder
  ): Promise<MercadoPagoSessionData> {
    const sessionId = getString(order.external_reference)

    if (!sessionId) {
      return {}
    }

    const persistedSession = await this.getPersistedPaymentSession(sessionId)
    const persistedData = parseSessionData(persistedSession.data)

    return {
      ...persistedData,
      session_id: sessionId,
      mercadopago_order_id:
        persistedData.mercadopago_order_id ?? order.id,
    }
  }

  protected async getPersistedPaymentSession(sessionId: string) {
    const paymentSessionService = this.paymentSessionService_

    if (!paymentSessionService) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Mercado Pago provider cannot read the persisted payment session."
      )
    }

    return paymentSessionService.retrieve(sessionId, {
      select: ["id", "data", "payment_collection_id"],
      relations: ["payment"],
    })
  }

  protected async markPaymentForManualReview(
    session: MercadoPagoSessionData,
    reason: string
  ) {
    const cartId = await this.getCartIdForPaymentSession(session.session_id)
    const incident = {
      required: true,
      reason,
      mercadopago_order_id: session.mercadopago_order_id,
      session_id: session.session_id,
      cart_id: cartId,
      created_at: new Date().toISOString(),
    }

    this.logger_?.error(
      `Mercado Pago manual review required order_id=${session.mercadopago_order_id ?? "unknown"} cart_id=${cartId ?? "unknown"} session_id=${session.session_id ?? "unknown"} reason=${reason}`
    )

    if (!session.session_id) {
      return
    }

    const persistedSession = await this.getPersistedPaymentSession(session.session_id)
    const paymentId = persistedSession.payment?.id

    if (paymentId && this.paymentService_) {
      await this.paymentService_.update({
        id: paymentId,
        data: {
          ...(persistedSession.payment?.data ?? {}),
          mercadopago_manual_review: incident,
        },
      })
      return
    }

    if (this.paymentSessionService_) {
      await this.paymentSessionService_.update({
        id: session.session_id,
        data: {
          ...(persistedSession.data ?? {}),
          mercadopago_manual_review: incident,
        },
      })
    }
  }

  protected async getCartIdForPaymentSession(sessionId: string | undefined) {
    if (!sessionId) {
      return undefined
    }

    try {
      const persistedSession = await this.getPersistedPaymentSession(sessionId)
      const collectionId = persistedSession.payment_collection_id

      if (!collectionId) {
        return undefined
      }

      const remoteQuery = this.remoteQuery_

      if (!remoteQuery) {
        return undefined
      }

      const [link] = await remoteQuery({
        entryPoint: "cart_payment_collection",
        variables: {
          filters: {
            payment_collection_id: collectionId,
          },
        },
        fields: ["cart_id"],
      })

      return typeof link?.cart_id === "string" ? link.cart_id : undefined
    } catch {
      return undefined
    }
  }

  protected async hasOrderForCart(cartId: string) {
    try {
      const remoteQuery = this.remoteQuery_

      if (!remoteQuery) {
        return false
      }

      const [link] = await remoteQuery({
        entryPoint: "order_cart",
        variables: {
          filters: {
            cart_id: cartId,
          },
        },
        fields: ["order_id"],
      })

      return typeof link?.order_id === "string"
    } catch {
      return false
    }
  }
}

function parseSessionData(data: unknown): MercadoPagoSessionData {
  return (data ?? {}) as MercadoPagoSessionData
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function requireString(value: unknown, field: string) {
  const parsed = getString(value)

  if (!parsed) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Mercado Pago payment data is missing ${field}.`
    )
  }

  return parsed
}

function unsupportedWebhook(session: MercadoPagoSessionData = {}) {
  return {
    action: PaymentActions.NOT_SUPPORTED,
    data: {
      session_id: session.session_id ?? "",
      amount: new BigNumber(session.expected_amount ?? 0),
    },
  }
}

function buildIdempotencyKey(
  operation: "cancel" | "refund",
  session: MercadoPagoSessionData,
  amount?: string
) {
  return [
    "mercadopago",
    operation,
    session.mercadopago_order_id ?? "order",
    session.session_id ?? "session",
    amount ?? "full",
  ].join(":")
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error"
}

function getHeader(headers: unknown, key: string) {
  if (!headers || typeof headers !== "object") {
    return undefined
  }

  const value = (headers as Record<string, unknown>)[key]

  return typeof value === "string" || Array.isArray(value)
    ? value
    : undefined
}

function trimSlash(value: string) {
  return value.replace(/\/+$/, "")
}

export { InvalidWebhookSignatureError }
export default MercadoPagoPaymentProviderService
