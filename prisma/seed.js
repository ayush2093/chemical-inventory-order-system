const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required for seeding.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const sellerPasswordHash = await bcrypt.hash('seller123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'System Admin',
      passwordHash: adminPasswordHash,
      role: 'admin',
    },
  });
  console.log(`Created/verified Admin user: ${admin.email}`);

  const seller = await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: {},
    create: {
      email: 'seller@example.com',
      name: 'Seller Agent',
      passwordHash: sellerPasswordHash,
      role: 'seller',
    },
  });
  console.log(`Created/verified Seller user: ${seller.email}`);

  // 2. Create Products
  const products = [
    {
      sku: 'ETH-001',
      name: 'Ethanol (Pure)',
      description: 'High purity chemical grade ethanol, suitable for research and lab processes.',
      category: 'Solvents',
      dimension: 'VOLUME',
      baseUnit: 'mL',
      inventoryBalance: 50000.0, // 50 Liters
      basePrice: 1.2, // 1.2 INR per mL (1200 INR per L)
    },
    {
      sku: 'NACL-002',
      name: 'Sodium Chloride',
      description: 'Laboratory grade sodium chloride fine powder.',
      category: 'Salts',
      dimension: 'WEIGHT',
      baseUnit: 'g',
      inventoryBalance: 25000.0, // 25 kg
      basePrice: 0.45, // 0.45 INR per gram (450 INR per kg)
    },
    {
      sku: 'BEA-250',
      name: 'Glass Beaker 250mL',
      description: 'Borosilicate glass beaker with graduation marks.',
      category: 'Glassware',
      dimension: 'COUNT',
      baseUnit: 'items',
      inventoryBalance: 100.0, // 100 items
      basePrice: 150.0, // 150 INR per item
    },
    {
      sku: 'HCL-003',
      name: 'Hydrochloric Acid 37%',
      description: 'Concentrated hydrochloric acid 37% for laboratory use.',
      category: 'Acids',
      dimension: 'VOLUME',
      baseUnit: 'mL',
      inventoryBalance: 10000.0, // 10 Liters
      basePrice: 1.8, // 1.8 INR per mL (1800 INR per L)
    },
    {
      sku: 'ASP-004',
      name: 'Aspirin Compound',
      description: 'Acetylsalicylic acid powder, chemical grade.',
      category: 'Active Compounds',
      dimension: 'WEIGHT',
      baseUnit: 'g',
      inventoryBalance: 500.0, // 500 grams
      basePrice: 12.0, // 12 INR per gram
    },
  ];

  for (const prod of products) {
    const createdProduct = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {
        inventoryBalance: prod.inventoryBalance,
        basePrice: prod.basePrice,
      },
      create: prod,
    });
    console.log(`Upserted Product: ${createdProduct.name} (SKU: ${createdProduct.sku})`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
