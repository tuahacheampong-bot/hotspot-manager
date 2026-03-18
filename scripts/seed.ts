/**
 * Seed the database with default hotspot plans.
 * Run: npm run seed
 * 
 * Uses ts-node with CommonJS module resolution (see package.json).
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotspot-manager';

// Inline Plan schema to avoid Next.js import issues in scripts
const planSchema = new mongoose.Schema(
  {
    planId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    duration: { type: String, required: true },
    dataLimit: { type: String, default: 'Unlimited' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'GHS' },
    features: { type: [String], default: [] },
    popular: { type: Boolean, default: false },
    uptimeLimit: { type: String, default: '0s' },
    bytesLimit: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

const DEFAULT_PLANS = [
  {
    planId: '1-day',
    name: '1 Day Pass',
    description: 'Perfect for a quick browsing session',
    duration: '24 hours',
    dataLimit: '10GB',
    price: 500,
    currency: 'GHS',
    features: ['24-hour access', '10GB data cap', '5Mbps speed'],
    popular: false,
    uptimeLimit: '1d0h',
    bytesLimit: 10 * 1024 * 1024 * 1024, // 10GB in bytes
    active: true,
  },
  {
    planId: '7-day',
    name: 'Weekly Pass',
    description: 'Best value for regular users',
    duration: '7 days',
    dataLimit: '50GB',
    price: 2500,
    currency: 'GHS',
    features: ['7-day access', '50GB data cap', '10Mbps speed'],
    popular: false,
    uptimeLimit: '7d0h',
    bytesLimit: 50 * 1024 * 1024 * 1024, // 50GB
    active: true,
  },
  {
    planId: 'monthly',
    name: 'Monthly Pass',
    description: 'Great for heavy users',
    duration: '30 days',
    dataLimit: '150GB',
    price: 6000,
    currency: 'GHS',
    features: ['30-day access', '150GB data cap', '10Mbps speed'],
    popular: true,
    uptimeLimit: '30d0h',
    bytesLimit: 150 * 1024 * 1024 * 1024, // 150GB
    active: true,
  },
  {
    planId: 'unlimited',
    name: 'Unlimited',
    description: 'No limits, no worries',
    duration: '30 days',
    dataLimit: 'Unlimited',
    price: 8000,
    currency: 'GHS',
    features: ['30-day access', 'Unlimited data', '15Mbps speed'],
    popular: false,
    uptimeLimit: '0s', // 0s = unlimited in MikroTik
    bytesLimit: 0, // 0 = unlimited
    active: true,
  },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // Clear existing plans
    const existingCount = await Plan.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing plans.`);
      const answer = process.argv.includes('--force')
        ? 'y'
        : '';
      
      if (answer.toLowerCase() !== 'y') {
        console.log('Use --force to overwrite existing plans. Updating/upserting instead...');
        
        for (const plan of DEFAULT_PLANS) {
          const result = await Plan.findOneAndUpdate(
            { planId: plan.planId },
            plan,
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          console.log(`  ✓ ${result.name} (${result.planId})`);
        }
        
        console.log(`\nDone! ${DEFAULT_PLANS.length} plans seeded/updated.`);
        await mongoose.disconnect();
        return;
      }
    }

    // Clear and re-insert
    await Plan.deleteMany({});
    console.log('Cleared existing plans.');

    const inserted = await Plan.insertMany(DEFAULT_PLANS);
    console.log(`Inserted ${inserted.length} plans:`);
    for (const plan of inserted) {
      console.log(`  ✓ ${plan.name} (${plan.planId}) — GH₵${plan.price}`);
    }

    console.log('\nSeed complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
