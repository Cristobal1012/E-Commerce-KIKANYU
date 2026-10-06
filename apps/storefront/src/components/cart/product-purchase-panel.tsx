"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { CatalogProduct, CatalogVariant } from "@/lib/catalog"
import { formatClp } from "@/lib/format"
import { cartText } from "@/lib/cart-text"
import { addToCartAction } from "@/app/cart-actions"

type ProductPurchasePanelProps = {
  product: CatalogProduct
}

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const router = useRouter()
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0]?.id ?? ""
  )
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const selectedVariant = useMemo(
    () =>
      product.variants.find((variant) => variant.id === selectedVariantId) ??
      product.variants[0] ??
      null,
    [product.variants, selectedVariantId]
  )
  const isInStock = selectedVariant ? getVariantInStock(selectedVariant) : false

  function handleAddToCart() {
    if (!selectedVariant) {
      return
    }

    setMessage(null)
    startTransition(async () => {
      const result = await addToCartAction({
        variantId: selectedVariant.id,
        quantity: 1,
      })

      setMessage(result.message)
      router.refresh()
    })
  }

  return (
    <section className="mt-8 border-y border-border py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase text-muted">
            {cartText.productVariantLabel}
          </h2>
          {selectedVariant ? (
            <p className="mt-2 text-2xl font-semibold">
              {selectedVariant.price
                ? formatClp(selectedVariant.price)
                : cartText.priceUnavailable}
            </p>
          ) : null}
        </div>
        {selectedVariant ? (
          <p
            className={[
              "border px-3 py-2 text-sm font-semibold",
              isInStock
                ? "border-primary text-primary"
                : "border-border text-muted",
            ].join(" ")}
          >
            {getStockLabel(selectedVariant)}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {product.variants.map((variant) => (
          <button
            aria-pressed={variant.id === selectedVariant?.id}
            className={[
              "min-h-16 border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              variant.id === selectedVariant?.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:border-primary",
            ].join(" ")}
            key={variant.id}
            onClick={() => {
              setSelectedVariantId(variant.id)
              setMessage(null)
            }}
            type="button"
          >
            <span className="block font-semibold">{variant.title}</span>
            <span
              className={[
                "mt-2 block text-sm",
                variant.id === selectedVariant?.id
                  ? "text-primary-foreground"
                  : "text-muted",
              ].join(" ")}
            >
              {variant.price ? formatClp(variant.price) : cartText.priceUnavailable}
            </span>
          </button>
        ))}
      </div>

      <button
        className="mt-5 h-12 w-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        disabled={!selectedVariant || isPending}
        onClick={handleAddToCart}
        type="button"
      >
        {isPending ? cartText.addingToCart : cartText.addToCart}
      </button>

      {message ? (
        <p className="mt-3 border border-border bg-surface p-3 text-sm text-muted">
          {message}
        </p>
      ) : null}
    </section>
  )
}

function getVariantInStock(variant: CatalogVariant) {
  if (!variant.manageInventory) {
    return true
  }

  return (variant.inventoryQuantity ?? 0) > 0
}

function getStockLabel(variant: CatalogVariant) {
  if (!variant.manageInventory) {
    return cartText.stockUnknown
  }

  return getVariantInStock(variant)
    ? cartText.stockAvailable
    : cartText.stockUnavailable
}
