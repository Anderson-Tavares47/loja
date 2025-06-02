const cors = require('cors');
const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const serverless = require('serverless-http');

// 1. Configuração otimizada do Prisma
const prisma = new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (process.env.NODE_ENV === 'production' ? '?connection_limit=5' : ''),
    },
  },
});

const app = express();

// 2. Configuração do Multer com limites
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  storage: multer.memoryStorage()
});

// 3. Middlewares otimizados
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(morgan('short'));

// 4. Handler com timeout integrado
const asyncHandler = (handler, timeoutMs = 8000) => async (req, res, next) => {
  let timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  }, timeoutMs);

  try {
    await handler(req, res, next);
  } catch (error) {
    console.error('Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    clearTimeout(timeout);
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Disconnection error:', disconnectError);
    }
  }
};

// 5. Rotas otimizadas

// Health Check (importante para Vercel)
app.get('/.well-known/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Upload com tratamento de erro melhorado
app.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const result = await prisma.image.create({
    data: {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      data: req.file.buffer,
    },
    select: { id: true } // Apenas retorna o ID
  });

  res.status(201).json(result);
}, 10000)); // 10s para uploads

// Listagem de produtos com paginação
app.get('/products', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  const products = await prisma.product.findMany({
    take: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      price: true,
      imageId: true
    }
  });

  res.json({
    data: products,
    page: parseInt(page),
    limit: parseInt(limit)
  });
}));

// Detalhes do produto
app.get('/products/:id', asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { image: { select: { mimetype: true } } }
  });

  if (!product) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }

  res.json(product);
}));

// 6. Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Ocorreu um erro inesperado' });
});

// 7. Exportação otimizada para Vercel
module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/octet-stream'],
  callbackWaitsForEmptyEventLoop: false
});
