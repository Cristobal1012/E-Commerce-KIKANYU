"use server"

import { revalidatePath } from "next/cache"
import { brandConfig } from "@config/brand.config"
import { checkoutConfig } from "@config/checkout.config"
import {
  addCartPromotion,
  getCart,
  listCartShippingOptions,
  removeCartPromotion,
  setCartShippingMethod,
  updateCart,
  updateCartLineItem,
  type StoreCart,
} from "@/lib/cart"
import { getCoverageForRegion } from "@/lib/checkout"
import {
  validateCheckoutForm,
  type CheckoutAddressInput,
  type CheckoutContactInput,
  type CheckoutFieldMessages,
  type DeliveryKind,
} from "@/lib/checkout-validation"
import { getCurrentCart } from "@/lib/current-cart"

export type CheckoutActionState = {
  ok: boolean
  cart: StoreCart | null
  message: string
  fieldErrors?: CheckoutFieldMessages
}

export async function validateCheckoutStockAction(): Promise<CheckoutActionState> {
  try {
    const cart = await getCurrentCart()

    if (!cart) {
      return {
        ok: false,
        cart: null,
        message: "No encontramos un carrito activo.",
      }
    }

    for (const item of cart.items) {
      await updateCartLineItem({
        cartId: cart.id,
        lineId: item.id,
        quantity: item.quantity,
      })
    }

    const refreshedCart = await getCart(cart.id)

    return {
      ok: true,
      cart: refreshedCart,
      message: "Stock validado.",
    }
  } catch {
    return {
      ok: false,
      cart: await getCurrentCart(),
      message:
        "Algunos productos ya no tienen stock suficiente. Ajusta el carrito antes de continuar.",
    }
  }
}

export async function updateCheckoutDeliveryAction(input: {
  contact: CheckoutContactInput
  deliveryKind: DeliveryKind
  address?: CheckoutAddressInput
}): Promise<CheckoutActionState> {
  try {
    const cart = await getCurrentCart()

    if (!cart) {
      return {
        ok: false,
        cart: null,
        message: "No encontramos un carrito activo.",
      }
    }

    const validation = validateCheckoutForm(input)

    if (!validation.success) {
      return {
        ok: false,
        cart,
        message: "Revisa los datos marcados antes de continuar.",
        fieldErrors: validation.error.issues.reduce<CheckoutFieldMessages>((errors, issue) => {
          const key = issue.path.join(".") as keyof CheckoutFieldMessages

          if (!errors[key]) {
            errors[key] = issue.message
          }

          return errors
        }, {}),
      }
    }

    const checkoutData = validation.data

    const fullName =
      `${checkoutData.contact.firstName} ${checkoutData.contact.lastName}`.trim()
    const cartWithAddress = await updateCart({
      cartId: cart.id,
      email: checkoutData.contact.email,
      shippingAddress:
        checkoutData.deliveryKind === "pickup"
          ? {
              firstName: checkoutData.contact.firstName,
              lastName: checkoutData.contact.lastName,
              phone: checkoutData.contact.phone,
              address1: brandConfig.pickup.address,
              city: "Retiro en tienda",
              province: "RM",
              metadata: {
                delivery_kind: "pickup",
                rut: checkoutData.contact.rut,
                pickup_schedule: brandConfig.pickup.schedule,
                TODO: "Cambiar punto de retiro desde configuracion/admin.",
              },
            }
          : buildShippingAddress(
              checkoutData.contact,
              checkoutData.address,
              checkoutData.contact.rut
            ),
    })

    const option = await getDeliveryOption(
      cartWithAddress.id,
      checkoutData.deliveryKind,
      checkoutData.address
    )
    const updatedCart = await setCartShippingMethod({
      cartId: cartWithAddress.id,
      optionId: option.id,
      data: {
        delivery_kind: checkoutData.deliveryKind,
        recipient: fullName,
        notes: checkoutData.address?.notes,
      },
    })

    revalidateCheckoutPaths()

    return {
      ok: true,
      cart: updatedCart,
      message: "Entrega actualizada.",
    }
  } catch (error) {
    return {
      ok: false,
      cart: await getCurrentCart(),
      message:
        error instanceof Error
          ? error.message
          : "No pudimos actualizar la entrega. Inténtalo nuevamente.",
    }
  }
}

export async function applyCheckoutPromotionAction(code: string): Promise<CheckoutActionState> {
  try {
    const cart = await getCurrentCart()

    if (!cart) {
      return {
        ok: false,
        cart: null,
        message: "No encontramos un carrito activo.",
      }
    }

    const updatedCart = await addCartPromotion({
      cartId: cart.id,
      code: code.trim().toUpperCase(),
    })

    revalidateCheckoutPaths()

    return {
      ok: true,
      cart: updatedCart,
      message: "Código aplicado.",
    }
  } catch (error) {
    return {
      ok: false,
      cart: await getCurrentCart(),
      message:
        error instanceof Error
          ? error.message
          : "No pudimos aplicar el código de descuento.",
    }
  }
}

export async function removeCheckoutPromotionAction(code: string): Promise<CheckoutActionState> {
  const cart = await getCurrentCart()

  if (!cart) {
    return {
      ok: false,
      cart: null,
      message: "No encontramos un carrito activo.",
    }
  }

  const updatedCart = await removeCartPromotion({
    cartId: cart.id,
    code,
  })

  revalidateCheckoutPaths()

  return {
    ok: true,
    cart: updatedCart,
    message: "Código quitado.",
  }
}

function buildShippingAddress(
  contact: CheckoutContactInput,
  address: CheckoutAddressInput | undefined,
  normalizedRut: string
) {
  if (!address) {
    throw new Error("Completa la dirección para calcular el despacho.")
  }

  const coverage = getCoverageForRegion(address.regionCode)

  if (!coverage.covered) {
    throw new Error(coverage.reason)
  }

  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
    address1: `${address.address1} ${address.number}`.trim(),
    address2: address.apartment,
    city: address.city,
    province: address.regionCode,
    metadata: {
      delivery_kind: "shipping",
      rut: normalizedRut,
      references: address.notes,
    },
  }
}

async function getDeliveryOption(
  cartId: string,
  deliveryKind: DeliveryKind,
  address: CheckoutAddressInput | undefined
) {
  if (deliveryKind === "shipping" && address) {
    const coverage = getCoverageForRegion(address.regionCode)

    if (!coverage.covered) {
      throw new Error(coverage.reason)
    }
  }

  const shippingOptions = await listCartShippingOptions(cartId)
  const expectedCode =
    deliveryKind === "pickup"
      ? checkoutConfig.delivery.pickup.optionCode
      : address?.regionCode === "RM"
        ? checkoutConfig.delivery.shipping.optionCodes.metropolitan
        : checkoutConfig.delivery.shipping.optionCodes.restOfCountry

  const option = shippingOptions.find((item) => item.code === expectedCode)

  if (!option) {
    throw new Error("No encontramos una opción de entrega disponible para esa zona.")
  }

  return option
}

function revalidateCheckoutPaths() {
  revalidatePath("/checkout")
  revalidatePath("/carrito")
}
