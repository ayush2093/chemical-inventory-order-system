import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { convertToBase, UNIT_LOOKUP } from '@/lib/units';
import { Prisma } from '@prisma/client';

// GET: Fetch products with search and filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const dimension = searchParams.get('dimension') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (dimension) {
      where.dimension = dimension;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('Fetch products error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a product (Admin only)
export async function POST(request: Request) {
  try {
    const token = cookies().get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { sku, name, description, category, dimension, inventoryQuantity, inventoryUnit, priceRate, priceUnit } = body;

    // Validation
    if (!sku || !name || !dimension || !inventoryUnit || !priceUnit || inventoryQuantity === undefined || priceRate === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (new Prisma.Decimal(inventoryQuantity).isNegative() || new Prisma.Decimal(priceRate).isNegative()) {
      return NextResponse.json({ error: 'Quantity and price must be non-negative' }, { status: 400 });
    }

    // Verify unit lookup
    const invUnitLookup = UNIT_LOOKUP[inventoryUnit];
    const prUnitLookup = UNIT_LOOKUP[priceUnit];

    if (!invUnitLookup || !prUnitLookup) {
      return NextResponse.json({ error: 'Invalid units specified' }, { status: 400 });
    }

    if (invUnitLookup.dimension !== dimension || prUnitLookup.dimension !== dimension) {
      return NextResponse.json({ error: 'Units do not match product dimension' }, { status: 400 });
    }

    const baseUnit = invUnitLookup.dimension === 'WEIGHT' ? 'g' : invUnitLookup.dimension === 'VOLUME' ? 'mL' : 'items';

    // Convert inventory quantity to base unit
    const inventoryBalance = convertToBase(inventoryQuantity, inventoryUnit);

    // Convert price to price per base unit: basePrice = priceRate / factorOfPriceUnit
    const basePrice = new Prisma.Decimal(priceRate).div(prUnitLookup.info.factor);

    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      return NextResponse.json({ error: 'Product SKU already exists' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        category,
        dimension,
        baseUnit,
        inventoryBalance,
        basePrice,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
