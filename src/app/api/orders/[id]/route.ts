import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify access (admin sees all, seller sees only their own)
    if (user.role !== 'admin' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
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
    const { status } = body;

    if (!status || !['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let updatedOrder;
    
    // Concurrency-safe state transition and inventory update
    if (status === 'rejected' && order.status !== 'rejected') {
      // Revert stock: increment inventory balance
      updatedOrder = await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              inventoryBalance: {
                increment: item.quantityInBaseUnit,
              },
            },
          });
        }
        return await tx.order.update({
          where: { id: params.id },
          data: { status },
        });
      });
    } else if (order.status === 'rejected' && status !== 'rejected') {
      // Re-deduct stock, checking inventory first
      updatedOrder = await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          
          if (!product) {
            throw new Error(`Product not found for item ${item.id}`);
          }

          const currentBalance = new Prisma.Decimal(product.inventoryBalance);
          const reqBalance = new Prisma.Decimal(item.quantityInBaseUnit);

          if (currentBalance.lessThan(reqBalance)) {
            throw new Error(`Cannot reinstate order. Product '${product.name}' has insufficient stock (Required: ${reqBalance.toString()} ${product.baseUnit}, Available: ${currentBalance.toString()} ${product.baseUnit})`);
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              inventoryBalance: {
                decrement: item.quantityInBaseUnit,
              },
            },
          });
        }
        
        return await tx.order.update({
          where: { id: params.id },
          data: { status },
        });
      });
    } else {
      // Regular status change without inventory reversal
      updatedOrder = await prisma.order.update({
        where: { id: params.id },
        data: { status },
      });
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (error: any) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
