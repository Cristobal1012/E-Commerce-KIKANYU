import { describe, expect, it } from "vitest"
import { calculateCartSubtotal, getQuantityChange } from "@/lib/cart"

describe("calculateCartSubtotal", () => {
  it("adds the subtotal of all line items", () => {
    expect(
      calculateCartSubtotal([
        { subtotal: 3990 },
        { subtotal: 5990 },
        { subtotal: 1000 },
      ])
    ).toBe(10980)
  })
})

describe("getQuantityChange", () => {
  it("increases quantity by one", () => {
    expect(getQuantityChange(1, 1)).toBe(2)
  })

  it("does not decrease below one", () => {
    expect(getQuantityChange(1, -1)).toBe(1)
  })
})
