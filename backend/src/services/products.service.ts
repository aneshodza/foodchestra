import { getProductByBarcode, upsertProduct } from '../repositories/products.repository';

const OFF_BASE =
  process.env['OPENFOODFACTS_BASE_URL'] ||
  'https://world.openfoodfacts.org/api/v0/product';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface ProductData {
  barcode: string;
  name: string | null;
  brands: string | null;
  stores: string | null;
  countries: string | null;
  quantity: string | null;
  nutriscoreGrade: string | null;
  ingredientsText: string | null;
  ingredients: unknown[];
  imageUrl: string | null;
}

export type ProductLookupResult =
  | { found: true; product: ProductData; productId: number | undefined }
  | { found: false; product: null }
  | { error: 'upstream_failed' | 'upstream_unreachable' };

export async function lookupProduct(barcode: string): Promise<ProductLookupResult> {
  // 1. Check cache
  try {
    const cached = await getProductByBarcode(barcode);
    if (cached) {
      const isFresh = Date.now() - new Date(cached.last_validated_at).getTime() < CACHE_TTL_MS;
      if (isFresh) {
        return {
          found: true,
          productId: cached.id,
          product: {
            barcode: cached.barcode,
            name: cached.name,
            brands: cached.brands,
            stores: cached.stores,
            countries: cached.countries,
            quantity: cached.quantity,
            nutriscoreGrade: cached.nutriscore_grade,
            ingredientsText: cached.ingredients_text,
            ingredients: cached.ingredients ?? [],
            imageUrl: cached.image_url,
          },
        };
      }
    }
  } catch (err) {
    console.error('Failed to read from cache:', err);
    // Continue to fetch from OFF if cache fails
  }

  // 2. Fetch from OpenFoodFacts
  let offData: unknown;
  try {
    const offRes = await fetch(`${OFF_BASE}/${barcode}.json`);
    if (!offRes.ok) {
      return { error: 'upstream_failed' };
    }
    offData = await offRes.json();
  } catch {
    return { error: 'upstream_unreachable' };
  }

  const raw = offData as { status: number; product?: Record<string, unknown> };

  if (raw.status !== 1 || !raw.product) {
    return { found: false, product: null };
  }

  const p = raw.product;
  const product: ProductData = {
    barcode,
    name: (p['product_name'] as string) ?? null,
    brands: (p['brands'] as string) ?? null,
    stores: (p['stores'] as string) ?? null,
    countries: (p['countries'] as string) ?? null,
    quantity: (p['quantity'] as string) ?? null,
    nutriscoreGrade: (p['nutriscore_grade'] as string) ?? null,
    ingredientsText: (p['ingredients_text'] as string) ?? null,
    ingredients: (p['ingredients'] as unknown[]) ?? [],
    imageUrl: (p['image_url'] as string) ?? null,
  };

  // 3. Update cache (non-fatal)
  let productId: number | undefined;
  try {
    productId = await upsertProduct({
      barcode: product.barcode,
      name: product.name,
      brands: product.brands,
      stores: product.stores,
      countries: product.countries,
      quantity: product.quantity,
      nutriscore_grade: product.nutriscoreGrade,
      ingredients_text: product.ingredientsText,
      ingredients: product.ingredients,
      image_url: product.imageUrl,
    });
  } catch (err) {
    console.error('Failed to update cache:', err);
    // Don't fail the request if cache update fails
  }

  return { found: true, product, productId };
}
