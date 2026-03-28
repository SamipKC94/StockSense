import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protect } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

router.route('/')
  .get(protect, cacheMiddleware('api-products'), getProducts)
  .post(protect, createProduct);

router.route('/:id')
  .get(protect, getProductById)
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

export default router;
