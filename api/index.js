const express = require('express');
const { PrismaClient } = require('@prisma/client');
const serverless = require('serverless-http'); // Versão estável

// Configuração à prova de erros do Prisma
const prisma = new PrismaClient({
  log: ['warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=3',
    },
  },
});

const app = express();

// Middlewares básicos
app.use(express.json());

// Rota de saúde simplificada
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Rota de exemplo
app.get('/api/test', async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, db: 'connected' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Exportação compatível com Vercel
module.exports.handler = serverless(app);
