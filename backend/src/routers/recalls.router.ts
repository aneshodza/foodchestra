import { Router, Request, Response } from 'express';
import { getRecalls } from '../repositories/recalls.repository';

const router = Router();

/**
 * @openapi
 * /recalls:
 *   get:
 *     tags:
 *       - Recalls
 *     summary: List government recalls from RecallSwiss
 *     description: >
 *       Returns a paginated list of recalls fetched from the Swiss government
 *       RecallSwiss feed. Data is synced every hour. Recalls include product
 *       names, descriptions, and the responsible authority in DE/FR/IT.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (1-indexed)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Paginated list of recalls
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - recalls
 *                 - total
 *                 - page
 *                 - pageSize
 *               properties:
 *                 recalls:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *       500:
 *         description: Database error
 */
router.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['pageSize'] ?? '20'), 10) || 20));

  try {
    const { rows, total } = await getRecalls(page, pageSize);
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
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('GET /recalls error:', err);
    res.status(500).json({ error: 'Failed to fetch recalls' });
  }
});

export default router;
