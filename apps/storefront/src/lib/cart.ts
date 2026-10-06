import { getChileRegionId, medusaFetch } from "@/lib/medusa"

export const cartCookieName = "medusa_cart_id"

export type CartLineItem = {
  id: string
  title: string
  subtitle: string | null
  thumbnail: string | null
  quantity: number
  unitPrice: number
  subtotal: number
  variantId: string | null
  variantTitle: string | null
  productTitle: string | null
  productHandle: string | null
}

export type StoreCart = {
  id: string
  currencyCode: string
  regionId: string | null
  items: CartLineItem[]
  subtotal: number
  totalQuantity: number
}

type StoreCartResponse = {
  cart: StoreCartPayload
}

type StoreCartPayload = {
  id: string
  currency_code?: string | null
  region_id?: string | null
  subtotal?: number | null
  items?: StoreLineItemPayload[] | null
}

type StoreLineItemPayload = {
  id: string
  title: string
  subtitle?: string | null
  thumbnail?: string | null
  quantity: number
  unit_price?: number | null
  subtotal?: number | null
  variant_id?: string | null
  variant_title?: string | null
  product_title?: string | null
  product_handle?: string | null
  variant?: {
    id?: string | null
    title?: string | null
    product?: {
      title?: string | null
      handle?: string | null
      thumbnail?: string | null
    } | null
  } | null
}

const cartFields = [
  "id",
  "currency_code",
  "region_id",
  "subtotal",
  "*items",
  "*items.variant",
  "*items.variant.product",
].join(",")

export async function getCart(cartId: string) {
  const response = await medusaFetch<StoreCartResponse>(
    `/store/carts/${cartId}?fields=${cartFields}`,
    {
      cache: "no-store",
    }
  )

  return normalizeCart(response.cart)
}

export async function createCart() {
  const regionId = await getChileRegionId()
  const response = await medusaFetch<StoreCartResponse>("/store/carts", {
    method: "POST",
    body: JSON.stringify({
      region_id: regionId,
    }),
    cache: "no-store",
  })

  return normalizeCart(response.cart)
}

export async function addCartLineItem(input: {
  cartId: string
  variantId: string
  quantity: number
}) {
  const response = await medusaFetch<StoreCartResponse>(
    `/store/carts/${input.cartId}/line-items?fields=${cartFields}`,
    {
      method: "POST",
      body: JSON.stringify({
        variant_id: input.variantId,
        quantity: input.quantity,
      }),
      cache: "no-store",
    }
  )

  return normalizeCart(response.cart)
}

export async function updateCartLineItem(input: {
  cartId: string
  lineId: string
  quantity: number
}) {
  const response = await medusaFetch<StoreCartResponse>(
    `/store/carts/${input.cartId}/line-items/${input.lineId}?fields=${cartFields}`,
    {
      method: "POST",
      body: JSON.stringify({
        quantity: input.quantity,
      }),
      cache: "no-store",
    }
  )

  return normalizeCart(response.cart)
}

export async function deleteCartLineItem(input: {
  cartId: string
  lineId: string
}) {
  const response = await medusaFetch<StoreCartResponse>(
    `/store/carts/${input.cartId}/line-items/${input.lineId}?fields=${cartFields}`,
    {
      method: "DELETE",
      cache: "no-store",
    }
  )

  return normalizeCart(response.cart)
}

export function calculateCartSubtotal(items: Pick<CartLineItem, "subtotal">[]) {
  return items.reduce((total, item) => total + item.subtotal, 0)
}

export function getQuantityChange(currentQuantity: number, change: -1 | 1) {
  return Math.max(1, currentQuantity + change)
}

function normalizeCart(cart: StoreCartPayload): StoreCart {
  const items = (cart.items ?? []).map(normalizeLineItem)

  return {
    id: cart.id,
    currencyCode: cart.currency_code ?? "clp",
    regionId: cart.region_id ?? null,
    items,
    subtotal: cart.subtotal ?? calculateCartSubtotal(items),
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
  }
}

function normalizeLineItem(item: StoreLineItemPayload): CartLineItem {
  const unitPrice = item.unit_price ?? 0
  const subtotal = item.subtotal ?? unitPrice * item.quantity

  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle ?? null,
    thumbnail: item.thumbnail ?? item.variant?.product?.thumbnail ?? null,
    quantity: item.quantity,
    unitPrice,
    subtotal,
    variantId: item.variant_id ?? item.variant?.id ?? null,
    variantTitle: item.variant_title ?? item.variant?.title ?? null,
    productTitle: item.product_title ?? item.variant?.product?.title ?? null,
    productHandle: item.product_handle ?? item.variant?.product?.handle ?? null,
  }
}
