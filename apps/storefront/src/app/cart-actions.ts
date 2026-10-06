"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import {
  addCartLineItem,
  cartCookieName,
  createCart,
  deleteCartLineItem,
  getCart,
  updateCartLineItem,
  type StoreCart,
} from "@/lib/cart"

export type CartActionState = {
  ok: boolean
  cart: StoreCart | null
  message: string
}

const genericStockMessage =
  "No se pudo actualizar el carrito. Revisa el stock disponible e intentalo nuevamente."

export async function addToCartAction(input: {
  variantId: string
  quantity?: number
}): Promise<CartActionState> {
  try {
    const cart = await getOrCreateCart()
    const updatedCart = await addCartLineItem({
      cartId: cart.id,
      variantId: input.variantId,
      quantity: input.quantity ?? 1,
    })

    await persistCartCookie(updatedCart.id)
    revalidateCartPaths()

    return {
      ok: true,
      cart: updatedCart,
      message: "Producto agregado al carrito.",
    }
  } catch (error) {
    return getCartActionError(error)
  }
}

export async function updateCartItemQuantityAction(input: {
  lineId: string
  quantity: number
}): Promise<CartActionState> {
  try {
    const cart = await getExistingCart()

    if (!cart) {
      return {
        ok: false,
        cart: null,
        message: "No encontramos un carrito activo.",
      }
    }

    const updatedCart = await updateCartLineItem({
      cartId: cart.id,
      lineId: input.lineId,
      quantity: input.quantity,
    })

    revalidateCartPaths()

    return {
      ok: true,
      cart: updatedCart,
      message: "Cantidad actualizada.",
    }
  } catch (error) {
    return getCartActionError(error)
  }
}

export async function removeCartItemAction(input: {
  lineId: string
}): Promise<CartActionState> {
  try {
    const cart = await getExistingCart()

    if (!cart) {
      return {
        ok: false,
        cart: null,
        message: "No encontramos un carrito activo.",
      }
    }

    const updatedCart = await deleteCartLineItem({
      cartId: cart.id,
      lineId: input.lineId,
    })

    revalidateCartPaths()

    return {
      ok: true,
      cart: updatedCart,
      message: "Producto quitado del carrito.",
    }
  } catch (error) {
    return getCartActionError(error)
  }
}

async function getExistingCart() {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(cartCookieName)?.value

  if (!cartId) {
    return null
  }

  try {
    return await getCart(cartId)
  } catch {
    cookieStore.delete(cartCookieName)
    return null
  }
}

async function getOrCreateCart() {
  const existingCart = await getExistingCart()

  if (existingCart) {
    return existingCart
  }

  const cart = await createCart()
  await persistCartCookie(cart.id)

  return cart
}

async function persistCartCookie(cartId: string) {
  const cookieStore = await cookies()

  cookieStore.set(cartCookieName, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

function revalidateCartPaths() {
  revalidatePath("/")
  revalidatePath("/carrito")
  revalidatePath("/productos/[handle]", "page")
}

function getCartActionError(error: unknown): CartActionState {
  const message = error instanceof Error ? error.message : genericStockMessage

  return {
    ok: false,
    cart: null,
    message: normalizeCartErrorMessage(message),
  }
}

function normalizeCartErrorMessage(message: string) {
  const normalizedMessage = message.toLocaleLowerCase("es-CL")

  if (
    normalizedMessage.includes("stock") ||
    normalizedMessage.includes("inventory") ||
    normalizedMessage.includes("quantity") ||
    normalizedMessage.includes("available")
  ) {
    return "No hay stock suficiente para esa cantidad."
  }

  return message || genericStockMessage
}
