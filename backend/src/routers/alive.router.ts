import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @openapi
 * /alive:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     description: Returns 200 if the service is running
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
