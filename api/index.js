import express from 'express';
import cors from 'cors';
import { apiRouter } from '../src/server/api.mjs';

const app = express();

app.use(cors());
app.use(express.json());

// Handle both with and without /api prefix
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;

