import Product from '../models/Product.js';
import { calculateExhaustionDate } from '../ml/forecastService.js';
import { getIO } from '../socket.js';
import { invalidateCache } from '../middleware/cache.js';

// @desc    Get all products
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private
export const createProduct = async (req, res) => {
  try {
    const { name, sku, category, currentStock, minimumThreshold, unit, pricePerUnit, supplier } = req.body;

    const product = await Product.create({
      name,
      sku,
      category,
      currentStock,
      minimumThreshold,
      unit,
      pricePerUnit,
      supplier,
      usageHistory: [],
      createdBy: req.user.id,
    });

    // Invalidate Redis cache
    await invalidateCache('*api/products*');

    // Emit event
    getIO().emit('inventoryUpdate', { action: 'create', product });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a product or usage
// @route   PUT /api/products/:id
// @access  Private
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = req.body.name || product.name;
      product.sku = req.body.sku || product.sku;
      product.category = req.body.category || product.category;
      product.minimumThreshold = req.body.minimumThreshold !== undefined ? req.body.minimumThreshold : product.minimumThreshold;
      product.unit = req.body.unit || product.unit;
      product.pricePerUnit = req.body.pricePerUnit !== undefined ? req.body.pricePerUnit : product.pricePerUnit;
      product.supplier = req.body.supplier || product.supplier;

      // Handle stock and usage updates
      if (req.body.currentStock !== undefined) {
        // Did it decrease? Log usage
        if (req.body.currentStock < product.currentStock) {
          const used = product.currentStock - req.body.currentStock;
          product.usageHistory.push({
            date: new Date(),
            quantity: used,
            note: req.body.usageNote || 'Manual stock update',
          });
        }
        product.currentStock = req.body.currentStock;
      }

      // If user provided a specific usage entry to add directly
      if (req.body.usageEntry) {
         product.usageHistory.push(req.body.usageEntry);
         if (req.body.usageEntry.quantity) {
           product.currentStock = Math.max(0, product.currentStock - req.body.usageEntry.quantity);
         }
      }

      // Recalculate AI Exhaustion Date using Linear Regression
      const forecast = calculateExhaustionDate(product.usageHistory, product.currentStock);
      if (forecast) {
        product.predictedExhaustionDate = forecast.predictedExhaustionDate;
        product.averageDailyUsage = forecast.averageDailyUsage;
      }

      const updatedProduct = await product.save();

      await invalidateCache('*api/products*');
      getIO().emit('inventoryUpdate', { action: 'update', product: updatedProduct });

      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await Product.deleteOne({ _id: product._id });
      await invalidateCache('*api/products*');
      getIO().emit('inventoryUpdate', { action: 'delete', id: req.params.id });
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
