'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Crown, ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Oneko from '@/components/ui/oneko';

type BillingInterval = 'month' | 'year';

export default function UpgradePage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>('month');
  const { data: session } = useSession();
  const router = useRouter();

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (tier: 'PRO' | 'BUSINESS') => {
    if (!session) {
      router.push('/api/auth/signin');
      return;
    }

    try {
      setIsLoading(tier);
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) throw new Error('Failed to create checkout session');

      const orderData = await res.json();
      
      const resLoaded = await loadRazorpay();
      if (!resLoaded) {
        alert('Razorpay SDK failed to load. Are you online?');
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'TaskFlow',
        description: `Upgrade to ${tier} Plan`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                tier
              })
            });
            
            if (verifyRes.ok) {
              alert('Payment Successful! You are now upgraded.');
              router.push('/dashboard');
            } else {
              alert('Payment verification failed.');
            }
          } catch (err) {
            console.error(err);
            alert('Verification error.');
          }
        },
        prefill: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        },
        theme: {
          color: '#ffffff'
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        console.error(response.error);
        alert('Payment failed! ' + response.error.description);
      });
      rzp.open();

    } catch (error) {
      console.error(error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      description: 'Best for personal use',
      price: { month: '₹0', year: '₹0' },
      features: [
        'Collaboration with team members',
        '2 Free Themes (Light & Dark)',
        'Edit & Delete messages',
        'Rich text & Markdown support',
        'Up to 3 Mind Maps',
        'Voice & Video Channels',
      ],
      buttonText: 'Get Started',
      action: () => router.push('/dashboard'),
      isPro: false,
    },
    {
      name: 'Pro',
      description: 'For power users & small teams.',
      price: { month: '₹830', year: '₹8300' },
      stripePriceId: { month: 'price_pro_month', year: 'price_pro_year' },
      features: [
        'Everything in Free',
        '5 Premium Themes',
        'Threaded Sidebar Replies',
        'Global Message Search',
        'Up to 8 Mind Maps',
      ],
      buttonText: 'Get Started',
      action: () => handleUpgrade('PRO'),
      isPro: true,
      popular: true,
    },
    {
      name: 'Business',
      description: 'Best for business owners.',
      price: { month: '₹6600', year: '₹66000' },
      stripePriceId: { month: 'price_biz_month', year: 'price_biz_year' },
      features: [
        'Everything in Pro',
        'Unlimited Custom Themes',
        'Smart Dividers & Read Receipts',
        'Unlimited Mind Maps',
        'Advanced Analytics',
        'Priority Support',
      ],
      buttonText: 'Get Started',
      action: () => handleUpgrade('BUSINESS'),
      isPro: true,
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center py-20 px-4 sm:px-6 lg:px-8 font-sans selection:bg-white/20 selection:text-white relative overflow-hidden">
      
      {/* Oneko Cat Follower */}
      <Oneko />

      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] rounded-full bg-purple-500/20 blur-[100px] animate-pulse" style={{ animationDuration: '7s' }} />

      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto mb-6 relative z-10">
        <div className="flex items-center justify-center space-x-2 text-sm text-white/60 mb-4">
          <span className="bg-white/10 px-3 py-1 rounded-full border border-white/10 flex items-center">
            <span className="mr-2">✨</span> Seamless smart pricing experience
          </span>
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl mb-4">
          Discover Products<br />
          <span className="text-white/60">With The Best Pricing</span>
        </h1>
        <p className="mt-2 text-base text-white/50 max-w-2xl mx-auto">
          Select from best plan, ensuring a perfect match. Need more or less? Customize your subscription for a seamless fit!
        </p>
      </div>

      {/* Toggle switch */}
      <div className="flex justify-center mb-6 relative z-10">
        <div className="bg-[#111] p-1 rounded-full border border-white/10 flex">
          <button
            onClick={() => setInterval('month')}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200",
              interval === 'month' ? "bg-white text-black shadow-sm" : "text-white/60 hover:text-white"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('year')}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200",
              interval === 'year' ? "bg-white text-black shadow-sm" : "text-white/60 hover:text-white"
            )}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto w-full items-stretch relative z-10">
        {plans.map((plan, i) => (
          <div 
            key={plan.name}
            className={cn(
              "bg-[#111] border rounded-3xl p-8 flex flex-col relative transition-transform duration-300 hover:scale-[1.02]",
              plan.popular ? "border-white/20 shadow-2xl shadow-white/5 scale-105 z-10" : "border-white/10"
            )}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </div>
            )}
            
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
              <div className={cn("w-3 h-3 rounded-full", plan.popular ? "bg-white" : "bg-white/40")} />
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-1">{plan.name}</h2>
              <p className="text-sm text-white/50">{plan.description}</p>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline text-5xl font-bold text-white">
                {plan.price[interval]}
                {plan.price[interval] !== '$0' && (
                  <span className="text-sm font-normal text-white/50 ml-2">/ per {interval}</span>
                )}
              </div>
            </div>
            
            <button
              onClick={plan.action}
              disabled={isLoading === plan.name.toUpperCase()}
              className={cn(
                "w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 mb-8 flex items-center justify-center",
                plan.popular 
                  ? "bg-white text-black hover:bg-white/90" 
                  : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
              )}
            >
              {isLoading === plan.name.toUpperCase() ? 'Loading...' : plan.buttonText}
            </button>
            
            <div className="flex-1">
              <p className="text-sm font-medium text-white mb-4">What you will get inside?</p>
              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm text-white/70">
                    <Check className="h-4 w-4 text-white/40 shrink-0 mr-3 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
