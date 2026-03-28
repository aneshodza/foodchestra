import type { Request, Response } from 'express';
import { Router } from 'express';
import { SupplyChainRepository } from '../repositories/supply-chain.repository';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Batch:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         productBarcode:
 *           type: string
 *         batchNumber:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     SupplyChain:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         batchId:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         nodes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               label:
 *                 type: string
 *               arrivedAt:
 *                 type: string
 *                 format: date-time
 *               departedAt:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   label:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *                   party:
 *                     $ref: '#/components/schemas/Party'
 *         edges:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               fromNodeId:
 *                 type: string
 *                 format: uuid
 *               toNodeId:
 *                 type: string
 *                 format: uuid
 */

/**
 * @openapi
 * /batches:
 *   post:
 *     tags:
 *       - Batches
 *     summary: Create a new batch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productBarcode
 *               - batchNumber
 *             properties:
 *               productBarcode:
 *                 type: string
 *               batchNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Batch created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Batch'
 *       400:
 *         description: Missing required fields or duplicate batch
 *       500:
 *         description: Database error
 */
router.post('/', async (req: Request, res: Response) => {
  const { productBarcode, batchNumber } = req.body;

  if (!productBarcode || !batchNumber) {
    res.status(400).json({ error: 'Missing productBarcode or batchNumber' });
    return;
  }

  try {
    const existing = await SupplyChainRepository.findBatchByProductAndNumber(
      productBarcode,
      batchNumber,
    );
    if (existing) {
      res.status(400).json({ error: 'Batch already exists for this product and batch number' });
      return;
    }

    const batch = await SupplyChainRepository.createBatch({ productBarcode, batchNumber });
    res.status(201).json(batch);
  } catch (err) {
    console.error('Failed to create batch:', err);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

/**
 * @openapi
 * /batches/by-number/{batchNumber}:
 *   get:
 *     tags:
 *       - Batches
 *     summary: Find batches by batch number
 *     parameters:
 *       - in: path
 *         name: batchNumber
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: barcode
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional product barcode to narrow results to a single product
 *     responses:
 *       200:
 *         description: Matching batches (may be multiple products with the same batch number)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Batch'
 *       404:
 *         description: No batches found
 */
router.get('/by-number/:batchNumber', async (req: Request, res: Response) => {
  try {
    const barcode = typeof req.query.barcode === 'string' ? req.query.barcode : undefined;
    const batches = await SupplyChainRepository.findByBatchNumber(req.params.batchNumber, barcode);
    if (batches.length === 0) {
      res.status(404).json({ error: 'No batches found for this batch number' });
      return;
    }
    res.json(batches);
  } catch (err) {
    console.error('Failed to fetch batches by number:', err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

/**
 * @openapi
 * /batches/{id}:
 *   get:
 *     tags:
 *       - Batches
 *     summary: Get a batch by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Batch found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Batch'
 *       404:
 *         description: Batch not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const batch = await SupplyChainRepository.findBatchById(req.params.id);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }
    res.json(batch);
  } catch (err) {
    console.error('Failed to fetch batch:', err);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

/**
 * @openapi
 * /batches/{id}/supply-chain:
 *   get:
 *     tags:
 *       - Batches
 *     summary: Get the supply chain for a batch
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Supply chain with nodes and edges
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplyChain'
 *       404:
 *         description: Batch or supply chain not found
 */
router.get('/:id/supply-chain', async (req: Request, res: Response) => {
  try {
    const batch = await SupplyChainRepository.findBatchById(req.params.id);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const supplyChain = await SupplyChainRepository.findSupplyChainByBatch(req.params.id);
    if (!supplyChain) {
      res.status(404).json({ error: 'No supply chain found for this batch' });
      return;
    }

    res.json(supplyChain);
  } catch (err) {
    console.error('Failed to fetch supply chain:', err);
    res.status(500).json({ error: 'Failed to fetch supply chain' });
  }
});

export default router;
