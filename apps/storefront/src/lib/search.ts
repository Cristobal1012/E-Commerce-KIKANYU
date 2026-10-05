import type { CatalogProduct } from "@/lib/catalog"

export type ProductSearchSuggestion = {
  id: string
  title: string
  handle: string
  familyName: string | null
}

export type ProductSearchAdapter = {
  search(products: CatalogProduct[], query: string): CatalogProduct[]
  suggest(
    products: CatalogProduct[],
    query: string,
    limit?: number
  ): ProductSearchSuggestion[]
}

export const nativeProductSearchAdapter: ProductSearchAdapter = {
  search(products, query) {
    const normalizedQuery = normalizeSearchText(query)

    if (!normalizedQuery) {
      return products
    }

    return products
      .map((product) => ({
        product,
        score: scoreProduct(product, normalizedQuery),
      }))
      .filter((result) => result.score > 0)
      .sort((current, next) => next.score - current.score)
      .map((result) => result.product)
  },

  suggest(products, query, limit = 6) {
    return this.search(products, query)
      .slice(0, limit)
      .map((product) => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        familyName: product.family?.name ?? null,
      }))
  },
}

export const productSearchAdapter: ProductSearchAdapter =
  nativeProductSearchAdapter

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CL")
    .trim()
    .replace(/\s+/g, " ")
}

function scoreProduct(product: CatalogProduct, normalizedQuery: string) {
  const fields = getSearchFields(product)
  const queryTokens = normalizedQuery.split(" ")

  return fields.reduce((score, field) => {
    if (field.value.includes(normalizedQuery)) {
      return score + field.weight * 4
    }

    const fieldTokens = field.value.split(" ")
    const matchingTokens = queryTokens.filter((queryToken) =>
      fieldTokens.some((fieldToken) => isTokenMatch(fieldToken, queryToken))
    )

    return score + matchingTokens.length * field.weight
  }, 0)
}

function getSearchFields(product: CatalogProduct) {
  const notes = [
    ...product.notes.salida,
    ...product.notes.corazon,
    ...product.notes.fondo,
  ].join(" ")

  return [
    { value: normalizeSearchText(product.title), weight: 6 },
    { value: normalizeSearchText(product.family?.name ?? ""), weight: 5 },
    { value: normalizeSearchText(notes), weight: 3 },
    { value: normalizeSearchText(product.description ?? ""), weight: 2 },
  ].filter((field) => field.value.length > 0)
}

function isTokenMatch(fieldToken: string, queryToken: string) {
  if (fieldToken.startsWith(queryToken) || fieldToken.includes(queryToken)) {
    return true
  }

  if (queryToken.length < 4) {
    return false
  }

  const maxDistance = queryToken.length > 6 ? 2 : 1

  return getEditDistance(fieldToken, queryToken) <= maxDistance
}

function getEditDistance(current: string, next: string) {
  const distances = Array.from({ length: current.length + 1 }, (_, index) => [
    index,
  ])

  for (let nextIndex = 1; nextIndex <= next.length; nextIndex += 1) {
    distances[0][nextIndex] = nextIndex
  }

  for (let currentIndex = 1; currentIndex <= current.length; currentIndex += 1) {
    for (let nextIndex = 1; nextIndex <= next.length; nextIndex += 1) {
      const cost = current[currentIndex - 1] === next[nextIndex - 1] ? 0 : 1

      distances[currentIndex][nextIndex] = Math.min(
        distances[currentIndex - 1][nextIndex] + 1,
        distances[currentIndex][nextIndex - 1] + 1,
        distances[currentIndex - 1][nextIndex - 1] + cost
      )
    }
  }

  return distances[current.length][next.length]
}
