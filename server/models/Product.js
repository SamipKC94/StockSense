import mongoose from 'mongoose';

const usageEntrySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Electronics', 'Clothing', 'Food', 'Medicine', 'Furniture', 'Stationery', 'Other'],
      default: 'Other',
    },
    currentStock: {
      type: Number,
      required: [true, 'Current stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    minimumThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    unit: {
      type: String,
      default: 'units',
    },
    pricePerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
    supplier: {
      type: String,
      trim: true,
    },
    usageHistory: {
      type: [usageEntrySchema],
      default: [],
    },
    // AI-generated fields
    predictedExhaustionDate: {
      type: Date,
      default: null,
    },
    averageDailyUsage: {
      type: Number,
      default: 0,
    },
    forecastConfidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: stockStatus
productSchema.virtual('stockStatus').get(function () {
  if (this.currentStock === 0) return 'out_of_stock';
  if (this.currentStock <= this.minimumThreshold) return 'low';
  if (this.currentStock <= this.minimumThreshold * 2) return 'medium';
  return 'healthy';
});

// Index for faster search
productSchema.index({ name: 'text', sku: 'text' });
productSchema.index({ category: 1, stockStatus: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
