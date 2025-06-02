const express = require('express');
const { PrismaClient } = require('@prisma/client');
const serverless = require('serverless-http');

// 1. Configuração do Prisma
const prisma = new PrismaClient({
  log: ['warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=3',
    },
  },
});

// 2. Criação do app Express
const app = express();

// 3. Middlewares
app.use(express.json());

// 4. Rotas
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/test', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, db: 'connected' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 5. Exportação CORRETA para Vercel
const handler = serverless(app);
module.exports = { handler }; // Formato que o Vercel espera
