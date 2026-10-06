import Link from "next/link"
import { brandConfig } from "@config/brand.config"
import { CartLines } from "@/components/cart/cart-lines"
import { getCurrentCart } from "@/lib/current-cart"
import { formatClp } from "@/lib/format"
import { cartText } from "@/lib/cart-text"

export default async function CartPage() {
  const cart = await getCurrentCart()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-4xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <Link className="font-serif text-xl text-primary" href="/">
            {brandConfig.storeName}
          </Link>
          <Link className="text-sm font-semibold text-muted" href="/">
            {cartText.keepShopping}
          </Link>
        </header>

        <div className="py-8 sm:py-10">
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            {cartText.cartTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            {cartText.cartSubtitle}
          </p>
        </div>

        {cart && cart.items.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <CartLines items={cart.items} />
            <aside className="h-max border border-border bg-surface p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">{cartText.subtotal}</p>
                <p className="text-xl font-semibold">{formatClp(cart.subtotal)}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {cartText.subtotalHelp}
              </p>
              <Link
                className="mt-5 inline-flex h-11 w-full items-center justify-center bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href="/checkout"
              >
                Ir al checkout
              </Link>
            </aside>
          </div>
        ) : (
          <section className="border border-border bg-surface p-6">
            <h2 className="font-serif text-2xl">{cartText.emptyTitle}</h2>
            <p className="mt-3 max-w-xl leading-7 text-muted">
              {cartText.emptyDescription}
            </p>
            <Link
              className="mt-5 inline-flex h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              href="/"
            >
              {cartText.keepShopping}
            </Link>
          </section>
        )}
      </section>
    </main>
  )
}
