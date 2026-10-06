export const checkoutConfig = {
  tax: {
    includedVatRate: 0.19,
  },
  testDiscountCode: "TODO10",
  delivery: {
    pickup: {
      optionCode: "pickup-todo",
      label: "Retiro en tienda",
    },
    shipping: {
      optionCodes: {
        metropolitan: "delivery-rm-todo",
        restOfCountry: "delivery-rest-country-todo",
      },
      freeShippingPromotionCode: "TODO_ENVIO_GRATIS",
      freeShippingThresholdClp: 50000,
      ratesClp: {
        metropolitan: 3990,
        restOfCountry: 6990,
      },
      regions: [
        {
          code: "RM",
          name: "Región Metropolitana",
          communes: ["Santiago", "Providencia", "Ñuñoa", "Las Condes"],
        },
        {
          code: "VALPARAISO",
          name: "Valparaíso",
          communes: ["Valparaíso", "Viña del Mar", "Quilpué"],
        },
        {
          code: "BIOBIO",
          name: "Biobío",
          communes: ["Concepción", "Talcahuano", "Los Ángeles"],
        },
        {
          code: "ARAUCANIA",
          name: "La Araucanía",
          communes: ["Temuco", "Padre Las Casas", "Villarrica"],
        },
        {
          code: "LOS_LAGOS",
          name: "Los Lagos",
          communes: ["Puerto Montt", "Osorno", "Castro"],
        },
        {
          code: "AYSEN_TODO_BLOQUEADA",
          name: "TODO: Región bloqueada de prueba",
          communes: ["Coyhaique"],
        },
      ],
      blockedRegionCodes: ["AYSEN_TODO_BLOQUEADA"],
    },
  },
} as const

export type CheckoutConfig = typeof checkoutConfig
