import { PaymentActions } from "@medusajs/framework/utils"
import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from "mercadopago/dist/utils/webhook"

import MercadoPagoPaymentProviderService from "../service"
import {
  buildWebhookResult,
  decideMercadoPagoOrder,
  validateMercadoPagoTotals,
} from "../utils"
import type { MercadoPagoPaymentOptions, MercadoPagoSessionData } from "../types"

type ManualReviewIncident = {
  required: true
  reason: string
  mercadopago_order_id?: string
  session_id?: string
  cart_id?: string
  created_at: string
}

type PaymentSessionRecord = {
  id?: string
  payment_collection_id?: string | null
  data?: Record<string, unknown> | null
  payment?: {
    id?: string
    data?: Record<string, unknown> | null
  } | null
}

type OrderClientMock = {
  refund: jest.Mock<Promise<unknown>, [Record<string, unknown>]>
}

const providerOptions: MercadoPagoPaymentOptions = {
  accessToken: "TEST_ACCESS_TOKEN",
  webhookSecret: "TEST_WEBHOOK_SECRET",
  storefrontUrl: "http://localhost:3000",
  backendUrl: "http://localhost:9000",
}

class TestMercadoPagoPaymentProvider extends MercadoPagoPaymentProviderService {
  async markForManualReview(session: MercadoPagoSessionData, reason: string) {
    return this.markPaymentForManualReview(session, reason)
  }

  replaceOrderClient(orderClient: OrderClientMock) {
    Object.defineProperty(this, "orderClient_", {
      value: orderClient,
    })
  }
}

function createProvider(input: {
  paymentSession: PaymentSessionRecord
  paymentUpdate?: jest.Mock<Promise<unknown>, [Record<string, unknown>]>
  paymentSessionUpdate?: jest.Mock<Promise<unknown>, [Record<string, unknown>]>
  remoteQuery?: jest.Mock<Promise<Array<Record<string, unknown>>>, [Record<string, unknown>]>
  loggerError?: jest.Mock<void, [string]>
}) {
  const paymentSessionRetrieve = jest.fn<
    Promise<PaymentSessionRecord>,
    [string, Record<string, unknown>?]
  >()
  paymentSessionRetrieve.mockResolvedValue(input.paymentSession)

  const paymentUpdate =
    input.paymentUpdate ?? jest.fn<Promise<unknown>, [Record<string, unknown>]>()
  const paymentSessionUpdate =
    input.paymentSessionUpdate ??
    jest.fn<Promise<unknown>, [Record<string, unknown>]>()
  const remoteQuery =
    input.remoteQuery ??
    jest.fn<Promise<Array<Record<string, unknown>>>, [Record<string, unknown>]>()
  const loggerError = input.loggerError ?? jest.fn<void, [string]>()

  remoteQuery.mockResolvedValue([{ cart_id: "cart_test" }])

  const provider = new TestMercadoPagoPaymentProvider(
    {
      logger: {
        warn: jest.fn<void, [string]>(),
        error: loggerError,
      },
      paymentService: {
        update: paymentUpdate,
      },
      paymentSessionService: {
        retrieve: paymentSessionRetrieve,
        update: paymentSessionUpdate,
      },
      remoteQuery,
    },
    providerOptions
  )

  return {
    provider,
    paymentUpdate,
    paymentSessionUpdate,
    paymentSessionRetrieve,
    remoteQuery,
    loggerError,
  }
}

function expectManualReview(
  data: Record<string, unknown> | undefined,
  reason: string
) {
  expect(data).toBeDefined()

  const incident = data?.mercadopago_manual_review as
    | ManualReviewIncident
    | undefined

  expect(incident).toEqual(
    expect.objectContaining({
      required: true,
      reason,
      mercadopago_order_id: "ORD_TEST",
      session_id: "payses_test",
      cart_id: "cart_test",
    })
  )
  expect(typeof incident?.created_at).toBe("string")
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

describe("Mercado Pago payment decisions", () => {
  it("maps an approved order to captured", () => {
    const result = buildWebhookResult({
      order: {
        status: "processed",
        total_paid_amount: "12990",
        currency: "CLP",
      },
      session: {
        session_id: "payses_test",
        expected_amount: "12990",
        expected_currency: "clp",
      },
    })

    expect(result.action).toBe(PaymentActions.SUCCESSFUL)
    expect(result.data?.session_id).toBe("payses_test")
  })

  it("maps a rejected order to failed", () => {
    expect(
      buildWebhookResult({
        order: { status: "failed" },
        session: { session_id: "payses_test", expected_amount: "12990" },
      }).action
    ).toBe(PaymentActions.FAILED)
  })

  it("maps a pending order to pending without completing the cart", () => {
    expect(
      buildWebhookResult({
        order: { status: "created" },
        session: { session_id: "payses_test", expected_amount: "12990" },
      }).action
    ).toBe(PaymentActions.PENDING)
  })

  it("maps a canceled order to canceled", () => {
    expect(
      buildWebhookResult({
        order: { status: "cancelled" },
        session: { session_id: "payses_test", expected_amount: "12990" },
      }).action
    ).toBe(PaymentActions.CANCELED)
  })

  it("maps an expired order to canceled", () => {
    expect(
      buildWebhookResult({
        order: { status: "expired" },
        session: { session_id: "payses_test", expected_amount: "12990" },
      }).action
    ).toBe(PaymentActions.CANCELED)
  })

  it("rejects unknown states as not supported", () => {
    expect(decideMercadoPagoOrder({ status: "mystery" })).toBe("unknown")
    expect(
      buildWebhookResult({
        order: { status: "mystery" },
        session: { session_id: "payses_test", expected_amount: "12990" },
      }).action
    ).toBe(PaymentActions.NOT_SUPPORTED)
  })

  it("detects an incorrect amount", () => {
    const result = validateMercadoPagoTotals({
      order: {
        total_paid_amount: "12991",
        currency: "CLP",
      },
      expectedAmount: "12990",
      expectedCurrency: "clp",
    })

    expect(result.amountMatches).toBe(false)
    expect(result.currencyMatches).toBe(true)
  })

  it("detects an incorrect currency", () => {
    const result = validateMercadoPagoTotals({
      order: {
        total_paid_amount: "12990",
        currency: "ARS",
      },
      expectedAmount: "12990",
      expectedCurrency: "clp",
    })

    expect(result.amountMatches).toBe(true)
    expect(result.currencyMatches).toBe(false)
  })

  it("does not confirm an order from a success redirect alone", () => {
    const redirectOnlyStatus = decideMercadoPagoOrder({ status: "created" })

    expect(redirectOnlyStatus).toBe("pending")
  })

  it("returns the same action for a repeated webhook with the same Mercado Pago order id", () => {
    const first = buildWebhookResult({
      order: { id: "ORD_TEST", status: "processed" },
      session: { session_id: "payses_test", expected_amount: "12990" },
    })
    const second = buildWebhookResult({
      order: { id: "ORD_TEST", status: "processed" },
      session: { session_id: "payses_test", expected_amount: "12990" },
    })

    expect(second).toEqual(first)
  })

  it("rejects an invalid Mercado Pago webhook signature", () => {
    expect(() =>
      WebhookSignatureValidator.validate({
        xSignature: "ts=1700000000,v1=invalid",
        xRequestId: "request-test",
        dataId: "ORD_TEST",
        secret: "test-secret",
      })
    ).toThrow(InvalidWebhookSignatureError)
  })

  it("marks the Payment data for manual review when a Payment already exists", async () => {
    const { provider, paymentUpdate, paymentSessionUpdate } = createProvider({
      paymentSession: {
        id: "payses_test",
        payment_collection_id: "paycol_test",
        data: {
          session_data: "kept",
        },
        payment: {
          id: "pay_test",
          data: {
            payment_data: "kept",
          },
        },
      },
    })

    await provider.markForManualReview(
      {
        session_id: "payses_test",
        mercadopago_order_id: "ORD_TEST",
      },
      "cart completion failed"
    )

    expect(paymentUpdate).toHaveBeenCalledTimes(1)
    expect(paymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "pay_test",
        data: expect.objectContaining({
          payment_data: "kept",
        }),
      })
    )
    expectManualReview(
      asRecord(paymentUpdate.mock.calls[0]?.[0]?.data),
      "cart completion failed"
    )
    expect(paymentSessionUpdate).not.toHaveBeenCalled()
  })

  it("marks the PaymentSession data for manual review before a Payment exists", async () => {
    const { provider, paymentUpdate, paymentSessionUpdate } = createProvider({
      paymentSession: {
        id: "payses_test",
        payment_collection_id: "paycol_test",
        data: {
          session_data: "kept",
        },
        payment: null,
      },
    })

    await provider.markForManualReview(
      {
        session_id: "payses_test",
        mercadopago_order_id: "ORD_TEST",
      },
      "cart completion failed"
    )

    expect(paymentUpdate).not.toHaveBeenCalled()
    expect(paymentSessionUpdate).toHaveBeenCalledTimes(1)
    expect(paymentSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "payses_test",
        data: expect.objectContaining({
          session_data: "kept",
        }),
      })
    )
    expectManualReview(
      asRecord(paymentSessionUpdate.mock.calls[0]?.[0]?.data),
      "cart completion failed"
    )
  })

  it("marks the Payment for manual review when Mercado Pago refund fails", async () => {
    const { provider, paymentUpdate, loggerError } = createProvider({
      paymentSession: {
        id: "payses_test",
        payment_collection_id: "paycol_test",
        data: {},
        payment: {
          id: "pay_test",
          data: {},
        },
      },
    })
    const orderClient: OrderClientMock = {
      refund: jest.fn<Promise<unknown>, [Record<string, unknown>]>(),
    }
    orderClient.refund.mockRejectedValue(new Error("refund unavailable"))
    provider.replaceOrderClient(orderClient)

    await expect(
      provider.refundPayment({
        amount: 12990,
        data: {
          session_id: "payses_test",
          mercadopago_order_id: "ORD_TEST",
          expected_amount: "12990",
        },
      })
    ).rejects.toThrow("refund unavailable")

    expect(orderClient.refund).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ORD_TEST",
      })
    )
    expect(paymentUpdate).toHaveBeenCalledTimes(1)
    expectManualReview(
      asRecord(paymentUpdate.mock.calls[0]?.[0]?.data),
      "Mercado Pago refund failed: refund unavailable"
    )
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining("reason=Mercado Pago refund failed: refund unavailable")
    )
  })
})
