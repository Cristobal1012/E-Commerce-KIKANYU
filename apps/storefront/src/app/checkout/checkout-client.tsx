"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { brandConfig } from "@config/brand.config"
import { checkoutConfig } from "@config/checkout.config"
import {
  applyCheckoutPromotionAction,
  beginCheckoutPaymentAction,
  removeCheckoutPromotionAction,
  updateCheckoutDeliveryAction,
  validateCheckoutStockAction,
} from "@/app/checkout/checkout-actions"
import { checkoutText } from "@/lib/checkout-text"
import { calculateIncludedVat, getCoverageForRegion } from "@/lib/checkout"
import {
  formatRutDisplay,
  getCheckoutFieldErrors,
  getCheckoutWarnings,
  getCommunesForRegion,
  normalizeChileMobilePhone,
  parseRut,
  validateCheckoutForm,
  type CheckoutAddressInput,
  type CheckoutContactInput,
  type CheckoutFieldKey,
  type CheckoutFieldMessages,
  type DeliveryKind,
} from "@/lib/checkout-validation"
import { formatClp } from "@/lib/format"
import type { StoreCart } from "@/lib/cart"

type CheckoutClientProps = {
  initialCart: StoreCart
}

const emptyContact: CheckoutContactInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  rut: "",
}

const emptyAddress: CheckoutAddressInput = {
  regionCode: "RM",
  city: checkoutConfig.delivery.shipping.regions[0]?.communes[0] ?? "",
  address1: "",
  number: "",
  apartment: "",
  notes: "",
}

const checkoutFieldOrder: CheckoutFieldKey[] = [
  "contact.firstName",
  "contact.lastName",
  "contact.email",
  "contact.phone",
  "contact.rut",
  "address.regionCode",
  "address.city",
  "address.address1",
  "address.number",
  "address.apartment",
  "address.notes",
]

export function CheckoutClient({ initialCart }: CheckoutClientProps) {
  const [cart, setCart] = useState(initialCart)
  const [contact, setContact] = useState(emptyContact)
  const [address, setAddress] = useState(emptyAddress)
  const [deliveryKind, setDeliveryKind] = useState<DeliveryKind>("pickup")
  const [discountCode, setDiscountCode] = useState<string>(checkoutConfig.testDiscountCode)
  const [message, setMessage] = useState("")
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldMessages>({})
  const [fieldWarnings, setFieldWarnings] = useState<CheckoutFieldMessages>({})
  const [isPending, startTransition] = useTransition()

  const formInput = useMemo(
    () => ({
      contact,
      deliveryKind,
      address: deliveryKind === "shipping" ? address : undefined,
    }),
    [address, contact, deliveryKind]
  )
  const coverage = useMemo(() => getCoverageForRegion(address.regionCode), [address.regionCode])
  const communes = useMemo(() => getCommunesForRegion(address.regionCode), [address.regionCode])
  const activePromotion = cart.promotions.find(
    (promotion) => promotion.code === discountCode.trim().toUpperCase()
  )
  const selectedShipping = cart.shippingMethods[0]
  const includedVat = calculateIncludedVat(cart.total)

  useEffect(() => {
    startTransition(async () => {
      const result = await validateCheckoutStockAction()
      if (result.cart) {
        setCart(result.cart)
      }
      if (!result.ok) {
        setMessage(result.message)
      }
    })
  }, [])

  function updateContactField(field: keyof CheckoutContactInput, value: string) {
    setContact((current) => ({ ...current, [field]: value }))
  }

  function updateAddressField(field: keyof CheckoutAddressInput, value: string) {
    setAddress((current) => {
      if (field === "regionCode") {
        return {
          ...current,
          regionCode: value,
          city: getCommunesForRegion(value)[0] ?? "",
        }
      }

      return { ...current, [field]: value }
    })
  }

  function validateFields() {
    const nextErrors = getCheckoutFieldErrors(formInput)
    const nextWarnings = getCheckoutWarnings(formInput)

    setFieldErrors(nextErrors)
    setFieldWarnings(nextWarnings)

    return nextErrors
  }

  function validateField(field: CheckoutFieldKey) {
    const nextErrors = getCheckoutFieldErrors(formInput)
    const nextWarnings = getCheckoutWarnings(formInput)

    setFieldErrors((current) => ({
      ...current,
      [field]: nextErrors[field],
    }))
    setFieldWarnings((current) => ({
      ...current,
      [field]: nextWarnings[field],
    }))
  }

  function normalizeField(field: CheckoutFieldKey) {
    if (field === "contact.email") {
      updateContactField("email", contact.email.trim().toLowerCase())
      return
    }

    if (field === "contact.phone") {
      const normalizedPhone = normalizeChileMobilePhone(contact.phone)
      if (normalizedPhone) {
        updateContactField("phone", normalizedPhone)
      }
      return
    }

    if (field === "contact.rut") {
      const parsedRut = parseRut(contact.rut ?? "")
      if (parsedRut.valid) {
        updateContactField("rut", formatRutDisplay(parsedRut.storage))
      }
    }
  }

  function focusFirstError(errors: CheckoutFieldMessages) {
    const firstField = checkoutFieldOrder.find((field) => errors[field])

    if (firstField) {
      document.getElementById(getFieldId(firstField))?.focus()
    }
  }

  function continueToSummary() {
    const errors = validateFields()

    if (Object.keys(errors).length > 0) {
      setMessage("Revisa los datos marcados antes de continuar.")
      focusFirstError(errors)
      return
    }

    const parsed = validateCheckoutForm(formInput)

    if (!parsed.success) {
      return
    }

    setContact({
      firstName: parsed.data.contact.firstName,
      lastName: parsed.data.contact.lastName,
      email: parsed.data.contact.email,
      phone: parsed.data.contact.phone,
      rut: parsed.data.contact.rut ? formatRutDisplay(parsed.data.contact.rut) : "",
    })

    if (parsed.data.address) {
      setAddress(parsed.data.address)
    }

    setMessage("")
    startTransition(async () => {
      const result = await updateCheckoutDeliveryAction(parsed.data)

      if (result.cart) {
        setCart(result.cart)
      }

      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
        focusFirstError(result.fieldErrors)
      }

      setMessage(result.message)
    })
  }

  function applyPromotion() {
    setMessage("")
    startTransition(async () => {
      const result = await applyCheckoutPromotionAction(discountCode)

      if (result.cart) {
        setCart(result.cart)
      }

      setMessage(result.message)
    })
  }

  function removePromotion() {
    setMessage("")
    startTransition(async () => {
      const result = await removeCheckoutPromotionAction(discountCode.trim().toUpperCase())

      if (result.cart) {
        setCart(result.cart)
      }

      setMessage(result.message)
    })
  }

  function beginPayment() {
    setMessage("")
    startTransition(async () => {
      const result = await beginCheckoutPaymentAction()

      if (result.cart) {
        setCart(result.cart)
      }

      setMessage(result.message)

      if (result.ok && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className="border border-border bg-surface p-5">
          <h2 className="font-serif text-2xl">{checkoutText.contactTitle}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              autoComplete="given-name"
              error={fieldErrors["contact.firstName"]}
              field="contact.firstName"
              label="Nombre"
              value={contact.firstName}
              onBlur={() => validateField("contact.firstName")}
              onChange={(value) => updateContactField("firstName", value)}
            />
            <Field
              autoComplete="family-name"
              error={fieldErrors["contact.lastName"]}
              field="contact.lastName"
              label="Apellido"
              value={contact.lastName}
              onBlur={() => validateField("contact.lastName")}
              onChange={(value) => updateContactField("lastName", value)}
            />
            <Field
              autoComplete="email"
              error={fieldErrors["contact.email"]}
              field="contact.email"
              inputMode="email"
              label="Email"
              type="email"
              value={contact.email}
              warning={fieldWarnings["contact.email"]}
              onBlur={() => {
                normalizeField("contact.email")
                validateField("contact.email")
              }}
              onChange={(value) => updateContactField("email", value)}
            />
            <Field
              autoComplete="tel"
              error={fieldErrors["contact.phone"]}
              field="contact.phone"
              inputMode="tel"
              label="Teléfono"
              type="tel"
              value={contact.phone}
              onBlur={() => {
                normalizeField("contact.phone")
                validateField("contact.phone")
              }}
              onChange={(value) => updateContactField("phone", value)}
            />
            <Field
              autoComplete="off"
              error={fieldErrors["contact.rut"]}
              field="contact.rut"
              label="RUT opcional"
              value={contact.rut ?? ""}
              onBlur={() => {
                normalizeField("contact.rut")
                validateField("contact.rut")
              }}
              onChange={(value) => updateContactField("rut", value)}
            />
          </div>
        </section>

        <section className="border border-border bg-surface p-5">
          <h2 className="font-serif text-2xl">{checkoutText.deliveryTitle}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DeliveryOption
              active={deliveryKind === "pickup"}
              title={checkoutText.pickupTitle}
              description={`${brandConfig.pickup.address}. ${brandConfig.pickup.schedule}.`}
              onClick={() => setDeliveryKind("pickup")}
            />
            <DeliveryOption
              active={deliveryKind === "shipping"}
              title={checkoutText.shippingTitle}
              description="Calculado por zona desde Medusa."
              onClick={() => setDeliveryKind("shipping")}
            />
          </div>

          {deliveryKind === "shipping" ? (
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="font-semibold">{checkoutText.addressTitle}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SelectField
                  autoComplete="address-level1"
                  error={fieldErrors["address.regionCode"]}
                  field="address.regionCode"
                  label="Región"
                  value={address.regionCode}
                  options={checkoutConfig.delivery.shipping.regions.map((region) => ({
                    label: region.name,
                    value: region.code,
                  }))}
                  onBlur={() => validateField("address.regionCode")}
                  onChange={(value) => updateAddressField("regionCode", value)}
                />
                <SelectField
                  autoComplete="address-level2"
                  error={fieldErrors["address.city"]}
                  field="address.city"
                  label="Comuna"
                  value={address.city}
                  options={communes.map((commune) => ({
                    label: commune,
                    value: commune,
                  }))}
                  onBlur={() => validateField("address.city")}
                  onChange={(value) => updateAddressField("city", value)}
                />
                <Field
                  autoComplete="address-line1"
                  error={fieldErrors["address.address1"]}
                  field="address.address1"
                  label="Calle"
                  value={address.address1}
                  onBlur={() => validateField("address.address1")}
                  onChange={(value) => updateAddressField("address1", value)}
                />
                <Field
                  autoComplete="address-line2"
                  error={fieldErrors["address.number"]}
                  field="address.number"
                  label="Número"
                  value={address.number}
                  onBlur={() => validateField("address.number")}
                  onChange={(value) => updateAddressField("number", value)}
                />
                <Field
                  autoComplete="address-line3"
                  error={fieldErrors["address.apartment"]}
                  field="address.apartment"
                  label="Depto/casa"
                  value={address.apartment ?? ""}
                  onBlur={() => validateField("address.apartment")}
                  onChange={(value) => updateAddressField("apartment", value)}
                />
                <Field
                  autoComplete="off"
                  error={fieldErrors["address.notes"]}
                  field="address.notes"
                  label="Referencias"
                  value={address.notes ?? ""}
                  onBlur={() => validateField("address.notes")}
                  onChange={(value) => updateAddressField("notes", value)}
                />
              </div>
              {!coverage.covered ? (
                <p className="mt-4 border border-border bg-background p-3 text-sm font-semibold text-primary">
                  {coverage.reason}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="border border-border bg-surface p-5">
          <h2 className="font-serif text-2xl">{checkoutText.discountTitle}</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="h-11 flex-1 border border-border bg-background px-3 text-base outline-none focus-visible:border-primary"
              autoComplete="off"
              value={discountCode}
              onChange={(event) => setDiscountCode(event.target.value)}
            />
            {activePromotion ? (
              <button
                className="h-11 bg-foreground px-5 text-sm font-semibold text-background"
                type="button"
                onClick={removePromotion}
              >
                {checkoutText.removeCode}
              </button>
            ) : (
              <button
                className="h-11 bg-primary px-5 text-sm font-semibold text-primary-foreground"
                type="button"
                onClick={applyPromotion}
              >
                {checkoutText.applyCode}
              </button>
            )}
          </div>
        </section>
      </div>

      <aside className="h-max border border-border bg-surface p-5">
        <h2 className="font-serif text-2xl">{checkoutText.summaryTitle}</h2>
        <div className="mt-5 space-y-3 text-sm">
          <SummaryLine label={checkoutText.subtotal} value={formatClp(cart.subtotal)} />
          <SummaryLine
            label={
              cart.discountTotal > 0
                ? `${checkoutText.discount} (${cart.promotions
                    .map((promotion) => promotion.code)
                    .join(", ")})`
                : checkoutText.discount
            }
            value={
              cart.discountTotal > 0
                ? `-${formatClp(cart.discountTotal)}`
                : checkoutText.noDiscount
            }
          />
          <SummaryLine
            label={selectedShipping?.name ?? checkoutText.shipping}
            value={formatClp(cart.shippingTotal)}
          />
          <div className="border-t border-border pt-3">
            <SummaryLine label={checkoutText.total} value={formatClp(cart.total)} strong />
            <p className="mt-2 text-right text-sm text-muted">
              ({checkoutText.includedVat}: {formatClp(includedVat)})
            </p>
          </div>
        </div>
        {message ? <p className="mt-5 text-sm font-semibold text-primary">{message}</p> : null}
        <button
          className="mt-5 h-11 w-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          type="button"
          disabled={isPending}
          onClick={cart.email && cart.shippingMethods.length > 0 ? beginPayment : continueToSummary}
        >
          {isPending
            ? "Actualizando..."
            : cart.email && cart.shippingMethods.length > 0
              ? "Pagar"
              : checkoutText.readyToPay}
        </button>
        <p className="mt-3 text-sm leading-6 text-muted">{checkoutText.payLater}</p>
        <Link className="mt-4 inline-flex text-sm font-semibold text-muted" href="/carrito">
          {checkoutText.backToCart}
        </Link>
      </aside>
    </div>
  )
}

function Field({
  field,
  label,
  value,
  onChange,
  onBlur,
  autoComplete,
  error,
  warning,
  inputMode,
  type = "text",
}: {
  field: CheckoutFieldKey
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  autoComplete?: string
  error?: string
  warning?: string
  inputMode?: "email" | "tel" | "text"
  type?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <input
        id={getFieldId(field)}
        aria-invalid={error ? "true" : "false"}
        autoComplete={autoComplete}
        className="h-11 border border-border bg-background px-3 text-base font-normal outline-none focus-visible:border-primary"
        inputMode={inputMode}
        type={type}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldMessage error={error} warning={warning} />
    </label>
  )
}

function SelectField({
  field,
  label,
  value,
  options,
  onChange,
  onBlur,
  autoComplete,
  error,
}: {
  field: CheckoutFieldKey
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
  onBlur?: () => void
  autoComplete?: string
  error?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <select
        id={getFieldId(field)}
        aria-invalid={error ? "true" : "false"}
        autoComplete={autoComplete}
        className="h-11 border border-border bg-background px-3 text-base font-normal outline-none focus-visible:border-primary"
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessage error={error} />
    </label>
  )
}

function FieldMessage({ error, warning }: { error?: string; warning?: string }) {
  if (error) {
    return <span className="text-sm font-normal text-primary">{error}</span>
  }

  if (warning) {
    return <span className="text-sm font-normal text-muted">{warning}</span>
  }

  return null
}

function getFieldId(field: CheckoutFieldKey) {
  return `checkout-${field.replace(".", "-")}`
}

function DeliveryOption({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      className={`min-h-28 border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active ? "border-primary bg-background" : "border-border bg-surface"
      }`}
      type="button"
      onClick={onClick}
    >
      <span className="block font-semibold">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-muted">{description}</span>
    </button>
  )
}

function SummaryLine({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${strong ? "text-base font-bold" : ""}`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

