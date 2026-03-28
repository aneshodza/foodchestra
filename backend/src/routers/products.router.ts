import type { Request, Response } from 'express';
import { Router } from 'express';
import { isValidBarcode } from '../utils/barcode';
import { lookupProduct } from '../services/products.service';
import { enrichProduct } from '../services/enrichment.service';
import { searchRecallsByText } from '../repositories/recalls.repository';
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

/**
 * @openapi
 * /products/{barcode}/recalls:
 *   get:
 *     tags:
 *       - Products
 *     summary: Find government recalls matching a product
 *     description: >
 *       Looks up the product name and brand from the local cache (OpenFoodFacts),
 *       then runs a PostgreSQL full-text search (simple dictionary, language-agnostic)
 *       across all DE/FR/IT recall text columns. Returns up to 5 matching recalls.
 *       Returns an empty array if the product has never been looked up (not yet cached).
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric barcode (4–14 digits)
 *     responses:
 *       200:
 *         description: Matched recalls (may be empty)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - recalls
 *               properties:
 *                 recalls:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid barcode format
 *       500:
 *         description: Database error
 */
router.get('/:barcode/recalls', async (req: Request, res: Response) => {
  const { barcode } = req.params;

  if (!isValidBarcode(barcode)) {
    res.status(400).json({ error: 'Invalid barcode format' });
    return;
  }

  try {
    const result = await lookupProduct(barcode);

    if ('error' in result || !result.found || !result.product) {
      res.status(200).json({ recalls: [] });
      return;
    }

    const { name, brands } = result.product;
    const query = [name, brands].filter(Boolean).join(' ');

    if (!query.trim()) {
      res.status(200).json({ recalls: [] });
      return;
    }

    const rows = await searchRecallsByText(query);

    res.status(200).json({
      recalls: rows.map((r) => ({
        id: r.id,
        headerDe: r.header_de,
        headerFr: r.header_fr,
        headerIt: r.header_it,
        descriptionDe: r.description_de,
        descriptionFr: r.description_fr,
        descriptionIt: r.description_it,
        metaDe: r.meta_de,
        imageUrlDe: r.image_url_de,
        authorityCodeDe: r.authority_code_de,
        authorityNameDe: r.authority_name_de,
      })),
    });
  } catch (err) {
    console.error('GET /products/:barcode/recalls error:', err);
    res.status(500).json({ error: 'Failed to fetch recalls' });
  }
});

/**
 * @openapi
 * /products/{barcode}/enrichment:
 *   get:
 *     tags:
 *       - Products
 *     summary: AI-powered product enrichment
 *     description: >
 *       Fetches the product and all government recalls, then sends both to the AI agent
 *       to produce a structured enrichment: safety level, matched recalls, allergen
 *       warnings, sustainability note, and quality note. Results are generated fresh on
 *       every call. Returns 404 if the product is not found.
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI enrichment result
 *       400:
 *         description: Invalid barcode format
 *       404:
 *         description: Product not found
 *       500:
 *         description: Enrichment failed
 */
router.get('/:barcode/enrichment', async (req: Request, res: Response) => {
  const { barcode } = req.params;

  if (!isValidBarcode(barcode)) {
    res.status(400).json({ error: 'Invalid barcode format' });
    return;
  }

  try {
    const result = await enrichProduct(barcode);

    if (!result) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(result);
  } catch (err) {
    console.error('GET /products/:barcode/enrichment error:', err);
    res.status(500).json({ error: 'Enrichment failed' });
  }
});

export default router;
