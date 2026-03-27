import { Router, Request, Response } from 'express';
import { ScansRepository } from '../repositories/scans.repository';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Scan:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         scan_result:
 *           type: string
 *         scan_type:
 *           type: string
 *           enum: [qr, barcode, ocr, manual]
 *         scanned_at:
 *           type: string
 *           format: date-time
 *         metadata:
 *           type: object
 */

/**
 * @openapi
 * /scans:
 *   post:
 *     tags:
 *       - Scans
 *     summary: Log a new product scan
 *     description: Anonymously records a scan result and type for evaluation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scanResult
 *               - scanType
 *             properties:
 *               scanResult:
 *                 type: string
 *                 description: Decoded text from the QR/Barcode
 *               scanType:
 *                 type: string
 *                 enum: [qr, barcode, ocr, manual]
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Scan successfully logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Scan'
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Database error
 */
router.post('/', async (req: Request, res: Response) => {
  const { scanResult, scanType, metadata } = req.body;

  if (!scanResult || !scanType) {
    res.status(400).json({ error: 'Missing scanResult or scanType' });
    return;
  }

  try {
    const scan = await ScansRepository.create({
      scanResult,
      scanType,
      metadata,
    });
    res.status(201).json(scan);
  } catch (err) {
    console.error('Failed to log scan:', err);
    res.status(500).json({ error: 'Failed to log scan' });
  }
});

export default router;
