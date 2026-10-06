import { describe, expect, it } from "vitest"
import { formatClp } from "@/lib/format"

describe("formatClp", () => {
  it("formats CLP without decimals using Chilean separators", () => {
    expect(formatClp(12990)).toBe("$12.990")
  })
})
