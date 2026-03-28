import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Product from './models/Product.js';
import User from './models/User.js';
import { calculateExhaustionDate } from './ml/forecastService.js';

const seedDatabase = async () => {
  console.log('🌱 Starting StockSense AI Database Seeder...');
  await connectDB();

  try {
    const user = await User.findOne();
    if (!user) {
        console.error('❌ No users found in DB. Please register at least one user first!');
        process.exit(1);
    }

    // Clear existing products
    await Product.deleteMany({});
    console.log('🧹 Cleared existing products.');

    const today = new Date();
    const daysAgo = (days) => new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

    const dummyProducts = [
      {
        name: 'Industrial Copper Wiring',
        sku: 'CW-8821',
        category: 'Other',
        currentStock: 450,
        minimumThreshold: 100,
        unit: 'spools',
        usageHistory: [
           { date: daysAgo(30), quantity: 15, note: 'Job A' },
           { date: daysAgo(25), quantity: 20, note: 'Job B' },
           { date: daysAgo(20), quantity: 18, note: 'Job C' },
           { date: daysAgo(15), quantity: 22, note: 'Job D' },
           { date: daysAgo(10), quantity: 25, note: 'Job E' },
           { date: daysAgo(5), quantity: 20, note: 'Job F' },
           { date: daysAgo(2), quantity: 30, note: 'Job G' },
        ]
      },
      {
        name: 'Aluminum Grade-A Sheets',
        sku: 'AL-9900',
        category: 'Other',
        currentStock: 120,
        minimumThreshold: 50,
        unit: 'sheets',
        usageHistory: [
           { date: daysAgo(40), quantity: 5, note: 'Repair' },
           { date: daysAgo(35), quantity: 8, note: 'Manufacturing' },
           { date: daysAgo(28), quantity: 12, note: 'Manufacturing' },
           { date: daysAgo(21), quantity: 10, note: 'Fulfillment' },
           { date: daysAgo(14), quantity: 15, note: 'Manufacturing' },
           { date: daysAgo(7), quantity: 18, note: 'Export' },
           { date: daysAgo(1), quantity: 20, note: 'Bulk Order' },
        ]
      },
      {
        name: 'Logitech MX Master 3S',
        sku: 'IT-LM3S',
        category: 'Electronics',
        currentStock: 40,
        minimumThreshold: 10,
        unit: 'units',
        usageHistory: [
           { date: daysAgo(60), quantity: 2, note: 'Onboarding' },
           { date: daysAgo(50), quantity: 3, note: 'Onboarding' },
           { date: daysAgo(40), quantity: 1, note: 'Replacement' },
           { date: daysAgo(30), quantity: 4, note: 'Expansion' },
           { date: daysAgo(20), quantity: 2, note: 'Onboarding' },
           { date: daysAgo(10), quantity: 5, note: 'Bulk Hire' },
        ]
      }
    ];

    for (let p of dummyProducts) {
      // Calculate AI fields manually for seeding
      const forecast = calculateExhaustionDate(p.usageHistory, p.currentStock);
      
      const newProduct = new Product({
        ...p,
        createdBy: user._id,
        averageDailyUsage: forecast?.averageDailyUsage || 0,
        predictedExhaustionDate: forecast?.predictedExhaustionDate || null
      });

      await newProduct.save();
      console.log(`✅ Seeded: ${newProduct.name}`);
    }

    console.log('🎉 Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
