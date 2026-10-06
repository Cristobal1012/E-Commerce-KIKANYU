import Link from "next/link"
import { brandConfig } from "@config/brand.config"
import { CheckoutClient } from "@/app/checkout/checkout-client"
import { checkoutText } from "@/lib/checkout-text"
import { getCurrentCart } from "@/lib/current-cart"

export default async function CheckoutPage() {
  const cart = await getCurrentCart()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-5xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <Link className="font-serif text-xl text-primary" href="/">
            {brandConfig.storeName}
          </Link>
          <Link className="text-sm font-semibold text-muted" href="/carrito">
            {checkoutText.backToCart}
          </Link>
        </header>

        <div className="py-8 sm:py-10">
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            {checkoutText.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            {checkoutText.subtitle}
          </p>
        </div>

        {cart && cart.items.length > 0 ? (
          <CheckoutClient initialCart={cart} />
        ) : (
          <section className="border border-border bg-surface p-6">
            <h2 className="font-serif text-2xl">{checkoutText.emptyTitle}</h2>
            <p className="mt-3 max-w-xl leading-7 text-muted">
              {checkoutText.emptyDescription}
            </p>
            <Link
              className="mt-5 inline-flex h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              href="/"
            >
              Volver al catálogo
            </Link>
          </section>
        )}
      </section>
    </main>
  )
}
