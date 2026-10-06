import type { ExecArgs } from "@medusajs/framework/types"
import {
  batchLinksWorkflow,
  batchInventoryItemLevelsWorkflow,
  createApiKeysWorkflow,
  createLocationFulfillmentSetWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createPromotionsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/core-flows"
import {
  ContainerRegistrationKeys,
  ApplicationMethodAllocation,
  ApplicationMethodTargetType,
  ApplicationMethodType,
  MedusaError,
  Modules,
  ProductStatus,
  PromotionRuleOperator,
  PromotionStatus,
  PromotionType,
  ShippingOptionPriceType,
} from "@medusajs/framework/utils"

type QueryGraph = {
  graph: <T>(input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    pagination?: {
      skip: number
      take: number
    }
  }) => Promise<{ data: T[] }>
}

type SeedCategory = {
  id: string
  name: string
  handle: string
  description: string
  rank: number
}

type SeedProduct = {
  externalId: string
  title: string
  handle: string
  subtitle: string
  description: string
  categoryHandle: string
  image: string
  notes: {
    salida: string[]
    corazon: string[]
    fondo: string[]
  }
  variants: {
    size: string
    sku: string
    priceClp: number
  }[]
}

type ExistingEntity = {
  id: string
  external_id?: string | null
  handle?: string | null
  name?: string | null
  code?: string | null
  type?: string | null
  is_tax_inclusive?: boolean | null
}

type ExistingStockLocation = ExistingEntity & {
  fulfillment_sets?: ExistingEntity[] | null
  fulfillment_providers?: ExistingEntity[] | null
}

type ExistingServiceZone = ExistingEntity & {
  fulfillment_set_id?: string | null
}

type SeedGeoZone =
  | { type: "country"; country_code: string }
  | { type: "province"; country_code: string; province_code: string }

type ExistingVariant = {
  id: string
  sku?: string | null
  manage_inventory?: boolean | null
  inventory_items?: {
    inventory_item_id?: string | null
    inventory?: {
      id: string
      location_levels?: {
        id: string
        location_id: string
        stocked_quantity?: number | null
      }[] | null
    } | null
  }[] | null
}

const SAMPLE_MARKER = "phase-1-sample-catalog"
const SAMPLE_CREATED_BY = "seed:phase-1-catalog"
const DEFAULT_SALES_CHANNEL_NAME = "Storefront de prueba"
const DEFAULT_REGION_NAME = "Chile - prueba"
const DEFAULT_PUBLISHABLE_KEY_TITLE = "Storefront local de prueba"
const DEFAULT_STOCK_LOCATION_NAME = "Bodega local de prueba"
const DEFAULT_VARIANT_STOCK = 12
const DEFAULT_FULFILLMENT_SET_NAME = "Entrega local de prueba"
const MANUAL_FULFILLMENT_PROVIDER_ID = "fp_manual_manual"
const PICKUP_SERVICE_ZONE_NAME = "TODO retiro en tienda - prueba"
const RM_SERVICE_ZONE_NAME = "TODO despacho RM - prueba"
const REST_SERVICE_ZONE_NAME = "TODO despacho resto del pais - prueba"
const DEFAULT_SHIPPING_PROFILE_NAME = "Default Shipping Profile"
const TEST_DISCOUNT_CODE = "TODO10"
const FREE_SHIPPING_PROMOTION_CODE = "TODO_ENVIO_GRATIS"
const FREE_SHIPPING_THRESHOLD_CLP = 50000
const SHIPPING_OPTION_CODES = {
  pickup: "pickup-todo",
  metropolitan: "delivery-rm-todo",
  restOfCountry: "delivery-rest-country-todo",
}
const SHIPPING_RATES_CLP = {
  metropolitan: 3990,
  restOfCountry: 6990,
}

const aromaticFamilies: SeedCategory[] = [
  {
    id: "sample-family-citrica",
    name: "Cítrica",
    handle: "citrica",
    description: "Dato de prueba: aromas luminosos con perfil fresco.",
    rank: 0,
  },
  {
    id: "sample-family-floral",
    name: "Floral",
    handle: "floral",
    description: "Dato de prueba: notas suaves inspiradas en flores.",
    rank: 1,
  },
  {
    id: "sample-family-frutal",
    name: "Frutal",
    handle: "frutal",
    description: "Dato de prueba: aromas dulces y jugosos.",
    rank: 2,
  },
  {
    id: "sample-family-amaderada",
    name: "Amaderada",
    handle: "amaderada",
    description: "Dato de prueba: perfiles calidos de madera y resina.",
    rank: 3,
  },
  {
    id: "sample-family-oriental-especiada",
    name: "Oriental / Especiada",
    handle: "oriental-especiada",
    description: "Dato de prueba: aromas intensos con especias.",
    rank: 4,
  },
  {
    id: "sample-family-fresca-acuatica",
    name: "Fresca / Acuática",
    handle: "fresca-acuatica",
    description: "Dato de prueba: sensacion limpia y aireada.",
    rank: 5,
  },
  {
    id: "sample-family-dulce-gourmand",
    name: "Dulce / Gourmand",
    handle: "dulce-gourmand",
    description: "Dato de prueba: notas cremosas y dulces.",
    rank: 6,
  },
  {
    id: "sample-family-herbal-aromatica",
    name: "Herbal / Aromática",
    handle: "herbal-aromatica",
    description: "Dato de prueba: hierbas verdes y aromáticas.",
    rank: 7,
  },
]

const sampleProducts: SeedProduct[] = [
  {
    externalId: "sample-essence-lima-fresca",
    title: "Esencia Lima Fresca",
    handle: "esencia-lima-fresca-prueba",
    subtitle: "Dato de prueba",
    description:
      "Dato de prueba: esencia genérica de perfil cítrico, pensada para validar el catálogo.",
    categoryHandle: "citrica",
    image: "/catalog/sample-citrus.svg",
    notes: {
      salida: ["lima", "bergamota"],
      corazon: ["verbena"],
      fondo: ["almizcle suave"],
    },
    variants: [
      { size: "30 ml", sku: "TEST-LIMA-30", priceClp: 3990 },
      { size: "50 ml", sku: "TEST-LIMA-50", priceClp: 5990 },
      { size: "100 ml", sku: "TEST-LIMA-100", priceClp: 9990 },
    ],
  },
  {
    externalId: "sample-essence-jardin-blanco",
    title: "Esencia Jardín Blanco",
    handle: "esencia-jardin-blanco-prueba",
    subtitle: "Dato de prueba",
    description:
      "Dato de prueba: esencia genérica floral para revisar fichas y variantes.",
    categoryHandle: "floral",
    image: "/catalog/sample-floral.svg",
    notes: {
      salida: ["petalos limpios"],
      corazon: ["jazmin", "rosa"],
      fondo: ["maderas claras"],
    },
    variants: [
      { size: "30 ml", sku: "TEST-JARDIN-30", priceClp: 4290 },
      { size: "50 ml", sku: "TEST-JARDIN-50", priceClp: 6490 },
      { size: "100 ml", sku: "TEST-JARDIN-100", priceClp: 10990 },
    ],
  },
  {
    externalId: "sample-essence-frutos-rojos",
    title: "Esencia Frutos Rojos",
    handle: "esencia-frutos-rojos-prueba",
    subtitle: "Dato de prueba",
    description:
      "Dato de prueba: esencia genérica frutal para validar filtros por familia.",
    categoryHandle: "frutal",
    image: "/catalog/sample-fruity.svg",
    notes: {
      salida: ["frambuesa", "granada"],
      corazon: ["ciruela"],
      fondo: ["vainilla ligera"],
    },
    variants: [
      { size: "30 ml", sku: "TEST-FRUTOS-30", priceClp: 4190 },
      { size: "50 ml", sku: "TEST-FRUTOS-50", priceClp: 6290 },
      { size: "100 ml", sku: "TEST-FRUTOS-100", priceClp: 10590 },
    ],
  },
  {
    externalId: "sample-essence-bosque-suave",
    title: "Esencia Bosque Suave",
    handle: "esencia-bosque-suave-prueba",
    subtitle: "Dato de prueba",
    description:
      "Dato de prueba: esencia genérica amaderada para revisar estados visuales del catálogo.",
    categoryHandle: "amaderada",
    image: "/catalog/sample-woody.svg",
    notes: {
      salida: ["hojas secas"],
      corazon: ["cedro"],
      fondo: ["ambar", "sandalwood"],
    },
    variants: [
      { size: "30 ml", sku: "TEST-BOSQUE-30", priceClp: 4590 },
      { size: "50 ml", sku: "TEST-BOSQUE-50", priceClp: 6890 },
      { size: "100 ml", sku: "TEST-BOSQUE-100", priceClp: 11490 },
    ],
  },
  {
    externalId: "sample-essence-brisa-limpia",
    title: "Esencia Brisa Limpia",
    handle: "esencia-brisa-limpia-prueba",
    subtitle: "Dato de prueba",
    description:
      "Dato de prueba: esencia genérica fresca para probar tarjetas y detalle.",
    categoryHandle: "fresca-acuatica",
    image: "/catalog/sample-fresh.svg",
    notes: {
      salida: ["ozono", "limon"],
      corazon: ["agua fria"],
      fondo: ["algodon limpio"],
    },
    variants: [
      { size: "30 ml", sku: "TEST-BRISA-30", priceClp: 3890 },
      { size: "50 ml", sku: "TEST-BRISA-50", priceClp: 5890 },
      { size: "100 ml", sku: "TEST-BRISA-100", priceClp: 9690 },
    ],
  },
  {
    externalId: "sample-essence-vainilla-tibia",
    title: "Esencia Vainilla Tibia",
    handle: "esencia-vainilla-tibia-prueba",
    subtitle: "Dato de prueba",
    description:
      "Dato de prueba: esencia genérica dulce para validar precios en CLP.",
    categoryHandle: "dulce-gourmand",
    image: "/catalog/sample-sweet.svg",
    notes: {
      salida: ["azucar rubia"],
      corazon: ["vainilla"],
      fondo: ["crema suave"],
    },
    variants: [
      { size: "30 ml", sku: "TEST-VAINILLA-30", priceClp: 4390 },
      { size: "50 ml", sku: "TEST-VAINILLA-50", priceClp: 6590 },
      { size: "100 ml", sku: "TEST-VAINILLA-100", priceClp: 10990 },
    ],
  },
]

export default async function seedCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<QueryGraph>(ContainerRegistrationKeys.QUERY)

  logger.info("Seed catalogo Fase 2: iniciando datos de prueba")

  const salesChannel = await ensureSalesChannel(container, query)
  const stockLocation = await ensureStockLocation(container, query, salesChannel.id)
  const region = await ensureRegion(container, query)
  await ensureFulfillmentProviderLink(container, query, stockLocation.id)
  const fulfillmentSet = await ensureFulfillmentSet(container, query, stockLocation.id)
  const serviceZones = await ensureServiceZones(container, query, fulfillmentSet.id)
  const shippingProfile = await ensureShippingProfile(container, query)
  await ensureShippingOptions(container, query, serviceZones, shippingProfile.id)
  await ensurePromotions(container, query)
  await ensurePublishableKey(container, salesChannel.id)
  const categoriesByHandle = await ensureCategories(container, query)
  await ensureProducts(container, query, categoriesByHandle, salesChannel.id)
  await ensureProductInventory(container, query, stockLocation.id)

  logger.info(
    `Region ${region.name} verificada con CLP e impuestos incluidos para precios B2C.`
  )
  logger.info("Seed catalogo Fase 3A: listo")
}

async function ensureSalesChannel(
  container: ExecArgs["container"],
  query: QueryGraph
) {
  const { data } = await query.graph<ExistingEntity>({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: {
      name: DEFAULT_SALES_CHANNEL_NAME,
    },
    pagination: {
      skip: 0,
      take: 1,
    },
  })

  if (data[0]) {
    return data[0]
  }

  const { result } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: DEFAULT_SALES_CHANNEL_NAME,
          description: "Dato de prueba para el storefront local.",
        },
      ],
    },
  })

  return result[0]
}

async function ensureFulfillmentProviderLink(
  container: ExecArgs["container"],
  query: QueryGraph,
  stockLocationId: string
) {
  const { data } = await query.graph<ExistingStockLocation>({
    entity: "stock_location",
    fields: ["id", "fulfillment_providers.id"],
    filters: {
      id: stockLocationId,
    },
    pagination: {
      skip: 0,
      take: 1,
    },
  })
  const stockLocation = data[0]
  const isLinked = stockLocation?.fulfillment_providers?.some(
    (provider) => provider.id === MANUAL_FULFILLMENT_PROVIDER_ID
  )

  if (isLinked) {
    return
  }

  await batchLinksWorkflow(container).run({
    input: {
      create: [
        {
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
          [Modules.FULFILLMENT]: {
            fulfillment_provider_id: MANUAL_FULFILLMENT_PROVIDER_ID,
          },
        },
      ],
      delete: [],
    },
  })
}

async function ensureFulfillmentSet(
  container: ExecArgs["container"],
  query: QueryGraph,
  stockLocationId: string
) {
  const { data } = await query.graph<ExistingStockLocation>({
    entity: "stock_location",
    fields: ["id", "fulfillment_sets.id", "fulfillment_sets.name"],
    filters: {
      id: stockLocationId,
    },
    pagination: {
      skip: 0,
      take: 1,
    },
  })
  const existing = data[0]?.fulfillment_sets?.find(
    (fulfillmentSet) => fulfillmentSet.name === DEFAULT_FULFILLMENT_SET_NAME
  )

  if (existing) {
    return existing
  }

  await createLocationFulfillmentSetWorkflow(container).run({
    input: {
      location_id: stockLocationId,
      fulfillment_set_data: {
        name: DEFAULT_FULFILLMENT_SET_NAME,
        type: "shipping",
      },
    },
  })

  const { data: refreshedLocations } = await query.graph<ExistingStockLocation>({
    entity: "stock_location",
    fields: ["id", "fulfillment_sets.id", "fulfillment_sets.name"],
    filters: {
      id: stockLocationId,
    },
    pagination: {
      skip: 0,
      take: 1,
    },
  })
  const fulfillmentSet = refreshedLocations[0]?.fulfillment_sets?.find(
    (item) => item.name === DEFAULT_FULFILLMENT_SET_NAME
  )

  if (!fulfillmentSet) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "No se pudo crear el fulfillment set de prueba."
    )
  }

  return fulfillmentSet
}

async function ensureServiceZones(
  container: ExecArgs["container"],
  query: QueryGraph,
  fulfillmentSetId: string
) {
  const desiredZones: {
    key: string
    name: string
    geo_zones: SeedGeoZone[]
  }[] = [
    {
      key: "pickup",
      name: PICKUP_SERVICE_ZONE_NAME,
      geo_zones: [{ type: "country", country_code: "cl" }],
    },
    {
      key: "metropolitan",
      name: RM_SERVICE_ZONE_NAME,
      geo_zones: [{ type: "province", country_code: "cl", province_code: "RM" }],
    },
    {
      key: "restOfCountry",
      name: REST_SERVICE_ZONE_NAME,
      geo_zones: [{ type: "country", country_code: "cl" }],
    },
  ]

  const { data: existingZones } = await query.graph<ExistingServiceZone>({
    entity: "service_zone",
    fields: ["id", "name", "fulfillment_set_id"],
    filters: {
      name: desiredZones.map((zone) => zone.name),
    },
  })
  const existingNames = new Set(existingZones.map((zone) => zone.name))
  const missingZones = desiredZones.filter((zone) => !existingNames.has(zone.name))

  if (missingZones.length > 0) {
    await createServiceZonesWorkflow(container).run({
      input: {
        data: missingZones.map((zone) => ({
          name: zone.name,
          fulfillment_set_id: fulfillmentSetId,
          geo_zones: [...zone.geo_zones],
          metadata: {
            sample_data: true,
            source: SAMPLE_MARKER,
            TODO: "Reemplazar zonas de servicio antes de produccion.",
          },
        })),
      },
    })
  }

  const { data: serviceZones } = await query.graph<ExistingServiceZone>({
    entity: "service_zone",
    fields: ["id", "name", "fulfillment_set_id"],
    filters: {
      name: desiredZones.map((zone) => zone.name),
    },
  })
  const serviceZonesByName = new Map(
    serviceZones.map((zone) => [zone.name as string, zone])
  )

  return {
    pickup: getServiceZone(serviceZonesByName, PICKUP_SERVICE_ZONE_NAME),
    metropolitan: getServiceZone(serviceZonesByName, RM_SERVICE_ZONE_NAME),
    restOfCountry: getServiceZone(serviceZonesByName, REST_SERVICE_ZONE_NAME),
  }
}

async function ensureShippingProfile(
  container: ExecArgs["container"],
  query: QueryGraph
) {
  const { data } = await query.graph<ExistingEntity>({
    entity: "shipping_profile",
    fields: ["id", "name", "type"],
    pagination: {
      skip: 0,
      take: 1,
    },
  })

  if (data[0]) {
    return data[0]
  }

  const { result } = await createShippingProfilesWorkflow(container).run({
    input: {
      data: [
        {
          name: DEFAULT_SHIPPING_PROFILE_NAME,
          type: "default",
        },
      ],
    },
  })

  return result[0]
}

async function ensureShippingOptions(
  container: ExecArgs["container"],
  query: QueryGraph,
  serviceZones: {
    pickup: ExistingServiceZone
    metropolitan: ExistingServiceZone
    restOfCountry: ExistingServiceZone
  },
  shippingProfileId: string
) {
  const desiredOptions = [
    {
      name: "TODO Retiro en tienda",
      service_zone_id: serviceZones.pickup.id,
      type: {
        label: "Retiro",
        description: "TODO punto de retiro configurable.",
        code: SHIPPING_OPTION_CODES.pickup,
      },
      amount: 0,
      metadata: {
        delivery_kind: "pickup",
        TODO: "Cambiar direccion y horario desde configuracion/admin.",
      },
    },
    {
      name: "TODO Despacho Región Metropolitana",
      service_zone_id: serviceZones.metropolitan.id,
      type: {
        label: "Despacho RM",
        description: "TODO tarifa ficticia RM.",
        code: SHIPPING_OPTION_CODES.metropolitan,
      },
      amount: SHIPPING_RATES_CLP.metropolitan,
      metadata: {
        delivery_kind: "shipping",
        zone: "metropolitan",
        TODO: "Reemplazar tarifa ficticia antes de produccion.",
      },
    },
    {
      name: "TODO Despacho resto del país",
      service_zone_id: serviceZones.restOfCountry.id,
      type: {
        label: "Despacho resto",
        description: "TODO tarifa ficticia resto del pais.",
        code: SHIPPING_OPTION_CODES.restOfCountry,
      },
      amount: SHIPPING_RATES_CLP.restOfCountry,
      metadata: {
        delivery_kind: "shipping",
        zone: "rest_of_country",
        TODO: "Reemplazar tarifa ficticia antes de produccion.",
      },
    },
  ]

  const { data: existingOptions } = await query.graph<ExistingEntity>({
    entity: "shipping_option",
    fields: ["id", "name", "is_tax_inclusive"],
    filters: {
      name: desiredOptions.map((option) => option.name),
    },
  })
  const existingNames = new Set(existingOptions.map((option) => option.name))
  const missingOptions = desiredOptions.filter(
    (option) => !existingNames.has(option.name)
  )

  if (missingOptions.length === 0) {
    return
  }

  await createShippingOptionsWorkflow(container).run({
    input: missingOptions.map((option) => ({
      name: option.name,
      service_zone_id: option.service_zone_id,
      shipping_profile_id: shippingProfileId,
      provider_id: MANUAL_FULFILLMENT_PROVIDER_ID,
      type: option.type,
      price_type: ShippingOptionPriceType.FLAT,
      prices: [
        {
          amount: option.amount,
          currency_code: "clp",
        },
      ],
      metadata: {
        sample_data: true,
        source: SAMPLE_MARKER,
        ...option.metadata,
      },
    })),
  })
}

async function ensurePromotions(
  container: ExecArgs["container"],
  query: QueryGraph
) {
  const promotionCodes = [
    TEST_DISCOUNT_CODE,
    FREE_SHIPPING_PROMOTION_CODE,
  ]
  const { data: existingPromotions } = await query.graph<ExistingEntity>({
    entity: "promotion",
    fields: ["id", "code"],
    filters: {
      code: promotionCodes,
    },
  })
  const existingCodes = new Set(existingPromotions.map((promotion) => promotion.code))
  const promotionsData: Record<string, unknown>[] = []

  if (!existingCodes.has(TEST_DISCOUNT_CODE)) {
    promotionsData.push({
      code: TEST_DISCOUNT_CODE,
      type: PromotionType.STANDARD,
      status: PromotionStatus.ACTIVE,
      is_tax_inclusive: true,
      application_method: {
        type: ApplicationMethodType.PERCENTAGE,
        target_type: ApplicationMethodTargetType.ITEMS,
        allocation: ApplicationMethodAllocation.ACROSS,
        value: 10,
        currency_code: "clp",
      },
      metadata: {
        sample_data: true,
        source: SAMPLE_MARKER,
        TODO: "Promocion de prueba editable desde Admin.",
      },
    })
  }

  if (!existingCodes.has(FREE_SHIPPING_PROMOTION_CODE)) {
    promotionsData.push({
      code: FREE_SHIPPING_PROMOTION_CODE,
      type: PromotionType.STANDARD,
      status: PromotionStatus.ACTIVE,
      is_automatic: true,
      is_tax_inclusive: true,
      application_method: {
        type: ApplicationMethodType.PERCENTAGE,
        target_type: ApplicationMethodTargetType.SHIPPING_METHODS,
        allocation: ApplicationMethodAllocation.ACROSS,
        value: 100,
        currency_code: "clp",
      },
      rules: [
        {
          attribute: "subtotal",
          operator: PromotionRuleOperator.GTE,
          values: String(FREE_SHIPPING_THRESHOLD_CLP),
          description: "TODO monto minimo ficticio para envio gratis.",
        },
      ],
      metadata: {
        sample_data: true,
        source: SAMPLE_MARKER,
        TODO: "Monto minimo ficticio editable desde Admin.",
      },
    })
  }

  if (promotionsData.length === 0) {
    return
  }

  await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: promotionsData as never,
    },
  })
}

function getServiceZone(
  serviceZonesByName: Map<string, ExistingServiceZone>,
  name: string
) {
  const serviceZone = serviceZonesByName.get(name)

  if (!serviceZone) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `No se pudo crear la zona de servicio ${name}.`
    )
  }

  return serviceZone
}

async function ensureStockLocation(
  container: ExecArgs["container"],
  query: QueryGraph,
  salesChannelId: string
) {
  const { data } = await query.graph<ExistingEntity>({
    entity: "stock_location",
    fields: ["id", "name"],
    filters: {
      name: DEFAULT_STOCK_LOCATION_NAME,
    },
    pagination: {
      skip: 0,
      take: 1,
    },
  })

  const stockLocation =
    data[0] ??
    (
      await createStockLocationsWorkflow(container).run({
        input: {
          locations: [
            {
              name: DEFAULT_STOCK_LOCATION_NAME,
              metadata: {
                sample_data: true,
                source: SAMPLE_MARKER,
              },
            },
          ],
        },
      })
    ).result[0]

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [salesChannelId],
    },
  })

  return stockLocation
}

async function ensureRegion(container: ExecArgs["container"], query: QueryGraph) {
  const { data } = await query.graph<ExistingEntity>({
    entity: "region",
    fields: ["id", "name"],
    filters: {
      name: DEFAULT_REGION_NAME,
    },
    pagination: {
      skip: 0,
      take: 1,
    },
  })

  if (data[0]) {
    if (data[0].is_tax_inclusive !== true) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "La region Chile debe tener precios con impuestos incluidos (is_tax_inclusive=true)."
      )
    }

    return data[0]
  }

  const { result } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: DEFAULT_REGION_NAME,
          currency_code: "clp",
          countries: ["cl"],
          automatic_taxes: true,
          is_tax_inclusive: true,
          metadata: {
            sample_data: true,
            source: SAMPLE_MARKER,
          },
        },
      ],
    },
  })

  return result[0]
}

async function ensurePublishableKey(
  container: ExecArgs["container"],
  salesChannelId: string
) {
  const apiKeyService = container.resolve(Modules.API_KEY)
  const [existingKey] = await apiKeyService.listApiKeys(
    {
      title: DEFAULT_PUBLISHABLE_KEY_TITLE,
      type: "publishable",
    },
    {
      take: 1,
    }
  )

  const apiKey =
    existingKey ??
    (
      await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            {
              title: DEFAULT_PUBLISHABLE_KEY_TITLE,
              type: "publishable",
              created_by: SAMPLE_CREATED_BY,
            },
          ],
        },
      })
    ).result[0]

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: apiKey.id,
      add: [salesChannelId],
    },
  })

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(
    `Publishable API key para storefront local: ${apiKey.token}. Copiala en apps/storefront/.env.local como NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.`
  )

  return apiKey
}

async function ensureCategories(
  container: ExecArgs["container"],
  query: QueryGraph
) {
  const { data: existingCategories } = await query.graph<ExistingEntity>({
    entity: "product_category",
    fields: ["id", "handle", "external_id"],
    filters: {
      external_id: aromaticFamilies.map((family) => family.id),
    },
  })

  const existingExternalIds = new Set(
    existingCategories.map((category) => category.external_id)
  )
  const missingCategories = aromaticFamilies.filter(
    (family) => !existingExternalIds.has(family.id)
  )

  if (missingCategories.length > 0) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategories.map((family) => ({
          name: family.name,
          handle: family.handle,
          description: family.description,
          is_active: true,
          is_internal: false,
          rank: family.rank,
          external_id: family.id,
          metadata: {
            sample_data: true,
            source: SAMPLE_MARKER,
          },
        })),
      },
    })
  }

  await Promise.all(
    aromaticFamilies.map((family) =>
      updateProductCategoriesWorkflow(container).run({
        input: {
          selector: {
            external_id: family.id,
          },
          update: {
            name: family.name,
            handle: family.handle,
            description: family.description,
            is_active: true,
            is_internal: false,
            rank: family.rank,
            metadata: {
              sample_data: true,
              source: SAMPLE_MARKER,
            },
          },
        },
      })
    )
  )

  const { data: categories } = await query.graph<ExistingEntity>({
    entity: "product_category",
    fields: ["id", "handle", "external_id"],
    filters: {
      external_id: aromaticFamilies.map((family) => family.id),
    },
  })

  return new Map(
    categories
      .filter((category) => category.handle)
      .map((category) => [category.handle as string, category])
  )
}

async function ensureProducts(
  container: ExecArgs["container"],
  query: QueryGraph,
  categoriesByHandle: Map<string, ExistingEntity>,
  salesChannelId: string
) {
  const { data: existingProducts } = await query.graph<ExistingEntity>({
    entity: "product",
    fields: ["id", "external_id"],
    filters: {
      external_id: sampleProducts.map((product) => product.externalId),
    },
  })

  const existingExternalIds = new Set(
    existingProducts.map((product) => product.external_id)
  )
  const missingProducts = sampleProducts.filter(
    (product) => !existingExternalIds.has(product.externalId)
  )

  if (missingProducts.length === 0) {
    await updateExistingProducts(container, query)
    return
  }

  await createProductsWorkflow(container).run({
    input: {
      products: missingProducts.map((product) => {
        const category = categoriesByHandle.get(product.categoryHandle)

        if (!category) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `No existe la familia aromática ${product.categoryHandle}`
          )
        }

        return {
          title: product.title,
          subtitle: product.subtitle,
          description: product.description,
          handle: product.handle,
          status: ProductStatus.PUBLISHED,
          thumbnail: product.image,
          images: [{ url: product.image }],
          discountable: true,
          external_id: product.externalId,
          categories: [{ id: category.id }],
          sales_channels: [{ id: salesChannelId }],
          options: [
            {
              title: "Tamaño",
              values: product.variants.map((variant) => variant.size),
            },
          ],
          variants: product.variants.map((variant) => ({
            title: variant.size,
            sku: variant.sku,
            manage_inventory: true,
            allow_backorder: false,
            options: {
              Tamaño: variant.size,
            },
            prices: [
              {
                currency_code: "clp",
                amount: variant.priceClp,
              },
            ],
          })),
          metadata: {
            sample_data: true,
            source: SAMPLE_MARKER,
            family_handle: product.categoryHandle,
            notes: product.notes,
          },
        }
      }),
    },
  })

  await updateExistingProducts(container, query)
}

async function ensureProductInventory(
  container: ExecArgs["container"],
  query: QueryGraph,
  stockLocationId: string
) {
  const skus = sampleProducts.flatMap((product) =>
    product.variants.map((variant) => variant.sku)
  )
  const { data: variants } = await query.graph<ExistingVariant>({
    entity: "product_variant",
    fields: [
      "id",
      "sku",
      "manage_inventory",
      "inventory_items.inventory_item_id",
      "inventory_items.inventory.id",
      "inventory_items.inventory.location_levels.id",
      "inventory_items.inventory.location_levels.location_id",
      "inventory_items.inventory.location_levels.stocked_quantity",
    ],
    filters: {
      sku: skus,
    },
  })

  const variantsWithoutInventory = variants.filter(
    (variant) => variant.manage_inventory !== true
  )

  if (variantsWithoutInventory.length > 0) {
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: variantsWithoutInventory.map((variant) => ({
          id: variant.id,
          manage_inventory: true,
          allow_backorder: false,
        })),
      },
    })
  }

  const { data: inventoryVariants } = await query.graph<ExistingVariant>({
    entity: "product_variant",
    fields: [
      "id",
      "sku",
      "inventory_items.inventory_item_id",
      "inventory_items.inventory.id",
      "inventory_items.inventory.location_levels.id",
      "inventory_items.inventory.location_levels.location_id",
      "inventory_items.inventory.location_levels.stocked_quantity",
    ],
    filters: {
      sku: skus,
    },
  })

  const create: {
    inventory_item_id: string
    location_id: string
    stocked_quantity: number
  }[] = []
  const update: {
    id: string
    inventory_item_id: string
    location_id: string
    stocked_quantity: number
  }[] = []

  for (const variant of inventoryVariants) {
    const inventoryItem = variant.inventory_items?.[0]
    const inventoryItemId =
      inventoryItem?.inventory_item_id ?? inventoryItem?.inventory?.id

    if (!inventoryItem || !inventoryItemId) {
      continue
    }

    const existingLevel = inventoryItem.inventory?.location_levels?.find(
      (level) => level.location_id === stockLocationId
    )

    if (existingLevel) {
      update.push({
        id: existingLevel.id,
        inventory_item_id: inventoryItemId,
        location_id: stockLocationId,
        stocked_quantity:
          existingLevel.stocked_quantity && existingLevel.stocked_quantity > 0
            ? existingLevel.stocked_quantity
            : DEFAULT_VARIANT_STOCK,
      })
      continue
    }

    create.push({
      inventory_item_id: inventoryItemId,
      location_id: stockLocationId,
      stocked_quantity: DEFAULT_VARIANT_STOCK,
    })
  }

  if (create.length === 0 && update.length === 0) {
    return
  }

  await batchInventoryItemLevelsWorkflow(container).run({
    input: {
      create,
      update,
      delete: [],
    },
  })
}

async function updateExistingProducts(
  container: ExecArgs["container"],
  query: QueryGraph
) {
  const { data: products } = await query.graph<ExistingEntity>({
    entity: "product",
    fields: ["id", "external_id"],
    filters: {
      external_id: sampleProducts.map((product) => product.externalId),
    },
  })

  const productsByExternalId = new Map(
    products
      .filter((product) => product.external_id)
      .map((product) => [product.external_id as string, product])
  )

  await updateProductsWorkflow(container).run({
    input: {
      products: sampleProducts
        .map((product) => {
          const existingProduct = productsByExternalId.get(product.externalId)

          if (!existingProduct) {
            return null
          }

          return {
            id: existingProduct.id,
            title: product.title,
            subtitle: product.subtitle,
            description: product.description,
            thumbnail: product.image,
            metadata: {
              sample_data: true,
              source: SAMPLE_MARKER,
              family_handle: product.categoryHandle,
              notes: product.notes,
            },
          }
        })
        .filter((product) => product !== null),
    },
  })
}
