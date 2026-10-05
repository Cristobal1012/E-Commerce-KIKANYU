import type { ExecArgs } from "@medusajs/framework/types"
import {
  createApiKeysWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
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
}

const SAMPLE_MARKER = "phase-1-sample-catalog"
const SAMPLE_CREATED_BY = "seed:phase-1-catalog"
const DEFAULT_SALES_CHANNEL_NAME = "Storefront de prueba"
const DEFAULT_REGION_NAME = "Chile - prueba"
const DEFAULT_PUBLISHABLE_KEY_TITLE = "Storefront local de prueba"

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

  logger.info("Seed catálogo Fase 1: iniciando datos de prueba")

  const salesChannel = await ensureSalesChannel(container, query)
  await ensureRegion(container, query)
  await ensurePublishableKey(container, salesChannel.id)
  const categoriesByHandle = await ensureCategories(container, query)
  await ensureProducts(container, query, categoriesByHandle, salesChannel.id)

  logger.info("Seed catálogo Fase 1: listo")
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
            manage_inventory: false,
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
