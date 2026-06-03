import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { convertToBase, UNIT_LOOKUP } from '@/lib/units';
import { Prisma } from '@prisma/client';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { sku, name, description, category, dimension, inventoryQuantity, inventoryUnit, priceRate, priceUnit } = body;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Validation
    if (!sku || !name || !dimension || !inventoryUnit || !priceUnit || inventoryQuantity === undefined || priceRate === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (new Prisma.Decimal(inventoryQuantity).isNegative() || new Prisma.Decimal(priceRate).isNegative()) {
      return NextResponse.json({ error: 'Quantity and price must be non-negative' }, { status: 400 });
    }

    // Verify units
    const invUnitLookup = UNIT_LOOKUP[inventoryUnit];
    const prUnitLookup = UNIT_LOOKUP[priceUnit];

    if (!invUnitLookup || !prUnitLookup) {
      return NextResponse.json({ error: 'Invalid units' }, { status: 400 });
    }

    if (invUnitLookup.dimension !== dimension || prUnitLookup.dimension !== dimension) {
      return NextResponse.json({ error: 'Units dimension mismatch' }, { status: 400 });
    }

    // Check SKU collision
    if (sku !== product.sku) {
      const skuCheck = await prisma.product.findUnique({
        where: { sku },
      });
      if (skuCheck) {
        return NextResponse.json({ error: 'SKU is already taken by another product' }, { status: 400 });
      }
    }

    // Convert values to base
    const inventoryBalance = convertToBase(inventoryQuantity, inventoryUnit);
    const basePrice = new Prisma.Decimal(priceRate).div(prUnitLookup.info.factor);
    const baseUnit = invUnitLookup.dimension === 'WEIGHT' ? 'g' : invUnitLookup.dimension === 'VOLUME' ? 'mL' : 'items';

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
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

    return NextResponse.json({ product: updatedProduct });
  } catch (error: any) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
