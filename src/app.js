const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadRoutes = require('./routes/upload.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Pasta para servir as imagens publicamente
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rotas
app.use('/api', uploadRoutes);

module.exports = app;
