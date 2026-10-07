import { PaymentActions } from "@medusajs/framework/utils"

import {
  buildWebhookResult,
  decideMercadoPagoOrder,
  validateMercadoPagoTotals,
} from "../utils"

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

  it("keeps duplicate webhook decisions idempotent at the Medusa action level", () => {
    const first = buildWebhookResult({
      order: { status: "processed" },
      session: { session_id: "payses_test", expected_amount: "12990" },
    })
    const second = buildWebhookResult({
      order: { status: "processed" },
      session: { session_id: "payses_test", expected_amount: "12990" },
    })

    expect(second).toEqual(first)
  })
})
