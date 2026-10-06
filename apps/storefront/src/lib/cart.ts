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
  discountTotal: number
  shippingTotal: number
  total: number
  promotions: CartPromotion[]
  shippingMethods: CartShippingMethod[]
  email: string | null
  totalQuantity: number
}

export type CartPromotion = {
  id: string
  code: string
}

export type CartShippingMethod = {
  id: string
  name: string
  amount: number
  total: number
  shippingOptionId: string | null
}

export type StoreShippingOption = {
  id: string
  name: string
  code: string | null
  amount: number | null
  metadata: Record<string, unknown> | null
}

type StoreCartResponse = {
  cart: StoreCartPayload
}

type StoreCartPayload = {
  id: string
  currency_code?: string | null
  region_id?: string | null
  subtotal?: number | null
  discount_total?: number | null
  shipping_total?: number | null
  total?: number | null
  promotions?: StorePromotionPayload[] | null
  shipping_methods?: StoreShippingMethodPayload[] | null
  email?: string | null
  items?: StoreLineItemPayload[] | null
}

type StorePromotionPayload = {
  id: string
  code?: string | null
}

type StoreShippingMethodPayload = {
  id: string
  name?: string | null
  amount?: number | null
  total?: number | null
  shipping_option_id?: string | null
}

type StoreShippingOptionPayload = {
  id: string
  name?: string | null
  amount?: number | null
  calculated_price?: {
    calculated_amount?: number | null
  } | null
  metadata?: Record<string, unknown> | null
  type?: {
    code?: string | null
  } | null
}

type StoreShippingOptionsResponse = {
  shipping_options: StoreShippingOptionPayload[]
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
  "email",
  "subtotal",
  "discount_total",
  "shipping_total",
  "total",
  "promotions.id",
  "promotions.code",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.amount",
  "shipping_methods.total",
  "shipping_methods.shipping_option_id",
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

export async function updateCart(input: {
  cartId: string
  email?: string
  shippingAddress?: {
    firstName: string
    lastName: string
    phone: string
    address1?: string
    address2?: string
    city?: string
    province?: string
    metadata?: Record<string, unknown>
  }
}) {
  const response = await medusaFetch<StoreCartResponse>(
    `/store/carts/${input.cartId}?fields=${cartFields}`,
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        shipping_address: input.shippingAddress
          ? {
              first_name: input.shippingAddress.firstName,
              last_name: input.shippingAddress.lastName,
              phone: input.shippingAddress.phone,
              address_1: input.shippingAddress.address1,
              address_2: input.shippingAddress.address2,
              city: input.shippingAddress.city,
              province: input.shippingAddress.province,
              country_code: "cl",
              metadata: input.shippingAddress.metadata,
            }
          : undefined,
      }),
      cache: "no-store",
    }
  )

  return normalizeCart(response.cart)
}

export async function listCartShippingOptions(cartId: string) {
  const fields = ["id", "name", "amount", "calculated_price", "metadata", "type"].join(",")
  const response = await medusaFetch<StoreShippingOptionsResponse>(
    `/store/shipping-options?cart_id=${cartId}&fields=${fields}`,
    {
      cache: "no-store",
    }
  )

  return response.shipping_options.map((option) => ({
    id: option.id,
    name: option.name ?? "Opción de entrega",
    code: option.type?.code ?? null,
    amount: option.calculated_price?.calculated_amount ?? option.amount ?? null,
    metadata: option.metadata ?? null,
  }))
}

export async function setCartShippingMethod(input: {
  cartId: string
  optionId: string
  data?: Record<string, unknown>
}) {
  const response = await medusaFetch<StoreCartResponse>(
    `/store/carts/${input.cartId}/shipping-methods?fields=${cartFields}`,
    {
      method: "POST",
      body: JSON.stringify({
        option_id: input.optionId,
        data: input.data,
      }),
      cache: "no-store",
    }
  )

  return normalizeCart(response.cart)
}

export async function addCartPromotion(input: {
  cartId: string
  code: string
}) {
  const response = await medusaFetch<StoreCartResponse>(
    `/store/carts/${input.cartId}/promotions?fields=${cartFields}`,
    {
      method: "POST",
      body: JSON.stringify({
        promo_codes: [input.code],
      }),
      cache: "no-store",
    }
  )

  return normalizeCart(response.cart)
}

export async function removeCartPromotion(input: {
  cartId: string
  code: string
}) {
  const response = await medusaFetch<StoreCartResponse>(
    `/store/carts/${input.cartId}/promotions?fields=${cartFields}`,
    {
      method: "DELETE",
      body: JSON.stringify({
        promo_codes: [input.code],
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
    discountTotal: cart.discount_total ?? 0,
    shippingTotal: cart.shipping_total ?? 0,
    total: cart.total ?? cart.subtotal ?? calculateCartSubtotal(items),
    promotions: (cart.promotions ?? []).map((promotion) => ({
      id: promotion.id,
      code: promotion.code ?? "",
    })),
    shippingMethods: (cart.shipping_methods ?? []).map((method) => ({
      id: method.id,
      name: method.name ?? "Entrega",
      amount: method.amount ?? 0,
      total: method.total ?? method.amount ?? 0,
      shippingOptionId: method.shipping_option_id ?? null,
    })),
    email: cart.email ?? null,
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
