const cors = require('cors');
const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const { param, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const upload = multer();

app.use(cors({
  origin: [
    'http://localhost:1107',
    'https://loja-front-one.vercel.app',
    'https://lojaauchic.com.br',
    'https://www.lojaauchic.com.br'
  ]
}));


// app.use(cors({ origin: '*' }));
app.use(express.json()); // ✅ para aceitar JSON
app.use(morgan('dev'));  // ✅ logs

app.get('/', (req, res) => {
    res.send('Funcionou sapohha');
});

// ✅ Upload de imagem
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

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
  }
});

// ✅ Buscar imagem
// app.get('/image/:id', async (req, res) => {
//   try {
//     const { id } = req.params;

//     const image = await prisma.image.findUnique({
//       where: { id: parseInt(id) },
//     });

//     if (!image) {
//       return res.status(404).json({ error: 'Image not found' });
//     }

//     res.set('Content-Type', image.mimetype);
//     res.send(image.data);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Erro ao buscar imagem' });
//   }
// });

app.get('/image/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const image = await prisma.image.findUnique({
      where: { id: parseInt(id) },
    });

    if (!image) {
      console.log(`❌ Image not found for ID ${id}`);
      return res.status(404).json({ error: 'Image not found' });
    }

    console.log(`🟢 Servindo imagem ID ${id} - ${image.mimetype}, tamanho: ${image.data?.length}`);

    res.set('Content-Type', image.mimetype);
    res.send(Buffer.from(image.data)); // 🔒 Garante que é Buffer
  } catch (err) {
    console.error(`🔥 Erro ao buscar imagem ID ${req.params.id}:`, err);
    res.status(500).json({ error: 'Erro ao buscar imagem' });
  }
});


// ✅ Deletar imagem
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
  }
});

// ✅ Listar todos os produtos
app.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// ✅ Obter produto por ID
// app.get('/products/:id', async (req, res) => {
//   try {
//     const { id } = req.params;

//     const product = await prisma.product.findUnique({
//       where: { id: parseInt(id) },
//     });

//     if (!product) {
//       return res.status(404).json({ error: 'Produto não encontrado' });
//     }

//     res.json(product);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Erro ao buscar produto' });
//   }
// });


app.get('/products/:id',
  param('id').isInt().withMessage('ID deve ser um número inteiro'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = parseInt(req.params.id, 10);
    try {
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      res.json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao buscar produto' });
    }
  }
);



// ✅ Criar produto
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
  }
});

// ✅ Atualizar produto
// app.put('/products/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, description, price, imageId } = req.body;

//     const updated = await prisma.product.update({
//       where: { id: parseInt(id) },
//       data: {
//         name,
//         description,
//         price: parseFloat(price),
//         imageId: parseInt(imageId),
//       },
//     });

//     res.json(updated);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Erro ao atualizar produto' });
//   }
// });

app.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, imageId } = req.body;

    const data: any = {
      name,
      description,
      price: parseFloat(price),
    };

    if (imageId !== undefined && imageId !== null) {
      data.imageId = parseInt(imageId);
    }

    const updated = await prisma.product.update({
      where: { id: parseInt(id) },
      data,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});



// ✅ Deletar produto
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
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
