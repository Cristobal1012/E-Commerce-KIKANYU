import {
  getCatalogPageData,
  parseFamiliesParam,
  parseSearchParam,
  parseSortParam,
} from "@/lib/catalog"
import { CatalogErrorState, CatalogShell } from "@/components/catalog/catalog-shell"

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams
  const selectedFamilies = parseFamiliesParam(params.familia)
  const query = parseSearchParam(params.q)
  const sort = parseSortParam(params.orden)

  let catalogPageData: Awaited<ReturnType<typeof getCatalogPageData>>

  try {
    catalogPageData = await getCatalogPageData({
      familyHandles: selectedFamilies,
      query,
      sort,
    })
  } catch {
    return <CatalogErrorState />
  }

  return (
    <CatalogShell
      families={catalogPageData.families}
      products={catalogPageData.products}
      query={query}
      searchProducts={catalogPageData.searchProducts}
      selectedFamilies={selectedFamilies}
      sort={sort}
    />
  )
}
