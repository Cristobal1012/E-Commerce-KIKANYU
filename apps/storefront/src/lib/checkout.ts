import { checkoutConfig } from "@config/checkout.config"

export type DeliveryKind = "pickup" | "shipping"

export type CoverageResult =
  | { covered: true; zone: "metropolitan" | "rest_of_country" }
  | { covered: false; reason: string }

export function calculateIncludedVat(total: number, vatRate = checkoutConfig.tax.includedVatRate) {
  return Math.round(total - total / (1 + vatRate))
}

export function getCoverageForRegion(regionCode: string): CoverageResult {
  if (!regionCode) {
    return {
      covered: false,
      reason: "Selecciona una región para calcular el despacho.",
    }
  }

  if (checkoutConfig.delivery.shipping.blockedRegionCodes.includes(regionCode as never)) {
    return {
      covered: false,
      reason:
        "Por ahora no tenemos cobertura para esta zona de prueba. Elige retiro o cambia la región.",
    }
  }

  if (regionCode === "RM") {
    return { covered: true, zone: "metropolitan" }
  }

  return { covered: true, zone: "rest_of_country" }
}
