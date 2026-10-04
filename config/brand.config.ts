export const brandConfig = {
  storeName: "TODO: nombre de la tienda",
  logoAlt: "TODO: logo de la tienda",
  contact: {
    email: "TODO: correo de contacto",
    phone: "TODO: teléfono de contacto",
    instagram: "TODO: Instagram de la tienda"
  },
  pickup: {
    address: "TODO: dirección de retiro",
    schedule: "TODO: horario de retiro"
  },
  legal: {
    terms: "TODO: términos y condiciones",
    privacy: "TODO: política de privacidad",
    returns: "TODO: cambios y devoluciones"
  },
  theme: {
    colors: {
      background: "#fbfaf7",
      foreground: "#1f1f1f",
      muted: "#6f6a61",
      surface: "#ffffff",
      border: "#ded8ce",
      primary: "#315f52",
      primaryForeground: "#ffffff",
      accent: "#d8b26e"
    },
    fonts: {
      sans: "Arial, Helvetica, sans-serif",
      serif: "Georgia, serif"
    }
  }
} as const

export type BrandConfig = typeof brandConfig
