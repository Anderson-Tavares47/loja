const cors = require('cors');
const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const serverless = require('serverless-http');

// Configuração otimizada do Prisma para ambiente serverless
const prisma = new PrismaClient({
  log: ['error'], // Reduz logs em produção
  datasources: {
    db: {
      url: process.env.DATABASE_URL, 
    },
  },
  __internal: {
    engine: {
      enableEngineDebugMode: false
    }
  }
});

const app = express();
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB para uploads
  }
});

// Middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://seusite.com' // Substitua pelo seu domínio
}));
app.use(express.json());
app.use(morgan('dev'));

// Middleware de timeout
app.use((req, res, next) => {
  res.setTimeout(8000, () => {
    res.status(504).json({ error: 'Request timeout' });
  });
  next();
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('API funcionando');
});

// Upload de imagem
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const image = await prisma.image.create({
      data: {
        filename: file.originalname,
        mimetype: file.mimetype,
        data: file.buffer,
      },
    });

    res.status(201).json({ id: image.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no upload' });
  } finally {
    await prisma.$disconnect();
  }
});

// Obter imagem
app.get('/image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const image = await prisma.image.findUnique({
      where: { id: parseInt(id) },
    });

    if (!image) return res.status(404).json({ error: 'Image not found' });

    res.set('Content-Type', image.mimetype);
    res.send(image.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar imagem' });
  } finally {
    await prisma.$disconnect();
  }
});

// Deletar imagem
app.delete('/image/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.image.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar imagem' });
  } finally {
    await prisma.$disconnect();
  }
});

// Rotas de produtos
app.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  } finally {
    await prisma.$disconnect();
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  } finally {
    await prisma.$disconnect();
  }
});

app.post('/products', async (req, res) => {
  try {
    const { name, description, price, imageId } = req.body;

    if (!name || !description || !price || !imageId) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        imageId: parseInt(imageId),
      },
    });

    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar produto' });
  } finally {
    await prisma.$disconnect();
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, imageId } = req.body;

    const updated = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        price: parseFloat(price),
        imageId: parseInt(imageId),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  } finally {
    await prisma.$disconnect();
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  } finally {
    await prisma.$disconnect();
  }
});

// Exportação para o Vercel
module.exports = serverless(app);
