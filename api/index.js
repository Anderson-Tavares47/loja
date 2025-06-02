const cors = require('cors');
const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const serverless = require('serverless-http');

// Configuração ultra-otimizada do Prisma para Vercel
const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=5&pool_timeout=10',
    },
  },
});

const app = express();

// Configuração segura de upload
const upload = multer({
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB (deixando margem de segurança)
    files: 1
  },
  storage: multer.memoryStorage()
});

// Middlewares essenciais apenas
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json({ limit: '1mb' }));

// Sistema de timeout aprimorado
const asyncHandler = (handler, timeoutMs = 5000) => async (req, res) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  }, timeoutMs);

  try {
    await handler(req, res);
  } catch (error) {
    console.error('Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    clearTimeout(timeout);
    await prisma.$disconnect().catch(() => null);
  }
};

// Health Check (crítico para Vercel)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Rotas principais com timeout específico
app.post('/api/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const image = await prisma.image.create({
    data: {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      data: req.file.buffer,
    },
    select: { id: true }
  });

  res.status(201).json(image);
}, 8000)); // 8s para upload

app.get('/api/products', asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      price: true,
      createdAt: true
    }
  });

  res.json(products);
}));

// Exportação otimizada para Vercel
module.exports.handler = serverless(app, {
  binary: ['image/*'],
  callbackWaitsForEmptyEventLoop: false
});
