"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { CartLineItem } from "@/lib/cart"
import { getQuantityChange } from "@/lib/cart"
import { cartText } from "@/lib/cart-text"
import {
  removeCartItemAction,
  updateCartItemQuantityAction,
} from "@/app/cart-actions"

type CartItemControlsProps = {
  item: CartLineItem
}

export function CartItemControls({ item }: CartItemControlsProps) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateQuantity(quantity: number) {
    setMessage(null)
    startTransition(async () => {
      const result = await updateCartItemQuantityAction({
        lineId: item.id,
        quantity,
      })

      if (!result.ok) {
        setMessage(result.message)
      }

      router.refresh()
    })
  }

  function removeItem() {
    setMessage(null)
    startTransition(async () => {
      const result = await removeCartItemAction({
        lineId: item.id,
      })

      if (!result.ok) {
        setMessage(result.message)
      }

      router.refresh()
    })
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <button
          aria-label={cartText.decrease}
          className="grid h-10 w-10 place-items-center border border-border bg-surface text-lg transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          disabled={isPending || item.quantity <= 1}
          onClick={() => updateQuantity(getQuantityChange(item.quantity, -1))}
          type="button"
        >
          -
        </button>
        <span className="grid h-10 min-w-12 place-items-center border border-border px-3 text-sm font-semibold">
          {item.quantity}
        </span>
        <button
          aria-label={cartText.increase}
          className="grid h-10 w-10 place-items-center border border-border bg-surface text-lg transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          disabled={isPending}
          onClick={() => updateQuantity(getQuantityChange(item.quantity, 1))}
          type="button"
        >
          +
        </button>
        <button
          className="ml-auto h-10 border border-border px-3 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          disabled={isPending}
          onClick={removeItem}
          type="button"
        >
          {cartText.remove}
        </button>
      </div>
      {message ? (
        <p className="mt-2 border border-border bg-surface p-2 text-sm text-muted">
          {message}
        </p>
      ) : null}
    </div>
  )
}
