import Link from "next/link"
import { brandConfig } from "@config/brand.config"
import { checkoutText } from "@/lib/checkout-text"
import { getCurrentCart } from "@/lib/current-cart"

type PaymentReturnPageProps = {
  params: Promise<{
    status: "success" | "pending" | "failure" | "canceled" | "expired"
  }>
}

const statusCopy = {
  success: {
    title: "Estamos confirmando tu pago",
    description:
      "Volviste desde Mercado Pago. Esperaremos la confirmación segura del webhook antes de marcar el pedido como pagado.",
  },
  pending: {
    title: "Tu pago está pendiente",
    description:
      "Mercado Pago todavía está procesando la operación. Te mostraremos el estado definitivo cuando el backend reciba la confirmación.",
  },
  failure: {
    title: "El pago no fue aprobado",
    description:
      "Puedes volver al checkout e intentarlo nuevamente con otro medio de pago.",
  },
  canceled: {
    title: "El pago fue cancelado",
    description:
      "La operación no se completó. Puedes volver al checkout e iniciar un nuevo pago.",
  },
  expired: {
    title: "La orden de pago venció",
    description:
      "El enlace de Mercado Pago ya no está disponible. Vuelve al checkout para generar una nueva orden.",
  },
}

export default async function PaymentReturnPage({ params }: PaymentReturnPageProps) {
  const { status } = await params
  const cart = await getCurrentCart()
  const copy = statusCopy[status] ?? statusCopy.pending
  const isConfirmed =
    Boolean(cart?.completedAt) &&
    ["authorized", "completed"].includes(cart?.paymentCollection?.status ?? "")

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-3xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <Link className="font-serif text-xl text-primary" href="/">
            {brandConfig.storeName}
          </Link>
          <Link className="text-sm font-semibold text-muted" href="/carrito">
            {checkoutText.backToCart}
          </Link>
        </header>

        <section className="mt-8 border border-border bg-surface p-6">
          <p className="text-sm font-semibold text-primary">Mercado Pago</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">
            {isConfirmed ? "Pago confirmado" : copy.title}
          </h1>
          <p className="mt-4 leading-7 text-muted">
            {isConfirmed
              ? "El backend ya recibió la confirmación segura y creó el pedido en Medusa."
              : copy.description}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-11 items-center justify-center bg-primary px-5 text-sm font-semibold text-primary-foreground"
              href={isConfirmed ? "/" : "/checkout"}
            >
              {isConfirmed ? "Volver al catálogo" : "Reintentar pago"}
            </Link>
            {!isConfirmed ? (
              <Link
                className="inline-flex h-11 items-center justify-center border border-border px-5 text-sm font-semibold"
                href="/checkout/pago/pending"
              >
                Revisar estado
              </Link>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  )
}
