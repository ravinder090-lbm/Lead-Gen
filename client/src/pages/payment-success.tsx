import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/components/skeletons/card-skeleton';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentType, setPaymentType] = useState<'subscription' | 'lead_coins' | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get the payment_intent parameter from the URL
        const params = new URLSearchParams(window.location.search);
        const paymentIntent = params.get('payment_intent');
        
        if (!paymentIntent) {
          throw new Error('No payment information found');
        }
        
        // Verify the payment with the server
        const response = await apiRequest(
          'GET', 
          `/api/payment/verify?payment_intent=${paymentIntent}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to verify payment');
        }
        
        const data = await response.json();
        
        setSuccess(data.success);
        setMessage(data.message);
        setPaymentType(data.type);
        
        // Show toast
        if (data.success) {
          toast({
            title: 'Payment Successful',
            description: data.message,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Payment Issue',
            description: data.message,
          });
        }
      } catch (error: any) {
        setSuccess(false);
        setMessage(error.message || 'An error occurred during payment verification');
        
        toast({
          variant: 'destructive',
          title: 'Payment Verification Error',
          description: error.message || 'Failed to verify your payment status',
        });
      } finally {
        setLoading(false);
      }
    };
    
    verifyPayment();
  }, [toast]);
  
  const handleContinue = () => {
    // Redirect based on payment type
    if (paymentType === 'subscription') {
      setLocation('/subscriptions');
    } else if (paymentType === 'lead_coins') {
      setLocation('/profile');
    } else {
      setLocation('/');
    }
  };
  
  return (
    <MainLayout>
      <div className="container max-w-md mx-auto py-12">
        {loading ? (
          <CardSkeleton 
            count={1}
            layout="vertical"
            withImage={true}
            withFooterAction={true}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {success ? 'Payment Successful' : 'Payment Status'}
              </CardTitle>
              <CardDescription className="text-center">
                Thank you for your payment
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="text-5xl mb-4">
                {success ? (
                  <CheckCircle2 className="text-green-500 h-16 w-16" />
                ) : (
                  <XCircle className="text-red-500 h-16 w-16" />
                )}
              </div>
              <p className="text-center font-medium">{message}</p>
              {success && paymentType === 'subscription' && (
                <p className="text-center text-sm text-muted-foreground">
                  Your subscription is now active. You can access your premium features right away.
                </p>
              )}
              {success && paymentType === 'lead_coins' && (
                <p className="text-center text-sm text-muted-foreground">
                  Your lead coins have been added to your account. You can start using them immediately.
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleContinue}
              >
                {success 
                  ? `Continue to ${paymentType === 'subscription' ? 'Subscriptions' : 'Profile'}` 
                  : 'Return to Dashboard'
                }
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}