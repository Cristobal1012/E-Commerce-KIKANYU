import {
  getCatalogPageData,
  parseFamiliesParam,
  parseSortParam,
} from "@/lib/catalog"
import { CatalogErrorState, CatalogShell } from "@/components/catalog/catalog-shell"

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams
  const selectedFamilies = parseFamiliesParam(params.familia)
  const sort = parseSortParam(params.orden)

  try {
    const { families, products } = await getCatalogPageData({
      familyHandles: selectedFamilies,
      sort,
    })

    return (
      <CatalogShell
        families={families}
        products={products}
        selectedFamilies={selectedFamilies}
        sort={sort}
      />
    )
  } catch {
    return <CatalogErrorState />
  }
}
