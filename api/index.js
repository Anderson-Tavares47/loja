const cors = require('cors');
const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const serverless = require('serverless-http');

// Configuração otimizada do Prisma
const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL, 
    },
  }
});

const app = express();
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
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

// Middleware de timeout alternativo para Vercel
app.use((req, res, next) => {
  const timeout = 8000; // 8 segundos
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  }, timeout);

  // Limpa o timeout quando a resposta é enviada
  res.on('finish', () => clearTimeout(timer));
  next();
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('API funcionando');
});

// Função auxiliar para lidar com operações do Prisma
async function handlePrismaOperation(res, operation) {
  try {
    const result = await operation();
    return result;
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

// Upload de imagem
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const result = await handlePrismaOperation(res, () => 
    prisma.image.create({
      data: {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        data: req.file.buffer,
      },
    })
  );

  if (result) res.status(201).json({ id: result.id });
});

// Obter imagem
app.get('/image/:id', async (req, res) => {
  const result = await handlePrismaOperation(res, () => 
    prisma.image.findUnique({
      where: { id: parseInt(req.params.id) },
    })
  );

  if (!result) return res.status(404).json({ error: 'Image not found' });
  
  res.set('Content-Type', result.mimetype);
  res.send(result.data);
});

// Rotas de produtos (padrão similar para outras rotas)
app.get('/products', async (req, res) => {
  const products = await handlePrismaOperation(res, () => 
    prisma.product.findMany()
  );
  
  if (products) res.json(products);
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
