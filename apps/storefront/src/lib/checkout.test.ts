import { describe, expect, it } from "vitest"
import { calculateIncludedVat, getCoverageForRegion } from "@/lib/checkout"
import {
  formatRutDisplay,
  getCheckoutWarnings,
  normalizeChileMobilePhone,
  parseRut,
  validateCheckoutForm,
  type CheckoutFormInput,
} from "@/lib/checkout-validation"

type CheckoutFormOverrides = {
  contact?: Partial<CheckoutFormInput["contact"]>
  deliveryKind?: CheckoutFormInput["deliveryKind"]
  address?: Partial<NonNullable<CheckoutFormInput["address"]>>
}

function validCheckoutForm(overrides: CheckoutFormOverrides = {}): CheckoutFormInput {
  return {
    contact: {
      firstName: "María José",
      lastName: "O'Ryan-Pérez",
      email: "cliente@gmail.com",
      phone: "+56 9 1234 5678",
      rut: "12.345.678-5",
      ...overrides.contact,
    },
    deliveryKind: overrides.deliveryKind ?? "shipping",
    address: {
      regionCode: "RM",
      city: "Santiago",
      address1: "Avenida Siempre Viva",
      number: "123A",
      apartment: "Depto 2",
      notes: "Tocar timbre",
      ...overrides.address,
    },
  }
}

describe("calculateIncludedVat", () => {
  it("extracts included VAT from the total without adding it", () => {
    expect(calculateIncludedVat(11900)).toBe(1900)
    expect(calculateIncludedVat(12990)).toBe(2074)
  })
})

describe("checkout validation schema", () => {
  it("accepts a valid checkout and normalizes email, phone and RUT", () => {
    const result = validateCheckoutForm(
      validCheckoutForm({
        contact: {
          firstName: " María ",
          lastName: " Muñoz ",
          email: "CLIENTE@GMAIL.COM ",
          phone: "+56 9 1234 5678",
          rut: "12.345.678-5",
        },
      })
    )

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.contact.email).toBe("cliente@gmail.com")
      expect(result.data.contact.phone).toBe("+56912345678")
      expect(result.data.contact.rut).toBe("12345678-5")
    }
  })

  it("rejects invalid names", () => {
    const result = validateCheckoutForm(
      validCheckoutForm({
        contact: {
          firstName: "A",
          lastName: "Pérez2",
          email: "cliente@gmail.com",
          phone: "+56 9 1234 5678",
        },
      })
    )

    expect(result.success).toBe(false)
  })

  it("rejects weak phone numbers", () => {
    expect(normalizeChileMobilePhone("12")).toBeNull()
    expect(normalizeChileMobilePhone("999999999")).toBeNull()
    expect(normalizeChileMobilePhone("+56 9 1234 5678")).toBe("+56912345678")
  })

  it("warns about short Gmail local parts without blocking", () => {
    const form = validCheckoutForm({
      contact: {
        firstName: "María",
        lastName: "Pérez",
        email: "k@gmail.com",
        phone: "+56 9 1234 5678",
      },
    })

    expect(validateCheckoutForm(form).success).toBe(true)
    expect(getCheckoutWarnings(form)["contact.email"]).toContain("Gmail es muy corto")
  })

  it("suggests common email domain corrections", () => {
    const form = validCheckoutForm({
      contact: {
        firstName: "María",
        lastName: "Pérez",
        email: "cliente@gmial.com",
        phone: "+56 9 1234 5678",
      },
    })

    expect(getCheckoutWarnings(form)["contact.email"]).toBe(
      "¿Quisiste decir cliente@gmail.com?"
    )
  })

  it("validates RUT verifier digit and display format", () => {
    expect(parseRut("12.345.678-0").valid).toBe(false)
    expect(parseRut("12.345.678-5")).toMatchObject({
      valid: true,
      storage: "12345678-5",
      display: "12.345.678-5",
    })
    expect(formatRutDisplay("12345678-5")).toBe("12.345.678-5")
  })

  it("rejects inconsistent shipping region and commune", () => {
    const result = validateCheckoutForm(
      validCheckoutForm({
        address: {
          regionCode: "RM",
          city: "Concepción",
        },
      })
    )

    expect(result.success).toBe(false)
  })

  it("validates shipping address fields", () => {
    const result = validateCheckoutForm(
      validCheckoutForm({
        address: {
          address1: "Av",
          number: "12345678901",
          apartment: "A".repeat(21),
          notes: "B".repeat(201),
        },
      })
    )

    expect(result.success).toBe(false)
  })

  it("rejects an address number without digits", () => {
    const result = validateCheckoutForm(
      validCheckoutForm({
        address: {
          number: "k",
        },
      })
    )

    expect(result.success).toBe(false)
  })

  it.each(["123", "12B", "s/n"])("accepts address number %s", (number) => {
    const result = validateCheckoutForm(
      validCheckoutForm({
        address: {
          number,
        },
      })
    )

    expect(result.success).toBe(true)
  })
})

describe("getCoverageForRegion", () => {
  it("covers the Metropolitan Region with its own zone", () => {
    expect(getCoverageForRegion("RM")).toEqual({
      covered: true,
      zone: "metropolitan",
    })
  })

  it("covers the rest of the country with the MVP zone", () => {
    expect(getCoverageForRegion("BIOBIO")).toEqual({
      covered: true,
      zone: "rest_of_country",
    })
  })

  it("blocks the TODO test region", () => {
    expect(getCoverageForRegion("AYSEN_TODO_BLOQUEADA")).toEqual({
      covered: false,
      reason:
        "Por ahora no tenemos cobertura para esta zona de prueba. Elige retiro o cambia la región.",
    })
  })
})
