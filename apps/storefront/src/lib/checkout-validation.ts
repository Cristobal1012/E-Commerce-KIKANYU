import { z } from "zod"
import { checkoutConfig } from "@config/checkout.config"
import { getCoverageForRegion } from "@/lib/checkout"

export type DeliveryKind = "pickup" | "shipping"

export type CheckoutContactInput = {
  firstName: string
  lastName: string
  email: string
  phone: string
  rut?: string
}

export type CheckoutAddressInput = {
  regionCode: string
  city: string
  address1: string
  number: string
  apartment?: string
  notes?: string
}

export type CheckoutFormInput = {
  contact: CheckoutContactInput
  deliveryKind: DeliveryKind
  address?: CheckoutAddressInput
}

export type CheckoutFieldKey =
  | "contact.firstName"
  | "contact.lastName"
  | "contact.email"
  | "contact.phone"
  | "contact.rut"
  | "address.regionCode"
  | "address.city"
  | "address.address1"
  | "address.number"
  | "address.apartment"
  | "address.notes"

export type CheckoutFieldMessages = Partial<Record<CheckoutFieldKey, string>>

const nameRegex = /^[\p{L}\s'-]+$/u
const addressNumberRegex = /^(?:S\/N|(?=[A-Za-z0-9-]*\d)[A-Za-z0-9-]{1,10})$/i

const commonEmailDomainFixes: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.clm": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "yaho.com": "yahoo.com",
}

const contactSchema = z.object({
  firstName: buildNameSchema("nombre"),
  lastName: buildNameSchema("apellido"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Ingresa un email.")
    .max(254, "El email no puede tener más de 254 caracteres.")
    .email("Ingresa un email válido."),
  phone: z
    .string()
    .trim()
    .min(1, "Ingresa un teléfono de contacto.")
    .refine((value) => normalizeChileMobilePhone(value) !== null, {
      message: "Ingresa un celular chileno válido, por ejemplo +56 9 1234 5678.",
    })
    .transform((value) => normalizeChileMobilePhone(value) as string),
  rut: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value === "" || parseRut(value).valid, {
      message: "El RUT no es válido. Revisa el dígito verificador.",
    })
    .transform((value) => (value === "" ? "" : parseRut(value).storage)),
})

const addressSchema = z.object({
  regionCode: z
    .string()
    .trim()
    .min(1, "Selecciona una región.")
    .refine((value) => getRegion(value) !== undefined, {
      message: "Selecciona una región válida.",
    }),
  city: z.string().trim().min(1, "Selecciona una comuna."),
  address1: z
    .string()
    .trim()
    .min(3, "La calle debe tener al menos 3 caracteres.")
    .max(100, "La calle no puede tener más de 100 caracteres."),
  number: z
    .string()
    .trim()
    .min(1, "Ingresa el número de la dirección. Si no tiene número, escribe S/N (sin número).")
    .max(10, "El número no puede tener más de 10 caracteres.")
    .refine((value) => addressNumberRegex.test(value), {
      message:
        "Ingresa un número válido, por ejemplo 123 o 12B. Si no tiene número, escribe S/N (sin número).",
    })
    .transform((value) => (value.toUpperCase() === "S/N" ? "S/N" : value)),
  apartment: z
    .string()
    .trim()
    .max(20, "Depto/casa no puede tener más de 20 caracteres.")
    .optional()
    .transform((value) => value ?? ""),
  notes: z
    .string()
    .trim()
    .max(200, "Las referencias no pueden tener más de 200 caracteres.")
    .optional()
    .transform((value) => value ?? ""),
})

export const checkoutFormSchema = z
  .object({
    contact: contactSchema,
    deliveryKind: z.enum(["pickup", "shipping"]),
    address: addressSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.deliveryKind !== "shipping") {
      return
    }

    if (!value.address) {
      context.addIssue({
        code: "custom",
        path: ["address", "regionCode"],
        message: "Completa la dirección para calcular el despacho.",
      })
      return
    }

    const region = getRegion(value.address.regionCode)
    const coverage = getCoverageForRegion(value.address.regionCode)

    if (!coverage.covered) {
      context.addIssue({
        code: "custom",
        path: ["address", "regionCode"],
        message: coverage.reason,
      })
    }

    if (!region || !(region.communes as readonly string[]).includes(value.address.city)) {
      context.addIssue({
        code: "custom",
        path: ["address", "city"],
        message: "La comuna no corresponde a la región seleccionada.",
      })
    }
  })

export type CheckoutFormData = z.output<typeof checkoutFormSchema>

export function validateCheckoutForm(input: CheckoutFormInput) {
  return checkoutFormSchema.safeParse(input)
}

export function getCheckoutFieldErrors(input: CheckoutFormInput) {
  const result = validateCheckoutForm(input)

  if (result.success) {
    return {}
  }

  return result.error.issues.reduce<CheckoutFieldMessages>((errors, issue) => {
    const key = issue.path.join(".") as CheckoutFieldKey

    if (!errors[key]) {
      errors[key] = issue.message
    }

    return errors
  }, {})
}

export function getCheckoutWarnings(input: CheckoutFormInput): CheckoutFieldMessages {
  const warnings: CheckoutFieldMessages = {}
  const normalizedEmail = input.contact.email.trim().toLowerCase()
  const [localPart = "", domain = ""] = normalizedEmail.split("@")
  const suggestedDomain = getSuggestedEmailDomain(domain)

  if (domain === "gmail.com" && localPart.length > 0 && localPart.length < 6) {
    warnings["contact.email"] =
      "Ese Gmail es muy corto. Puedes continuar, pero revisa que esté bien escrito."
  }

  if (suggestedDomain && localPart) {
    warnings["contact.email"] = `¿Quisiste decir ${localPart}@${suggestedDomain}?`
  }

  return warnings
}

export function normalizeChileMobilePhone(value: string) {
  if (!/^[+\d\s()-]+$/.test(value)) {
    return null
  }

  let digits = value.replace(/\D/g, "")

  if (digits.startsWith("56")) {
    digits = digits.slice(2)
  }

  if (digits.startsWith("09")) {
    digits = digits.slice(1)
  }

  if (!/^9\d{8}$/.test(digits)) {
    return null
  }

  if (/^(\d)\1+$/.test(digits)) {
    return null
  }

  return `+56${digits}`
}

export function parseRut(value: string) {
  const cleanValue = value.replace(/[^0-9kK]/g, "").toUpperCase()
  const body = cleanValue.slice(0, -1)
  const verifier = cleanValue.slice(-1)
  const bodyIsValid = /^\d{7,8}$/.test(body)
  const expectedVerifier = bodyIsValid ? getRutVerifier(body) : ""
  const valid = bodyIsValid && verifier === expectedVerifier
  const storage = body && verifier ? `${body}-${verifier}` : value.trim().toUpperCase()

  return {
    body,
    verifier,
    valid,
    storage,
    display: valid ? formatRutDisplay(storage) : value.trim().toUpperCase(),
  }
}

export function formatRutDisplay(value: string) {
  const cleanValue = value.replace(/[^0-9kK]/g, "").toUpperCase()
  const body = cleanValue.slice(0, -1)
  const verifier = cleanValue.slice(-1)

  if (!body || !verifier) {
    return value
  }

  return `${Number(body).toLocaleString("es-CL")}-${verifier}`
}

export function getSuggestedEmailDomain(domain: string) {
  return commonEmailDomainFixes[domain.toLowerCase()] ?? null
}

export function getCommunesForRegion(regionCode: string) {
  return getRegion(regionCode)?.communes ?? []
}

function buildNameSchema(label: "nombre" | "apellido") {
  const capitalizedLabel = label === "nombre" ? "El nombre" : "El apellido"

  return z
    .string()
    .trim()
    .min(1, `Ingresa ${label}.`)
    .min(2, `${capitalizedLabel} debe tener al menos 2 caracteres.`)
    .max(50, `${capitalizedLabel} no puede tener más de 50 caracteres.`)
    .refine((value) => nameRegex.test(value), {
      message: `${capitalizedLabel} solo puede incluir letras, espacios, guion y apóstrofe.`,
    })
}

function getRegion(regionCode: string) {
  return checkoutConfig.delivery.shipping.regions.find((region) => region.code === regionCode)
}

function getRutVerifier(body: string) {
  let sum = 0
  let multiplier = 2

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const digit = 11 - (sum % 11)

  if (digit === 11) {
    return "0"
  }

  if (digit === 10) {
    return "K"
  }

  return String(digit)
}
