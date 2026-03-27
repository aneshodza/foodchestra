import { Router, Request, Response } from 'express';
import { isValidBarcode } from '../utils/barcode';

const router = Router();

const OFF_BASE =
  process.env['OPENFOODFACTS_BASE_URL'] ||
  'https://world.openfoodfacts.org/api/v0/product';

/**
 * @openapi
 * /products/{barcode}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Look up a product by barcode
 *     description: >
 *       Fetches product data from OpenFoodFacts for the given barcode (EAN-8,
 *       EAN-13, UPC-A). Returns a normalised product shape or `found: false`
 *       when the barcode is not in the OpenFoodFacts database.
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric barcode (4–14 digits)
 *     responses:
 *       200:
 *         description: Lookup result (product may be null when not found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - found
 *                 - product
 *               properties:
 *                 found:
 *                   type: boolean
 *                 product:
 *                   type: object
 *                   nullable: true
 *       400:
 *         description: Invalid barcode format
 *       502:
 *         description: Upstream OpenFoodFacts request failed
 */
router.get('/:barcode', async (req: Request, res: Response) => {
  const { barcode } = req.params;

  if (!isValidBarcode(barcode)) {
    res.status(400).json({ error: 'Invalid barcode format' });
    return;
  }

  let offData: unknown;
  try {
    const offRes = await fetch(`${OFF_BASE}/${barcode}.json`);
    if (!offRes.ok) {
      res.status(502).json({ error: 'OpenFoodFacts request failed' });
      return;
    }
    offData = await offRes.json();
  } catch {
    res.status(502).json({ error: 'Failed to reach OpenFoodFacts' });
    return;
  }

  const raw = offData as { status: number; product?: Record<string, unknown> };

  if (raw.status !== 1 || !raw.product) {
    res.status(200).json({ found: false, product: null });
    return;
  }

  const p = raw.product;

  res.status(200).json({
    found: true,
    product: {
      barcode,
      name: p['product_name'] ?? null,
      brands: p['brands'] ?? null,
      stores: p['stores'] ?? null,
      countries: p['countries'] ?? null,
      quantity: p['quantity'] ?? null,
      nutriscoreGrade: p['nutriscore_grade'] ?? null,
      ingredientsText: p['ingredients_text'] ?? null,
      ingredients: p['ingredients'] ?? [],
      imageUrl: p['image_url'] ?? null,
    },
  });
});

export default router;
