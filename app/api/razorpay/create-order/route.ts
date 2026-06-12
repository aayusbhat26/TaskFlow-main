import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { tier } = await req.json();

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    if (user.plan === tier) {
      return new NextResponse(`You are already on the ${tier} plan.`, { status: 400 });
    }

    // ₹830 for PRO, ₹6600 for BUSINESS. Multiply by 100 to get paise.
    const amount = tier === 'BUSINESS' ? 660000 : 83000; 

    const options = {
      amount,
      currency: "INR",
      receipt: `rcpt_${user.id.slice(-8)}_${Date.now()}`,
      notes: {
        userId: user.id,
        tier: tier || 'PRO',
      }
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ 
      id: order.id, 
      amount: order.amount,
      currency: order.currency 
    });

  } catch (error) {
    console.error('[RAZORPAY_CREATE_ORDER]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
