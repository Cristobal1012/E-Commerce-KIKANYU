import { cookies } from "next/headers"
import { cartCookieName, getCart } from "@/lib/cart"

export async function getCurrentCart() {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(cartCookieName)?.value

  if (!cartId) {
    return null
  }

  try {
    return await getCart(cartId)
  } catch {
    return null
  }
}
