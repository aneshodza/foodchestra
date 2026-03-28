import type { Request, Response } from 'express';
import { Router } from 'express';
import { isValidBarcode } from '../utils/barcode';
import { lookupProduct } from '../services/products.service';
import { CoolingChainRepository } from '../repositories/cooling-chain.repository';

const router = Router();

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
 *       Results are cached locally for 24 hours.
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

  const result = await lookupProduct(barcode);

  if ('error' in result) {
    const message =
      result.error === 'upstream_unreachable'
        ? 'Failed to reach OpenFoodFacts'
        : 'OpenFoodFacts request failed';
    res.status(502).json({ error: message });
    return;
  }

  if (!result.found) {
    res.status(200).json({ found: false, product: null });
    return;
  }

  res.status(200).json({
    found: true,
    product: { id: result.productId, ...result.product },
  });
});

/**
 * @openapi
 * /products/{barcode}/cooling-status:
 *   get:
 *     tags:
 *       - Products
 *     summary: Check if any cooling breach was detected for a product
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Breach status across all known batches for the product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 potentialBreach:
 *                   type: boolean
 *       400:
 *         description: Invalid barcode format
 *       500:
 *         description: Database error
 */
router.get('/:barcode/cooling-status', async (req: Request, res: Response) => {
  const { barcode } = req.params;

  if (!isValidBarcode(barcode)) {
    res.status(400).json({ error: 'Invalid barcode format' });
    return;
  }

  try {
    const potentialBreach = await CoolingChainRepository.hasCoolingBreachForProduct(barcode);
    res.json({ potentialBreach });
  } catch (err) {
    console.error('Failed to fetch cooling status:', err);
    res.status(500).json({ error: 'Failed to fetch cooling status' });
  }
});

export default router;
