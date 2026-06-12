import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db as prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      tier
    } = await req.json();

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment is successful
      
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          plan: tier || 'PRO',
          razorpayCustomerId: razorpay_payment_id, // simple tracking for this one-time purchase, ideally you'd use Razorpay Subscriptions for recurring billing
        }
      });

      return NextResponse.json({ message: "Payment verified successfully" });
    } else {
      return new NextResponse('Invalid signature', { status: 400 });
    }

  } catch (error) {
    console.error('[RAZORPAY_VERIFY]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
