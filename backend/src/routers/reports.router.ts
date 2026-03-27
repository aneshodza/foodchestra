import { Router, Request, Response } from 'express';
import { isValidBarcode } from '../utils/barcode';
import { getProductByBarcode } from '../repositories/products.repository';
import {
  createReport,
  getReportSummaryByProductId,
  getReportsByProductId,
  ReportCategory,
} from '../repositories/reports.repository';

const router = Router({ mergeParams: true });

const REPORT_CATEGORIES: ReportCategory[] = [
  'damaged_packaging',
  'quality_issue',
  'foreign_object',
  'mislabeled',
  'other',
];

/**
 * @openapi
 * /products/{barcode}/reports:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get reports for a product
 *     description: >
 *       Returns user-submitted reports for the given product barcode.
 *       Includes a 30-day count, a 24-hour count, and a warning flag
 *       (set when more than 4 reports are filed within 24 hours).
 *       Only reports from the last 30 days are included.
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric barcode (4–14 digits)
 *     responses:
 *       200:
 *         description: Report summary and list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 recentCount24h:
 *                   type: integer
 *                 hasWarning:
 *                   type: boolean
 *                 reports:
 *                   type: array
 *       400:
 *         description: Invalid barcode format
 *       404:
 *         description: Product not found
 */
router.get('/:barcode/reports', async (req: Request, res: Response) => {
  const { barcode } = req.params;

  if (!isValidBarcode(barcode)) {
    res.status(400).json({ error: 'Invalid barcode format' });
    return;
  }

  const product = await getProductByBarcode(barcode);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const [summary, reports] = await Promise.all([
    getReportSummaryByProductId(product.id),
    getReportsByProductId(product.id),
  ]);

  res.status(200).json({
    count: summary.count30d,
    recentCount24h: summary.recentCount24h,
    hasWarning: summary.recentCount24h > 4,
    reports: reports.map((r) => ({
      id: r.id,
      productId: r.product_id,
      category: r.category,
      description: r.description,
      createdAt: r.created_at,
    })),
  });
});

/**
 * @openapi
 * /products/{barcode}/reports:
 *   post:
 *     tags:
 *       - Reports
 *     summary: File a report for a product
 *     description: >
 *       Submits an anonymous user report for a product.
 *       The product must already be cached in the local database
 *       (i.e. have been looked up at least once via GET /products/:barcode).
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric barcode (4–14 digits)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [expired, damaged_packaging, quality_issue, foreign_object, mislabeled, other]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Report created
 *       400:
 *         description: Invalid barcode or category
 *       404:
 *         description: Product not found
 */
router.post('/:barcode/reports', async (req: Request, res: Response) => {
  const { barcode } = req.params;

  if (!isValidBarcode(barcode)) {
    res.status(400).json({ error: 'Invalid barcode format' });
    return;
  }

  const { category, description } = req.body as { category?: string; description?: string };

  if (!category || !REPORT_CATEGORIES.includes(category as ReportCategory)) {
    res.status(400).json({
      error: 'Invalid category',
      validCategories: REPORT_CATEGORIES,
    });
    return;
  }

  const product = await getProductByBarcode(barcode);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const report = await createReport({
    product_id: product.id,
    category: category as ReportCategory,
    description: description ?? null,
  });

  res.status(201).json({
    id: report.id,
    productId: report.product_id,
    category: report.category,
    description: report.description,
    createdAt: report.created_at,
  });
});

export default router;
