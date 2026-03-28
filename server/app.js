import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import http from 'http';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { initSocket } from './socket.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for easier development with sockets
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Connect to databases
connectDB();
connectRedis();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

app.get('/', (req, res) => {
  res.send('StockSense API is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
