import express from 'express';
import cors from 'cors';
import { apiRouter } from './api.mjs';

export const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

