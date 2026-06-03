import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { convertToBase, getUnitPriceForTargetUnit, calculateTotal, UNIT_LOOKUP } from '@/lib/units';
import { Prisma } from '@prisma/client';

// GET: Fetch orders
export async function GET() {
  try {
    const token = cookies().get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isClientAdmin = user.role === 'admin';

    const orders = await prisma.order.findMany({
      where: isClientAdmin ? {} : { userId: user.id },
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
        items: {
          include: {
            product: {
              select: { sku: true, name: true, dimension: true, baseUnit: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Place a quotation / order
export async function POST(request: Request) {
  try {
    const token = cookies().get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    // Process items and verify stock/validity
    const orderItemsToCreate: any[] = [];
    let orderTotalPrice = new Prisma.Decimal(0);

    for (const item of items) {
      const { productId, orderedQuantity, orderedUnit } = item;

      if (!productId || orderedQuantity === undefined || !orderedUnit) {
        return NextResponse.json({ error: 'Invalid item data' }, { status: 400 });
      }

      const qVal = new Prisma.Decimal(orderedQuantity);
      if (qVal.isNegative() || qVal.isZero()) {
        return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json({ error: `Product not found` }, { status: 400 });
      }

      // Check unit dimension match
      const unitLookup = UNIT_LOOKUP[orderedUnit];
      if (!unitLookup || unitLookup.dimension !== product.dimension) {
        return NextResponse.json({
          error: `Unit '${orderedUnit}' is invalid for product '${product.name}' (${product.dimension})`,
        }, { status: 400 });
      }

      const quantityInBase = convertToBase(qVal, orderedUnit);

      // Check inventory balance
      const balance = new Prisma.Decimal(product.inventoryBalance);
      if (balance.lessThan(quantityInBase)) {
        const availableInOrderedUnit = balance.div(unitLookup.info.factor);
        return NextResponse.json({
          error: `Insufficient inventory for '${product.name}'. Available: ${availableInOrderedUnit.toFixed(4)} ${orderedUnit}, requested: ${qVal.toFixed(4)} ${orderedUnit}`,
        }, { status: 400 });
      }

      // Calculate pricing
      const unitPriceInOrderedUnit = getUnitPriceForTargetUnit(product.basePrice, orderedUnit);
      const totalItemPrice = calculateTotal(qVal, orderedUnit, product.basePrice);

      orderTotalPrice = orderTotalPrice.add(totalItemPrice);

      orderItemsToCreate.push({
        productId: product.id,
        orderedQuantity: qVal,
        orderedUnit,
        quantityInBaseUnit: quantityInBase,
        unitPriceInOrderedUnit,
        totalItemPrice,
      });
    }

    // Perform interactive transaction to deduct stock and create order
    const order = await prisma.$transaction(async (tx) => {
      // 1. Verify and update stock for each item inside the transaction (concurrency-safe)
      for (const item of orderItemsToCreate) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error('Product not found during checkout transaction');
        }

        const balance = new Prisma.Decimal(product.inventoryBalance);
        if (balance.lessThan(item.quantityInBaseUnit)) {
          throw new Error(`Insufficient inventory for product '${product.name}'`);
        }

        // Deduct inventory balance
        const newBalance = balance.sub(item.quantityInBaseUnit);
        await tx.product.update({
          where: { id: item.productId },
          data: {
            inventoryBalance: newBalance,
          },
        });
      }

      // 2. Create the order
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          status: 'pending', // Order starts as pending quotation
          totalPrice: orderTotalPrice,
          items: {
            create: orderItemsToCreate.map((item) => ({
              productId: item.productId,
              orderedQuantity: item.orderedQuantity,
              orderedUnit: item.orderedUnit,
              quantityInBaseUnit: item.quantityInBaseUnit,
              unitPriceInOrderedUnit: item.unitPriceInOrderedUnit,
              totalItemPrice: item.totalItemPrice,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return newOrder;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    console.error('Order placement error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
