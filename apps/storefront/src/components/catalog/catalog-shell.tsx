import Image from "next/image"
import Link from "next/link"
import { brandConfig } from "@config/brand.config"
import type { CatalogFamily, CatalogProduct } from "@/lib/catalog"
import { catalogText } from "@/lib/catalog-text"
import { formatClp } from "@/lib/format"
import { SearchBox } from "@/components/catalog/search-box"

type CatalogShellProps = {
  families: CatalogFamily[]
  products: CatalogProduct[]
  searchProducts: CatalogProduct[]
  query: string
  selectedFamilies: string[]
  sort: "newest" | "name" | "price"
}

const sortOptions = [
  { label: catalogText.sortNewest, value: "newest" },
  { label: catalogText.sortName, value: "name" },
  { label: catalogText.sortPrice, value: "price" },
] as const

export function CatalogShell({
  families,
  products,
  searchProducts,
  query,
  selectedFamilies,
  sort,
}: CatalogShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <Link className="font-serif text-xl text-primary" href="/">
            {brandConfig.storeName}
          </Link>
          <p className="text-sm text-muted">{brandConfig.contact.instagram}</p>
        </header>

        <div className="py-8 sm:py-10">
          <p className="text-xs font-semibold uppercase text-primary">
            {catalogText.headerEyebrow}
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-[1fr_0.7fr] md:items-end">
            <div>
              <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
                {catalogText.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                {catalogText.description}
              </p>
            </div>
            <SortLinks
              query={query}
              selectedFamilies={selectedFamilies}
              sort={sort}
            />
          </div>
          <div className="mt-6">
            <SearchBox
              products={searchProducts}
              query={query}
              selectedFamilies={selectedFamilies}
              sort={sort}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <FamilyFilters
            families={families}
            query={query}
            selectedFamilies={selectedFamilies}
            sort={sort}
          />

          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <EmptyCatalog />
          )}
        </div>
      </section>
    </main>
  )
}

export function CatalogErrorState() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <section className="w-full max-w-xl border border-border bg-surface p-6">
        <p className="text-sm font-semibold text-primary">
          {catalogText.errorTitle}
        </p>
        <h1 className="mt-3 font-serif text-3xl">{brandConfig.storeName}</h1>
        <p className="mt-4 leading-7 text-muted">{catalogText.errorDescription}</p>
      </section>
    </main>
  )
}

function FamilyFilters({
  families,
  query,
  selectedFamilies,
  sort,
}: {
  families: CatalogFamily[]
  query: string
  selectedFamilies: string[]
  sort: "newest" | "name" | "price"
}) {
  return (
    <aside className="border-y border-border py-4 lg:border-y-0 lg:border-r lg:py-0 lg:pr-5">
      <h2 className="text-sm font-semibold">{catalogText.filtersTitle}</h2>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        <FilterLink
          active={selectedFamilies.length === 0}
          count={families.reduce((total, family) => total + family.count, 0)}
          href={buildCatalogHref([], sort, query)}
          label={catalogText.allFamilies}
        />
        {families.map((family) => {
          const nextFamilies = toggleFamily(selectedFamilies, family.handle)

          return (
            <FilterLink
              active={selectedFamilies.includes(family.handle)}
              count={family.count}
              href={buildCatalogHref(nextFamilies, sort, query)}
              key={family.id}
              label={family.name}
            />
          )
        })}
      </div>
    </aside>
  )
}

function FilterLink({
  active,
  count,
  href,
  label,
}: {
  active: boolean
  count: number
  href: string
  label: string
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={[
        "flex h-11 min-w-max items-center justify-between gap-3 border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:w-full",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-foreground hover:border-primary",
      ].join(" ")}
      href={href}
    >
      <span>{label}</span>
      <span className={active ? "text-primary-foreground" : "text-muted"}>
        {count}
      </span>
    </Link>
  )
}

function SortLinks({
  query,
  selectedFamilies,
  sort,
}: {
  query?: string
  selectedFamilies: string[]
  sort: "newest" | "name" | "price"
}) {
  return (
    <nav
      aria-label={catalogText.sortLabel}
      className="flex flex-wrap gap-2 md:justify-end"
    >
      {sortOptions.map((option) => (
        <Link
          aria-current={sort === option.value ? "page" : undefined}
          className={[
            "h-10 border px-4 text-sm font-semibold leading-10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            sort === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-foreground hover:border-primary",
          ].join(" ")}
          href={buildCatalogHref(selectedFamilies, option.value, query ?? "")}
          key={option.value}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  )
}

function ProductGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <Link
          className="group border border-border bg-surface transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          href={`/productos/${product.handle}`}
          key={product.id}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-background">
            {product.thumbnail ? (
              <Image
                alt={`${product.title} - ${catalogText.noImageAlt}`}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                fill
                sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 90vw"
                src={product.thumbnail}
              />
            ) : null}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  {product.family?.name ?? catalogText.sampleBadge}
                </p>
                <h2 className="mt-2 text-lg font-semibold leading-snug">
                  {product.title}
                </h2>
              </div>
              {product.isSample ? (
                <span className="border border-border px-2 py-1 text-xs text-muted">
                  {catalogText.sampleBadge}
                </span>
              ) : null}
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
              {product.description}
            </p>
            <p className="mt-4 text-sm font-semibold">
              Desde {formatProductPrice(product)}
            </p>
          </div>
        </Link>
      ))}
    </section>
  )
}

function EmptyCatalog() {
  return (
    <section className="border border-border bg-surface p-6">
      <h2 className="font-serif text-2xl">{catalogText.emptyTitle}</h2>
      <p className="mt-3 max-w-xl leading-7 text-muted">
        {catalogText.emptyDescription}
      </p>
    </section>
  )
}

function toggleFamily(currentFamilies: string[], family: string) {
  return currentFamilies.includes(family)
    ? currentFamilies.filter((item) => item !== family)
    : [...currentFamilies, family]
}

function buildCatalogHref(
  families: string[],
  sort: "newest" | "name" | "price",
  query: string
) {
  const params = new URLSearchParams()

  if (families.length > 0) {
    params.set("familia", families.join(","))
  }

  if (sort !== "newest") {
    params.set("orden", sort)
  }

  if (query.trim()) {
    params.set("q", query.trim())
  }

  const queryString = params.toString()

  return queryString ? `/?${queryString}` : "/"
}

function formatProductPrice(product: CatalogProduct) {
  const prices = product.variants
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === "number")

  return prices.length > 0
    ? formatClp(Math.min(...prices))
    : "precio por configurar"
}
