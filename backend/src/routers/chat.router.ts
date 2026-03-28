import type { Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

const AGENT_URL = process.env['AGENT_URL'] ?? 'http://localhost:3001';

/**
 * @openapi
 * /chat:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Send a message to the AI agent
 *     description: Proxies the message (and optional page context) to the agent service and returns its response.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               context:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agent response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *       400:
 *         description: Missing message
 *       502:
 *         description: Agent service error
 */
router.post('/', async (req: Request, res: Response) => {
  const { message, context, history } = req.body as { message?: string; context?: string; history?: string[] };

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  try {
    const agentRes = await fetch(`${AGENT_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, history }),
    });

    if (!agentRes.ok) {
      console.error(`Agent responded with ${agentRes.status}`);
      res.status(502).json({ error: 'Agent service error' });
      return;
    }

    const data = (await agentRes.json()) as { response: string; toolSteps: string[] };
    res.json({ response: data.response, toolSteps: data.toolSteps });
  } catch (err) {
    console.error('Chat proxy error:', err);
    res.status(502).json({ error: 'Could not reach agent service' });
  }
});

export default router;
