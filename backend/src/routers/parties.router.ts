import { Router, Request, Response } from 'express';
import { SupplyChainRepository } from '../repositories/supply-chain.repository';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Party:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [farmer, processor, distributor, warehouse, retailer]
 *         created_at:
 *           type: string
 *           format: date-time
 *     PartyLocation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         party_id:
 *           type: string
 *           format: uuid
 *         label:
 *           type: string
 *         latitude:
 *           type: number
 *         longitude:
 *           type: number
 *         address:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /parties:
 *   get:
 *     tags:
 *       - Parties
 *     summary: List all parties
 *     responses:
 *       200:
 *         description: Array of parties
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Party'
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const parties = await SupplyChainRepository.findAllParties();
    res.json(parties);
  } catch (err) {
    console.error('Failed to fetch parties:', err);
    res.status(500).json({ error: 'Failed to fetch parties' });
  }
});

/**
 * @openapi
 * /parties/{id}/locations:
 *   get:
 *     tags:
 *       - Parties
 *     summary: List all locations for a party
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Array of locations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PartyLocation'
 *       404:
 *         description: Party not found
 */
router.get('/:id/locations', async (req: Request, res: Response) => {
  try {
    const party = await SupplyChainRepository.findPartyById(req.params.id);
    if (!party) {
      res.status(404).json({ error: 'Party not found' });
      return;
    }
    const locations = await SupplyChainRepository.findLocationsByParty(req.params.id);
    res.json(locations);
  } catch (err) {
    console.error('Failed to fetch locations:', err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

export default router;
