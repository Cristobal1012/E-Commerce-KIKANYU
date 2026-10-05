"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useMemo, useState, useTransition } from "react"
import type { CatalogProduct } from "@/lib/catalog"
import { catalogText } from "@/lib/catalog-text"
import { productSearchAdapter } from "@/lib/search"

type SearchBoxProps = {
  products: CatalogProduct[]
  query: string
  selectedFamilies: string[]
  sort: "newest" | "name" | "price"
}

export function SearchBox({
  products,
  query,
  selectedFamilies,
  sort,
}: SearchBoxProps) {
  const router = useRouter()
  const [value, setValue] = useState(query)
  const [isPending, startTransition] = useTransition()
  const trimmedValue = value.trim()
  const suggestions = useMemo(
    () => productSearchAdapter.suggest(products, value),
    [products, value]
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(() => {
      router.push(buildCatalogHref(selectedFamilies, sort, trimmedValue))
    })
  }

  return (
    <section className="relative" aria-label={catalogText.searchLabel}>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="catalog-search">
          {catalogText.searchLabel}
        </label>
        <input
          autoComplete="off"
          className="h-12 min-w-0 flex-1 border border-border bg-surface px-4 text-base outline-none transition-colors placeholder:text-muted focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          id="catalog-search"
          name="q"
          onChange={(event) => setValue(event.target.value)}
          placeholder={catalogText.searchPlaceholder}
          type="search"
          value={value}
        />
        <button
          className="h-12 border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? catalogText.searchLoading : catalogText.searchSubmit}
        </button>
      </form>

      {trimmedValue ? (
        <div className="absolute z-10 mt-2 w-full border border-border bg-surface shadow-lg">
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <Link
                    className="block px-4 py-3 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
                    href={`/productos/${suggestion.handle}`}
                  >
                    <span className="block text-sm font-semibold">
                      {suggestion.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {suggestion.familyName ?? catalogText.searchNoFamily}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-muted">
              {catalogText.searchNoSuggestions}
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
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

  if (query) {
    params.set("q", query)
  }

  const queryString = params.toString()

  return queryString ? `/?${queryString}` : "/"
}
