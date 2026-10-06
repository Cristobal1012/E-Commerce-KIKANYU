import Image from "next/image"
import Link from "next/link"
import type { CartLineItem } from "@/lib/cart"
import { formatClp } from "@/lib/format"
import { CartItemControls } from "@/components/cart/cart-item-controls"

type CartLinesProps = {
  items: CartLineItem[]
}

export function CartLines({ items }: CartLinesProps) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <li className="grid grid-cols-[84px_1fr] gap-4 py-4" key={item.id}>
          <div className="relative aspect-square overflow-hidden bg-surface">
            {item.thumbnail ? (
              <Image
                alt={item.title}
                className="object-cover"
                fill
                sizes="84px"
                src={item.thumbnail}
              />
            ) : null}
          </div>
          <div className="min-w-0">
            {item.productHandle ? (
              <Link
                className="font-semibold transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href={`/productos/${item.productHandle}`}
              >
                {item.productTitle ?? item.title}
              </Link>
            ) : (
              <p className="font-semibold">{item.productTitle ?? item.title}</p>
            )}
            <p className="mt-1 text-sm text-muted">
              {item.variantTitle ?? item.subtitle}
            </p>
            <p className="mt-2 text-sm font-semibold">{formatClp(item.subtotal)}</p>
            <CartItemControls item={item} />
          </div>
        </li>
      ))}
    </ul>
  )
}
