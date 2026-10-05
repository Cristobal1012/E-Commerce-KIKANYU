import Image from "next/image"
import Link from "next/link"
import { brandConfig } from "@config/brand.config"
import type { CatalogProduct } from "@/lib/catalog"
import { catalogText } from "@/lib/catalog-text"
import { formatClp } from "@/lib/format"

type ProductDetailProps = {
  product: CatalogProduct
}

export function ProductDetail({ product }: ProductDetailProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto w-full max-w-6xl px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <Link className="font-serif text-xl text-primary" href="/">
            {brandConfig.storeName}
          </Link>
          <Link className="text-sm font-semibold text-muted" href="/">
            {catalogText.productDetailBack}
          </Link>
        </header>

        <article className="grid gap-8 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-12">
          <div className="relative aspect-[4/3] overflow-hidden bg-surface">
            {product.thumbnail ? (
              <Image
                alt={`${product.title} - ${catalogText.noImageAlt}`}
                className="object-cover"
                fill
                priority
                sizes="(min-width: 1024px) 46vw, 90vw"
                src={product.thumbnail}
              />
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-primary">
              {product.family?.name ?? catalogText.sampleBadge}
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
              {product.title}
            </h1>
            {product.isSample ? (
              <p className="mt-4 inline-flex border border-border px-3 py-2 text-sm text-muted">
                {catalogText.sampleBadge}
              </p>
            ) : null}
            <p className="mt-5 text-base leading-8 text-muted">
              {product.description}
            </p>

            <section className="mt-8 border-y border-border py-5">
              <h2 className="text-sm font-semibold uppercase text-muted">
                {catalogText.variantsTitle}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {product.variants.map((variant) => (
                  <div className="border border-border bg-surface p-4" key={variant.id}>
                    <p className="font-semibold">{variant.title}</p>
                    <p className="mt-2 text-sm text-muted">
                      {variant.price
                        ? formatClp(variant.price)
                        : "Precio por configurar"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase text-muted">
                {catalogText.notesTitle}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <NoteList title={catalogText.notesTop} notes={product.notes.salida} />
                <NoteList
                  title={catalogText.notesHeart}
                  notes={product.notes.corazon}
                />
                <NoteList title={catalogText.notesBase} notes={product.notes.fondo} />
              </div>
            </section>
          </div>
        </article>
      </section>
    </main>
  )
}

function NoteList({ notes, title }: { notes: string[]; title: string }) {
  return (
    <div className="border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {notes.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">Dato por completar</p>
      )}
    </div>
  )
}
