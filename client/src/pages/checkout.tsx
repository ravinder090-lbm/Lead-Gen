import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from 'wouter';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/components/skeletons/card-skeleton';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <span className="h-4 w-4 mr-2 rounded-full bg-background/20 animate-pulse"></span>
            Processing
          </span>
        ) : 'Pay Now'}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [match, params] = useRoute('/checkout/:type/:id');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const type = match ? params.type : null;
  const id = match ? params.id : null;
  
  useEffect(() => {
    if (!match || !type || !id) {
      toast({
        title: "Invalid checkout request",
        description: "Missing required parameters",
        variant: "destructive",
      });
      setLocation('/');
      return;
    }

    const endpoint = type === 'subscription' 
      ? '/api/create-subscription'
      : '/api/create-payment-intent';
    
    setIsLoading(true);
    
    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", endpoint, { id: parseInt(id) })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to create payment session');
        }
        return res.json();
      })
      .then((data) => {
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to initiate payment",
          variant: "destructive",
        });
        setLocation('/');
      });
  }, [type, id, toast, setLocation]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-md mx-auto py-12">
          <CardSkeleton 
            count={1}
            withImage={false}
            withFooterAction={true}
            layout="vertical"
          />
        </div>
      </MainLayout>
    );
  }
  
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <MainLayout>
      <div className="container max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {type === 'subscription' ? 'Subscribe to Plan' : 'Purchase Lead Coins'}
            </CardTitle>
            <CardDescription className="text-center">
              Complete your payment securely with Stripe
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientSecret && (
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm />
              </Elements>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};