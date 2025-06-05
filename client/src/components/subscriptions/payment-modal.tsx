import { useState, useEffect } from "react";
import { Subscription } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Clock, CreditCard, Smartphone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadStripe } from "@stripe/stripe-js";
import {
  CardElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import GooglePayButton from "@google-pay/button-react";

// Load Stripe outside of the component to avoid recreation
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  subscription?: Subscription;
}

interface PaymentSessionResponse {
  sessionId: string;
  clientSecret: string;
  paymentUrl: string;
  qrCodeDataUrl: string;
  expiresAt: number;
}

function StripePaymentForm({
  subscription,
  clientSecret,
  onSuccess,
}: {
  subscription: Subscription;
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error: paymentError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: "Subscription Payment",
            },
          },
        });

      if (paymentError) {
        setError(paymentError.message || "Payment failed");
        toast({
          title: "Payment Failed",
          description:
            paymentError.message || "An error occurred during payment",
          variant: "destructive",
        });
      } else if (paymentIntent.status === "succeeded") {
        toast({
          title: "Payment Successful",
          description: "Your subscription has been activated",
          variant: "default",
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error("Card payment error:", error);
      setError(error.message || "An unexpected error occurred");
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#9e2146",
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay " + formatCurrency(subscription.price)
        )}
      </Button>
    </form>
  );
}

export function PaymentModal({
  open,
  onClose,
  subscription,
}: PaymentModalProps) {
  const [paymentSession, setPaymentSession] =
    useState<PaymentSessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "initial" | "pending" | "success" | "error"
  >("initial");
  const [countdown, setCountdown] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "google-pay">(
    "card",
  );
  const { toast } = useToast();
  useEffect(() => {
    // Create payment session when modal opens
    if (open && subscription && verificationStatus === "initial") {
      createPaymentSession();
    }
  }, [open, subscription]);

  // Handle countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle payment verification
  useEffect(() => {
    let verificationTimer: NodeJS.Timeout | null = null;

    if (paymentSession && verificationStatus === "pending") {
      // Initial verification check after a short delay
      const initialVerificationDelay = setTimeout(() => {
        verifyPayment();

        // Start regular polling
        verificationTimer = setInterval(() => {
          verifyPayment();
        }, 5000); // Check every 5 seconds

        // Extra check after 10 seconds
        setTimeout(() => {
          verifyPayment();
        }, 10000);
      }, 5000); // Wait 5 seconds before first verification check

      return () => {
        if (initialVerificationDelay) clearTimeout(initialVerificationDelay);
        if (verificationTimer) {
          console.log("Cleaning up verification timer");
          clearInterval(verificationTimer);
        }
      };
    }

    return () => {
      if (verificationTimer) {
        console.log("Cleaning up verification timer");
        clearInterval(verificationTimer);
      }
    };
  }, [paymentSession, verificationStatus]);

  // Create payment session
  const createPaymentSession = async () => {
    if (!subscription) {
      console.error("Cannot create payment session: No subscription provided");
      return;
    }

    console.log("Creating payment session for subscription:", subscription.id);
    setIsLoading(true);

    try {
      console.log("Sending request to /api/subscriptions/purchase");

      // Use fetch directly to avoid API request issues
      const response = await fetch("/api/subscriptions/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: subscription.id,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to create payment session",
        );
      }

      const data = await response.json();
      console.log("Payment session response:", data);

      // Validate payment session
      if (!data.paymentSession) {
        throw new Error("Invalid payment session response");
      }

      // Set the payment session data and status
      setPaymentSession(data.paymentSession);
      setVerificationStatus("pending");

      // Calculate the countdown
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, data.paymentSession.expiresAt - now);
      setCountdown(remaining);
    } catch (error: any) {
      console.error("Error creating payment session:", error);
      toast({
        title: "Payment Error",
        description:
          error.message ||
          "Failed to create payment session. Please try again.",
        variant: "destructive",
      });

      // Fallback to checkout method if payment session fails
      try {
        const checkoutResponse = await apiRequest(
          "POST",
          "/api/subscriptions/create-checkout-session",
          {
            subscriptionId: subscription.id,
          },
        );

        if (checkoutResponse.ok) {
          const checkoutData = await checkoutResponse.json();

          if (checkoutData.checkoutUrl) {
            toast({
              title: "Redirecting to Checkout",
              description: "You will be redirected to complete payment",
            });

            // Short delay before redirect
            setTimeout(() => {
              window.location.href = checkoutData.checkoutUrl;
            }, 1500);
            return;
          }
        }
      } catch (checkoutError) {
        console.error("Checkout fallback also failed:", checkoutError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify payment status
  const verifyPayment = async () => {
    if (!paymentSession) {
      console.error("Cannot verify payment: No payment session");
      return;
    }

    try {
      const response = await fetch(
        `/api/subscriptions/verify-payment?sessionId=${paymentSession.sessionId}`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();
      console.log("Payment verification response:", data);

      // Handle successful verification
      if (data.verified === true) {
        console.log("Payment verified successfully!");
        handlePaymentSuccess();
        return;
      }

      // Handle still processing cases
      if (data.verified === false && data.sessionStatus === "paid") {
        console.log("Payment received but verification still processing");
        toast({
          title: "Payment Received",
          description: "Your payment is being processed...",
        });
        return;
      }

      // Handle pending payment
      if (data.pending === true) {
        console.log("Payment is still processing...");
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed. Please wait a moment.",
        });
        return;
      }

      // Handle expired sessions
      if (data.sessionStatus === "expired") {
        console.error("Payment session expired");
        toast({
          title: "Payment Session Expired",
          description: "Your payment session has expired. Please try again.",
          variant: "destructive",
        });
        setVerificationStatus("error");
        return;
      }

      // Handle specific errors from the server
      if (data.error) {
        console.warn("Payment verification warning:", data.error);

        // Don't spam toasts for every poll attempt
        if (verificationStatus === "error") {
          toast({
            title: "Payment Verification Issue",
            description: data.error,
            variant: "destructive",
          });
        } else {
          setVerificationStatus("error");
        }
      } else {
        // Normal pending state, keep polling
        console.log(
          "Payment not yet verified, status:",
          data.sessionStatus || "pending",
        );
      }
    } catch (error: any) {
      console.error("Error verifying payment:", error);
    }
  };

  const handlePaymentSuccess = () => {
    setVerificationStatus("success");

    queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/current"] });

    toast({
      title: "Payment Successful",
      description: "Your subscription has been activated.",
      variant: "default",
    });

    setTimeout(() => onClose(), 3000);
  };

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Subscribe to {subscription.name}
          </DialogTitle>
          <DialogDescription>{subscription.description}</DialogDescription>
        </DialogHeader>

        {/* Mobile Payment Apps Banner - Always visible */}
        <div className="flex justify-center mb-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 w-full">
            <div className="text-center text-sm text-blue-700 font-medium mb-2">
              Preferred Payment Methods
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center">
                <img
                  src="https://cdn.iconscout.com/icon/free/png-256/free-google-pay-2038779-1721670.png"
                  alt="Google Pay"
                  className="h-8 w-8 object-contain mb-1"
                />
                <span className="text-xs text-gray-500">Google Pay</span>
              </div>
              <div className="flex flex-col items-center">
                <img
                  src="https://download.logo.wine/logo/Stripe_(company)/Stripe_(company)-Logo.wine.png"
                  alt="Credit Card"
                  className="h-8 w-12 object-contain mb-1"
                />
                <span className="text-xs text-gray-500">Card</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-center">Preparing payment options...</p>
            </div>
          ) : verificationStatus === "success" ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Payment Successful!
              </h3>
              <p className="mb-4">Your subscription is now active.</p>
              <p>
                You've received {subscription.leadCoins} lead coins to your
                account.
              </p>
            </div>
          ) : paymentSession ? (
            <Tabs
              defaultValue="card"
              value={paymentMethod}
              onValueChange={(value) =>
                setPaymentMethod(value as "card" | "google-pay")
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="card" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Credit Card</span>
                </TabsTrigger>
                <TabsTrigger
                  value="google-pay"
                  className="flex items-center gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Google Pay</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="card" className="mt-2">
                <div className="text-center mb-4">
                  <p className="font-medium text-lg mb-1">
                    {formatCurrency(subscription.price)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Secure credit card payment
                  </p>

                  <div className="flex items-center justify-center gap-2 text-amber-600 mt-2 mb-3">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      Session expires in {formatCountdown(countdown)}
                    </span>
                  </div>
                </div>

                {paymentSession && paymentSession.clientSecret ? (
                  <Elements
                    stripe={stripePromise}
                    options={{ clientSecret: paymentSession.clientSecret }}
                  >
                    <StripePaymentForm
                      subscription={subscription}
                      clientSecret={paymentSession.clientSecret}
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                ) : (
                  <div className="text-center p-6 border rounded-md">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p>Loading payment form...</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="google-pay" className="mt-2">
                <div className="text-center mb-8">
                  <p className="font-medium text-lg mb-1">
                    {formatCurrency(subscription.price)}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Quick and secure Google Pay payment
                  </p>

                  <div className="flex items-center justify-center gap-2 text-amber-600">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      Session expires in {formatCountdown(countdown)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <GooglePayButton
                    environment="TEST"
                    paymentRequest={{
                      apiVersion: 2,
                      apiVersionMinor: 0,
                      allowedPaymentMethods: [
                        {
                          type: "CARD",
                          parameters: {
                            allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
                            allowedCardNetworks: ["MASTERCARD", "VISA"],
                          },
                          tokenizationSpecification: {
                            type: "PAYMENT_GATEWAY",
                            parameters: {
                              gateway: "stripe",
                              "stripe:version": "2022-11-15",
                              "stripe:publishableKey": import.meta.env
                                .VITE_STRIPE_PUBLIC_KEY,
                            },
                          },
                        },
                      ],
                      merchantInfo: {
                        merchantId: "12345678901234567890",
                        merchantName: "LeadGen App",
                      },
                      transactionInfo: {
                        totalPriceStatus: "FINAL",
                        totalPriceLabel: "Total",
                        totalPrice: subscription.price.toString(),
                        currencyCode: "USD",
                        countryCode: "US",
                      },
                    }}
                    onLoadPaymentData={async (paymentData) => {
                      try {
                        console.log("Google Pay payment token:", paymentData);
                        const response = await fetch(
                          "/api/subscriptions/process-google-pay",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              paymentToken:
                                paymentData.paymentMethodData.tokenizationData
                                  .token,
                              subscriptionId: subscription.id,
                            }),
                            credentials: "include",
                          },
                        );

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(
                            errorData.message ||
                              "Failed to process Google Pay payment",
                          );
                        }

                        handlePaymentSuccess();
                      } catch (error: any) {
                        console.error("Google Pay processing error:", error);
                        toast({
                          title: "Google Pay Error",
                          description:
                            error.message ||
                            "Failed to process Google Pay payment",
                          variant: "destructive",
                        });
                      }
                    }}
                    buttonType="pay"
                    buttonSizeMode="fill"
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center p-6 border rounded-md">
              <p>Unable to load payment options. Please try again.</p>
              <Button onClick={() => createPaymentSession()} className="mt-4">
                Retry
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
