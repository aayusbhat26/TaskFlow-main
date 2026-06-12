import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { priceId, tier } = await req.json();

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

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email as string,
        name: user.name || user.username,
        metadata: {
          userId: user.id,
        },
      });
      
      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          stripeCustomerId,
        },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      success_url: `${process.env.NEXTAUTH_URL}/upgrade?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/upgrade?canceled=true`,
      // Removed payment_method_types to allow Automatic Payment Methods (Cards, UPI, etc.)
      mode: 'subscription',
      billing_address_collection: 'auto',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        tier: tier || 'PRO',
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
