"use client"

import Link from "next/link"
import { useState } from "react"
import type { StoreCart } from "@/lib/cart"
import { formatClp } from "@/lib/format"
import { cartText } from "@/lib/cart-text"
import { CartLines } from "@/components/cart/cart-lines"

type MiniCartProps = {
  initialCart: StoreCart | null
}

export function MiniCart({ initialCart }: MiniCartProps) {
  const [isOpen, setIsOpen] = useState(false)
  const itemCount = initialCart?.totalQuantity ?? 0

  return (
    <>
      <button
        aria-label={cartText.miniCartOpen}
        className="fixed bottom-5 right-5 z-20 h-14 min-w-14 border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {cartText.cartLink}
        <span className="ml-2 inline-flex min-w-6 justify-center border border-primary-foreground px-1">
          {itemCount}
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-30">
          <button
            aria-label={cartText.miniCartClose}
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background p-5 text-foreground shadow-xl">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <h2 className="font-serif text-2xl">{cartText.miniCartTitle}</h2>
              <button
                className="h-10 border border-border px-3 text-sm font-semibold transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                {cartText.miniCartClose}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              {initialCart && initialCart.items.length > 0 ? (
                <CartLines items={initialCart.items} />
              ) : (
                <div className="border border-border bg-surface p-5">
                  <h3 className="font-serif text-xl">{cartText.emptyTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {cartText.emptyDescription}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">{cartText.subtotal}</p>
                <p className="text-lg font-semibold">
                  {formatClp(initialCart?.subtotal ?? 0)}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                {cartText.subtotalHelp}
              </p>
              <Link
                className="mt-4 flex h-12 items-center justify-center bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href="/carrito"
                onClick={() => setIsOpen(false)}
              >
                {cartText.viewCart}
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}
