export type StoreRegion = {
  id: string
  currency_code: string
  countries?: {
    iso_2: string
  }[]
}

type StoreRegionListResponse = {
  regions: StoreRegion[]
}

export const backendUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

export const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

export async function getChileRegionId() {
  const region = await getChileRegion()

  return region.id
}

export async function getChileRegion() {
  const response = await medusaFetch<StoreRegionListResponse>("/store/regions")
  const region = response.regions.find((item) =>
    item.countries?.some((country) => country.iso_2 === "cl")
  )

  if (!region) {
    throw new Error("Medusa region for Chile is not configured")
  }

  if (region.currency_code !== "clp") {
    throw new Error("Medusa region for Chile must use CLP")
  }

  return region
}

export async function medusaFetch<TResponse>(
  path: string,
  init: RequestInit & { cache?: RequestCache } = {}
): Promise<TResponse> {
  const headers = new Headers(init.headers)

  if (publishableKey) {
    headers.set("x-publishable-api-key", publishableKey)
  }

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json")
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new Error(await getMedusaErrorMessage(response))
  }

  return response.json() as Promise<TResponse>
}

async function getMedusaErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {
      message?: string
      error?: string
    }

    return (
      payload.message ??
      payload.error ??
      `Medusa request failed with status ${response.status}`
    )
  } catch {
    return `Medusa request failed with status ${response.status}`
  }
}
