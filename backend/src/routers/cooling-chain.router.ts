import type { Request, Response } from 'express';
import { Router } from 'express';
import { SupplyChainRepository } from '../repositories/supply-chain.repository';
import { CoolingChainRepository } from '../repositories/cooling-chain.repository';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     CoolingChainReading:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         edgeId:
 *           type: string
 *           format: uuid
 *         recordedAt:
 *           type: string
 *           format: date-time
 *         celsius:
 *           type: number
 *     CoolingChainEdgeData:
 *       type: object
 *       properties:
 *         edgeId:
 *           type: string
 *           format: uuid
 *         fromNodeId:
 *           type: string
 *           format: uuid
 *         toNodeId:
 *           type: string
 *           format: uuid
 *         readings:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CoolingChainReading'
 */

/**
 * @openapi
 * /batches/by-number/{batchNumber}/supply-chain/cooling:
 *   get:
 *     tags:
 *       - Batches
 *     summary: Get cooling chain readings for all transport edges in a batch's supply chain
 *     parameters:
 *       - in: path
 *         name: batchNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch number as printed on the product (e.g. LOT-2026-JW-042)
 *       - in: query
 *         name: barcode
 *         required: false
 *         schema:
 *           type: string
 *         description: Product barcode to disambiguate when multiple products share the same batch number
 *     responses:
 *       200:
 *         description: Temperature readings grouped by edge
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CoolingChainEdgeData'
 *       400:
 *         description: Multiple batches found — provide a barcode to narrow to one
 *       404:
 *         description: Batch or supply chain not found
 *       500:
 *         description: Database error
 */
router.get('/by-number/:batchNumber/supply-chain/cooling', async (req: Request, res: Response) => {
  try {
    const barcode = typeof req.query.barcode === 'string' ? req.query.barcode : undefined;
    const batches = await SupplyChainRepository.findByBatchNumber(req.params.batchNumber, barcode);

    if (batches.length === 0) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    if (batches.length > 1) {
      res.status(400).json({ error: 'Multiple batches found for this batch number — provide a barcode to narrow results' });
      return;
    }

    const batch = batches[0];
    const supplyChain = await SupplyChainRepository.findSupplyChainByBatch(batch.id);
    if (!supplyChain) {
      res.status(404).json({ error: 'No supply chain found for this batch' });
      return;
    }

    const coolingData = await CoolingChainRepository.findBySupplyChain(supplyChain.id);
    res.json(coolingData);
  } catch (err) {
    console.error('Failed to fetch cooling chain:', err);
    res.status(500).json({ error: 'Failed to fetch cooling chain' });
  }
});

export default router;
