import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import aliveRouter from './routers/alive.router';
import productsRouter from './routers/products.router';
import recallsRouter from './routers/recalls.router';
import scansRouter from './routers/scans.router';
import partiesRouter from './routers/parties.router';
import batchesRouter from './routers/batches.router';
import reportsRouter from './routers/reports.router';
import coolingChainRouter from './routers/cooling-chain.router';
import chatRouter from './routers/chat.router';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header) and listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

app.use(express.json());

app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] → ${req.method} ${req.path}`, Object.keys(req.body ?? {}).length ? req.body : '');

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    console.log(`[${new Date().toISOString()}] ← ${req.method} ${req.path} ${res.statusCode}`, body);
    return originalJson(body);
  };

  next();
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/alive', aliveRouter);
app.use('/products', productsRouter);
app.use('/recalls', recallsRouter);
app.use('/scans', scansRouter);
app.use('/parties', partiesRouter);
app.use('/batches', batchesRouter);
app.use('/products', reportsRouter);
app.use('/batches', coolingChainRouter);
app.use('/chat', chatRouter);

export default app;
