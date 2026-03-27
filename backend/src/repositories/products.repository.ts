import { pool } from '../db';

export interface ProductRow {
  id: number;
  barcode: string;
  name: string | null;
  brands: string | null;
  stores: string | null;
  countries: string | null;
  quantity: string | null;
  nutriscore_grade: string | null;
  ingredients_text: string | null;
  ingredients: unknown[] | null;
  image_url: string | null;
  last_validated_at: Date;
}

export async function upsertProduct(product: Omit<ProductRow, 'id' | 'last_validated_at'>): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO products
       (barcode, name, brands, stores, countries, quantity, nutriscore_grade,
        ingredients_text, ingredients, image_url, last_validated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (barcode) DO UPDATE SET
       name = EXCLUDED.name,
       brands = EXCLUDED.brands,
       stores = EXCLUDED.stores,
       countries = EXCLUDED.countries,
       quantity = EXCLUDED.quantity,
       nutriscore_grade = EXCLUDED.nutriscore_grade,
       ingredients_text = EXCLUDED.ingredients_text,
       ingredients = EXCLUDED.ingredients,
       image_url = EXCLUDED.image_url,
       last_validated_at = EXCLUDED.last_validated_at
     RETURNING id`,
    [
      product.barcode,
      product.name,
      product.brands,
      product.stores,
      product.countries,
      product.quantity,
      product.nutriscore_grade,
      product.ingredients_text,
      product.ingredients,
      product.image_url,
    ],
  );

  return result.rows[0].id;
}

export async function getProductByBarcode(barcode: string): Promise<ProductRow | null> {
  const result = await pool.query<ProductRow>(
    `SELECT id, barcode, name, brands, stores, countries, quantity, nutriscore_grade,
            ingredients_text, ingredients, image_url, last_validated_at
     FROM products
     WHERE barcode = $1`,
    [barcode],
  );

  return result.rows[0] ?? null;
}
