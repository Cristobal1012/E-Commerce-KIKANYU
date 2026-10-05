import { productSearchAdapter } from "@/lib/search"

export type CatalogFamily = {
  id: string
  name: string
  handle: string
  description: string
  rank: number | null
  count: number
}

export type CatalogVariant = {
  id: string
  title: string
  price: number | null
}

export type CatalogProduct = {
  id: string
  title: string
  handle: string
  subtitle: string | null
  description: string | null
  thumbnail: string | null
  createdAt: string | null
  family: Pick<CatalogFamily, "id" | "name" | "handle"> | null
  variants: CatalogVariant[]
  notes: {
    salida: string[]
    corazon: string[]
    fondo: string[]
  }
  isSample: boolean
}

type StoreProductCategory = {
  id: string
  name: string
  handle: string
  description: string
  rank: number | null
}

type StoreProductVariant = {
  id: string
  title: string | null
  calculated_price?: {
    calculated_amount: number | null
  }
}

type StoreProduct = {
  id: string
  title: string
  handle: string
  subtitle: string | null
  description: string | null
  thumbnail: string | null
  created_at: string | null
  categories?: StoreProductCategory[] | null
  variants: StoreProductVariant[] | null
  metadata?: Record<string, unknown> | null
}

type StoreProductListResponse = {
  products: StoreProduct[]
}

type StoreCategoryListResponse = {
  product_categories: StoreProductCategory[]
}

type StoreRegion = {
  id: string
  countries?: {
    iso_2: string
  }[]
}

type StoreRegionListResponse = {
  regions: StoreRegion[]
}

type CatalogSort = "newest" | "name" | "price"

const backendUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

const catalogFields = [
  "*variants.calculated_price",
  "*categories",
  "+metadata",
  "+variants.manage_inventory",
  "+variants.allow_backorder",
].join(",")

const categoryFields = ["id", "name", "handle", "description", "rank"].join(",")

export async function getCatalogPageData(params: {
  familyHandles: string[]
  query: string
  sort: CatalogSort
}) {
  const regionId = await getChileRegionId()
  const [families, products] = await Promise.all([
    getFamilies(),
    getProducts(regionId),
  ])

  const selectedFamilyIds = families
    .filter((family) => params.familyHandles.includes(family.handle))
    .map((family) => family.id)

  const familyFilteredProducts =
    selectedFamilyIds.length === 0
      ? products
      : products.filter((product) =>
          product.family ? selectedFamilyIds.includes(product.family.id) : false
        )
  const filteredProducts = productSearchAdapter.search(
    familyFilteredProducts,
    params.query
  )

  return {
    families: addFamilyCounts(families, products),
    products: sortProducts(filteredProducts, params.sort),
    searchProducts: sortProducts(familyFilteredProducts, params.sort),
  }
}

export async function getProductByHandle(handle: string) {
  const regionId = await getChileRegionId()
  const searchParams = new URLSearchParams({
    handle,
    region_id: regionId,
    fields: catalogFields,
    limit: "1",
  })

  const response = await medusaFetch<StoreProductListResponse>(
    `/store/products?${searchParams.toString()}`
  )

  const product = response.products[0]

  return product ? normalizeProduct(product) : null
}

export function parseFamiliesParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value.join(",") : value

  return rawValue
    ? rawValue
        .split(",")
        .map((family) => family.trim())
        .filter(Boolean)
    : []
}

export function parseSortParam(value: string | string[] | undefined): CatalogSort {
  const rawValue = Array.isArray(value) ? value[0] : value

  if (rawValue === "name" || rawValue === "price") {
    return rawValue
  }

  return "newest"
}

export function parseSearchParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value

  return rawValue?.trim() ?? ""
}

async function getFamilies(): Promise<CatalogFamily[]> {
  const searchParams = new URLSearchParams({
    fields: categoryFields,
    limit: "50",
  })

  const response = await medusaFetch<StoreCategoryListResponse>(
    `/store/product-categories?${searchParams.toString()}`
  )

  return response.product_categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      handle: category.handle,
      description: category.description,
      rank: category.rank,
      count: 0,
    }))
    .sort((current, next) => (current.rank ?? 0) - (next.rank ?? 0))
}

async function getProducts(regionId: string): Promise<CatalogProduct[]> {
  const searchParams = new URLSearchParams({
    region_id: regionId,
    fields: catalogFields,
    limit: "100",
  })

  const response = await medusaFetch<StoreProductListResponse>(
    `/store/products?${searchParams.toString()}`
  )

  return response.products.map(normalizeProduct)
}

async function getChileRegionId() {
  const response = await medusaFetch<StoreRegionListResponse>("/store/regions")
  const region = response.regions.find((item) =>
    item.countries?.some((country) => country.iso_2 === "cl")
  )

  if (!region) {
    throw new Error("Medusa region for Chile is not configured")
  }

  return region.id
}

async function medusaFetch<TResponse>(path: string): Promise<TResponse> {
  const headers: HeadersInit = {}

  if (publishableKey) {
    headers["x-publishable-api-key"] = publishableKey
  }

  const response = await fetch(`${backendUrl}${path}`, {
    headers,
    next: {
      revalidate: 60,
    },
  })

  if (!response.ok) {
    throw new Error(`Medusa request failed with status ${response.status}`)
  }

  return response.json() as Promise<TResponse>
}

function normalizeProduct(product: StoreProduct): CatalogProduct {
  const family = product.categories?.[0] ?? null
  const metadata = product.metadata ?? {}

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    subtitle: product.subtitle,
    description: product.description,
    thumbnail: product.thumbnail,
    createdAt: product.created_at,
    family: family
      ? {
          id: family.id,
          name: family.name,
          handle: family.handle,
        }
      : null,
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id,
      title: variant.title ?? "Variante",
      price: variant.calculated_price?.calculated_amount ?? null,
    })),
    notes: readNotes(metadata.notes),
    isSample: metadata.sample_data === true,
  }
}

function readNotes(value: unknown) {
  if (!isNotes(value)) {
    return {
      salida: [],
      corazon: [],
      fondo: [],
    }
  }

  return value
}

function isNotes(value: unknown): value is CatalogProduct["notes"] {
  if (!value || typeof value !== "object") {
    return false
  }

  const notes = value as Record<string, unknown>

  return (
    Array.isArray(notes.salida) &&
    Array.isArray(notes.corazon) &&
    Array.isArray(notes.fondo) &&
    notes.salida.every((note) => typeof note === "string") &&
    notes.corazon.every((note) => typeof note === "string") &&
    notes.fondo.every((note) => typeof note === "string")
  )
}

function addFamilyCounts(families: CatalogFamily[], products: CatalogProduct[]) {
  return families.map((family) => ({
    ...family,
    count: products.filter((product) => product.family?.id === family.id).length,
  }))
}

function sortProducts(products: CatalogProduct[], sort: CatalogSort) {
  return [...products].sort((current, next) => {
    if (sort === "name") {
      return current.title.localeCompare(next.title, "es-CL")
    }

    if (sort === "price") {
      return getLowestPrice(current) - getLowestPrice(next)
    }

    return getTimestamp(next.createdAt) - getTimestamp(current.createdAt)
  })
}

function getLowestPrice(product: CatalogProduct) {
  const prices = product.variants
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === "number")

  return prices.length > 0 ? Math.min(...prices) : Number.MAX_SAFE_INTEGER
}

function getTimestamp(value: string | null) {
  return value ? new Date(value).getTime() : 0
}
