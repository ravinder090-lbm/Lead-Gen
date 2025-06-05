

import Stripe from "stripe";
import QRCode from "qrcode";
import { storage } from "./storage";
import { User, Subscription, LeadCoinPackage } from "@shared/schema";
import { executeWithRetry } from "./db";

// if (!process.env.STRIPE_SECRET_KEY) {
//   throw new Error("STRIPE_SECRET_KEY environment variable is not set");
// }

// Create Stripe instance
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY );

export interface PaymentSessionResponse {
  sessionId: string;
  clientSecret: string;
  paymentUrl: string;
  qrCodeDataUrl: string;
  expiresAt: number;
}

/**
 * Create a payment session for subscription purchase
 * This will generate a Stripe checkout session and payment intent
 */
export async function createSubscriptionPaymentSession(
  user: User,
  subscription: Subscription,
  type:any
): Promise<PaymentSessionResponse> {
  try {
    console.log(
      `Creating payment session for user ${user.id} and subscription ${subscription.id}`,
    );

    // Create a simple payment intent for direct card payments
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(subscription.price * 100), // Convert to cents
      currency: "usd",
      metadata: {
        userId: user.id.toString(),
        subscriptionId: subscription.id.toString(),
        subscriptionName: subscription.name,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Failed to generate payment client secret");
    }

    // Create a standard checkout session as a fallback
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      // success_url: `${process.env.StripeSuccessUrl}/user/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
      // cancel_url: `${process.env.StripeCancelUrl}/user/subscriptions?canceled=true`,
       success_url: `${process.env.StripeSuccessUrl}/user/profile?success=true&session_id={CHECKOUT_SESSION_ID}&type=${type}`,
      cancel_url: `${process.env.StripeCancelUrl}/user/profile?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id.toString(),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: subscription.name,
              description: subscription.description || undefined,
            },
            unit_amount: Math.round(subscription.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id.toString(),
        subscriptionId: subscription.id.toString(),
        subscriptionName: subscription.name,
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes from now
    });

    // Generate QR code for the checkout URL
    let qrCodeDataUrl = '';
    
    try {
      if (session.url) {
        // Use explicit QR code generation options to avoid type errors
        const qrOptions = {
          errorCorrectionLevel: 'M' as 'M', // Type-safe error correction level
          margin: 4,
          width: 300
        };
        
        qrCodeDataUrl = await QRCode.toDataURL(session.url, qrOptions);
      }
    } catch (qrError) {
      console.error("Failed to generate QR code:", qrError);
      // Use a static string instead of trying to generate a QR code
      qrCodeDataUrl = '';
    }

    // Check if a subscription with this session ID already exists to prevent duplicates
    const existingSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);
    
    if (existingSubscription) {
      console.log(`A subscription with session ID ${session.id} already exists, skipping creation`);
    } else {
      // Also check if the user already has a pending subscription for this plan to prevent duplicates
      const userSubscriptionHistory = await storage.getUserSubscriptionHistory(user.id);
      const hasPendingForThisPlan = userSubscriptionHistory.some(
        sub => sub.status === "pending" && sub.subscriptionId === subscription.id
      );
      
      if (hasPendingForThisPlan) {
        console.log(`User ${user.id} already has a pending subscription for plan ${subscription.id}, skipping creation`);
      } else {
        // Create a pending subscription record with the payment session ID
        await executeWithRetry(async () => {
          await storage.createUserSubscription({
            userId: user.id,
            subscriptionId: subscription.id,
            status: "pending",
            paymentSessionId: session.id,
            startDate: new Date(),
            endDate: new Date(
              new Date().setDate(new Date().getDate() + subscription.durationDays),
            ),
            leadCoinsLeft: subscription.leadCoins, // Store the initial lead coins
            amount: subscription.price,
          });
        });
      }
    }

    return {
      sessionId: session.id,
      clientSecret: paymentIntent.client_secret,
      paymentUrl: session.url || "",
      qrCodeDataUrl,
      expiresAt: session.expires_at || Math.floor(Date.now() / 1000) + 30 * 60,
    };
  } catch (error) {
    console.error("Error creating payment session:", error);
    throw new Error("Failed to create payment session");
  }
}

export async function createCoinPaymentSession(
  user: User,
  subscription: LeadCoinPackage,
  type:any
): Promise<PaymentSessionResponse> {
  try {
    console.log(
      `Creating payment session for user ${user.id} and subscription ${subscription.id}`,
    );

    // Create a simple payment intent for direct card payments
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(subscription.price * 100), // Convert to cents
      currency: "usd",
      metadata: {
        userId: user.id.toString(),
        subscriptionId: subscription.id.toString(),
        subscriptionName: subscription.name,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Failed to generate payment client secret");
    }

    // Create a standard checkout session as a fallback
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      // success_url: `${process.env.StripeSuccessUrl}/user/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
      // cancel_url: `${process.env.StripeCancelUrl}/user/subscriptions?canceled=true`,
       success_url: `${process.env.StripeSuccessUrl}/user/profile?success=true&session_id={CHECKOUT_SESSION_ID}&type=${type}`,
      cancel_url: `${process.env.StripeCancelUrl}/user/profile?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id.toString(),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: subscription.name,
              description: subscription.description || undefined,
            },
            unit_amount: Math.round(subscription.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id.toString(),
        subscriptionId: subscription.id.toString(),
        subscriptionName: subscription.name,
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes from now
    });

    // Generate QR code for the checkout URL
    let qrCodeDataUrl = '';
    
    try {
      if (session.url) {
        // Use explicit QR code generation options to avoid type errors
        const qrOptions = {
          errorCorrectionLevel: 'M' as 'M', // Type-safe error correction level
          margin: 4,
          width: 300
        };
        
        qrCodeDataUrl = await QRCode.toDataURL(session.url, qrOptions);
      }
    } catch (qrError) {
      console.error("Failed to generate QR code:", qrError);
      // Use a static string instead of trying to generate a QR code
      qrCodeDataUrl = '';
    }

    // Check if a subscription with this session ID already exists to prevent duplicates
    const existingSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);
    
    if (existingSubscription) {
      console.log(`A subscription with session ID ${session.id} already exists, skipping creation`);
    } else {
      // Also check if the user already has a pending subscription for this plan to prevent duplicates
      const userSubscriptionHistory = await storage.getUserSubscriptionHistory(user.id);
      const hasPendingForThisPlan = userSubscriptionHistory.some(
        sub => sub.status === "pending" && sub.subscriptionId === subscription.id
      );
      
      if (hasPendingForThisPlan) {
        console.log(`User ${user.id} already has a pending subscription for plan ${subscription.id}, skipping creation`);
      } else {
        // Create a pending subscription record with the payment session ID
        await executeWithRetry(async () => {
          await storage.createCoinPurchase({
            userId: user.id,
            subscriptionId: subscription.id,
            status: "pending",
            paymentSessionId: session.id,
            // startDate: new Date(),
            // endDate: new Date()
            //   new Date().setDate(new Date().getDate() + subscription.durationDays),
            // ),
            leadCoins: subscription.leadCoins, // Store the initial lead coins
            amount: subscription.price,
          });
        });
      }
    }

    return {
      sessionId: session.id,
      clientSecret: paymentIntent.client_secret,
      paymentUrl: session.url || "",
      qrCodeDataUrl,
      expiresAt: session.expires_at || Math.floor(Date.now() / 1000) + 30 * 60,
    };
  } catch (error) {
    console.error("Error creating payment session:", error);
    throw new Error("Failed to create payment session");
  }
}

/**
 * Verify a completed payment session
 */
export async function verifyPaymentSession(sessionId: string): Promise<{
  verified: boolean;
  sessionStatus?: string;
  pending?: boolean;
  error?: string;
  userId?: string;
  subscriptionId?: string;
  userSubscription?: any;
}> {
  try {
    // First check if we have an existing user subscription with this session ID
    const userSubscription = await storage.getUserSubscriptionByPaymentSession(
      sessionId,
    );

    if (!userSubscription) {
      return {
        verified: false,
        error: "No subscription found with this payment session ID",
      };
    }
    
    // Check if this subscription has already been verified
    if (userSubscription.paymentVerified === true) {
      return {
        verified: true,
        sessionStatus: "already_verified",
        userSubscription
      };
    }

    // If already activated, return success
    if (userSubscription.status === "active") {
      return {
        verified: true,
        sessionStatus: "complete",
      };
    }

    // If still pending, check the status in Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentStatus = session.payment_status;

    console.log(
      `Payment verification for session ${sessionId}: ${paymentStatus}`,
    );

    if (paymentStatus === "paid") {
      // Payment is confirmed in Stripe - activate the subscription
      const updatedSubscription = await storage.updateUserSubscription(userSubscription.id, {
        status: "active",
        paymentVerified: true, // Explicitly set payment as verified
      });

      console.log(`Updated subscription ${userSubscription.id} to active and verified`);

      // Get subscription details to retrieve leadCoins
      const subscription = await storage.getSubscription(userSubscription.subscriptionId);
      
      if (subscription) {
        // Update user's lead coins based on subscription
        await storage.updateUserLeadCoins(
          userSubscription.userId,
          subscription.leadCoins,
        );
      }

      return {
        verified: true,
        sessionStatus: "paid",
        userId: userSubscription.userId.toString(),
        subscriptionId: userSubscription.subscriptionId.toString(),
        userSubscription: updatedSubscription || userSubscription, // Return the updated subscription data
      };
    } else if (paymentStatus === "unpaid") {
      // Check if this is a processing payment
      // Ensure we return a string value for sessionStatus
      const status = typeof session.status === 'string' ? session.status : 'processing';
      return {
        verified: false,
        pending: true,
        sessionStatus: status,
      };
    } else {
      // Failed or otherwise not completed
      return {
        verified: false,
        sessionStatus: paymentStatus,
      };
    }
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return {
      verified: false,
      error: error.message || "Failed to verify payment",
    };
  }
}

/**
 * Process a webhook event from Stripe
 */
export async function processStripeWebhook(
  signature: string,
  payload: Buffer,
): Promise<{ received: boolean; type?: string; error?: string }> {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }

    // Verify and construct the webhook event
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    console.log(`Processing Stripe webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Handle completed checkout session
        const userSubscription =
          await storage.getUserSubscriptionByPaymentSession(session.id);

        if (!userSubscription) {
          console.error(`No subscription found for session ${session.id}`);
          return {
            received: true,
            type: event.type,
            error: "No subscription record found",
          };
        }

        // Activate the subscription if payment is confirmed
        if (session.payment_status === "paid") {
          await storage.updateUserSubscription(userSubscription.id, {
            status: "active",
          });

          // Get subscription details to get leadCoins value
          const subscription = await storage.getSubscription(userSubscription.subscriptionId);
          
          if (subscription) {
            // Add lead coins to user's account
            await storage.updateUserLeadCoins(
              userSubscription.userId,
              subscription.leadCoins,
            );
          }

          console.log(
            `Activated subscription for user ${userSubscription.userId}${subscription ? ` with ${subscription.leadCoins} lead coins` : ''}`,
          );
        }
        break;
      }

      case "payment_intent.succeeded": {
        // Subscription might already be activated by the checkout session event
        // This is a redundant check
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const subscriptionId = paymentIntent.metadata?.subscriptionId;
        const userId = paymentIntent.metadata?.userId;

        if (subscriptionId && userId) {
          // First check if there's already an existing subscription for this payment (either with payment intent ID or from a checkout session)
          const existingSubscription = await storage.getUserSubscriptionByPaymentSession(paymentIntent.id);
          
          if (existingSubscription) {
            console.log(`Subscription for payment intent ${paymentIntent.id} already exists, updating if necessary`);
            
            // If the subscription exists but isn't active, activate it
            if (existingSubscription.status !== "active") {
              await storage.updateUserSubscription(existingSubscription.id, {
                status: "active",
                paymentVerified: true
              });
              
              // Get subscription details to retrieve leadCoins
              const subscription = await storage.getSubscription(existingSubscription.subscriptionId);
              
              if (subscription && subscription.leadCoins) {
                // Update user's lead coins based on subscription
                await storage.updateUserLeadCoins(
                  existingSubscription.userId,
                  subscription.leadCoins,
                );
              }
              
              console.log(`Updated existing subscription ${existingSubscription.id} to active status`);
            }
          } else {
            // Check for existing pending subscriptions for this plan
            const userSubscriptionHistory = await storage.getUserSubscriptionHistory(parseInt(userId));
            const pendingSubscription = userSubscriptionHistory.find(
              sub => sub.status === "pending" && sub.subscriptionId === parseInt(subscriptionId)
            );
            
            if (pendingSubscription) {
              // Update the existing pending subscription instead of creating a new one
              await storage.updateUserSubscription(pendingSubscription.id, {
                status: "active",
                paymentVerified: true,
                paymentSessionId: paymentIntent.id // Update with the payment intent ID as well
              });
              
              // Get subscription details to retrieve leadCoins
              const subscription = await storage.getSubscription(parseInt(subscriptionId));
              
              if (subscription && subscription.leadCoins) {
                // Update user's lead coins based on subscription
                await storage.updateUserLeadCoins(
                  parseInt(userId),
                  subscription.leadCoins,
                );
              }
              
              console.log(`Updated pending subscription ${pendingSubscription.id} to active status`);
            } else {
              // No existing subscription found, check if user has active subscription
              const userSubscription = await storage.getUserActiveSubscription(
                parseInt(userId),
              );

              // Only create a new one if not already active
              if (!userSubscription || userSubscription.status !== "active") {
                const subscription = await storage.getSubscription(
                  parseInt(subscriptionId),
                );

                if (subscription) {
                  // Create and activate a new subscription
                  const newSubscription = await storage.createUserSubscription({
                    userId: parseInt(userId),
                    subscriptionId: parseInt(subscriptionId),
                    status: "active",
                    paymentSessionId: paymentIntent.id,
                    startDate: new Date(),
                    endDate: new Date(
                      new Date().setDate(
                        new Date().getDate() + subscription.durationDays,
                      ),
                    ),
                    leadCoinsLeft: subscription.leadCoins,
                    amount: subscription.price,
                  });

                  // Add lead coins if subscription exists
                  if (subscription && subscription.leadCoins) {
                    await storage.updateUserLeadCoins(
                      parseInt(userId),
                      subscription.leadCoins,
                    );
                  }

                  console.log(
                    `Created and activated new subscription via PaymentIntent for user ${userId}`,
                  );
                }
              }
            }
          }
        }
        break;
      }

      // More event handlers can be added here

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return {
      received: true,
      type: event.type,
    };
  } catch (error: any) {
    console.error("Stripe webhook processing error:", error);
    return {
      received: false,
      error: error.message,
    };
  }
}

/**
 * Process a Google Pay payment token for subscription purchase
 */
export async function processGooglePayPayment(
  userId: number,
  subscriptionId: number,
  paymentToken: any,
): Promise<{
  success: boolean;
  error?: string;
  transactionId?: string;
}> {
  try {
    // Get subscription details
    const subscription = await storage.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Get user details
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create a payment method from the Google Pay token
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        token: paymentToken,
      },
    });

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(subscription.price * 100), // in cents
      currency: "usd",
      payment_method: paymentMethod.id,
      confirm: true,
      return_url: `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5001"}/user/subscriptions`,
      metadata: {
        userId: userId.toString(),
        subscriptionId: subscriptionId.toString(),
        paymentMethod: "google_pay",
      },
    });

    // Handle the payment result
    if (
      paymentIntent.status === "succeeded" ||
      paymentIntent.status === "processing"
    ) {
      // Create a user subscription record
      await storage.createUserSubscription({
        userId,
        subscriptionId,
        status: paymentIntent.status === "succeeded" ? "active" : "pending",
        paymentSessionId: paymentIntent.id,
        startDate: new Date(),
        endDate: new Date(
          new Date().setDate(new Date().getDate() + subscription.durationDays),
        ),
        leadCoins: subscription.leadCoins,
        amount: subscription.price,
      });

      // If payment succeeded immediately, add lead coins
      if (paymentIntent.status === "succeeded") {
        await storage.updateUserLeadCoins(userId, subscription.leadCoins);
      }

      return {
        success: true,
        transactionId: paymentIntent.id,
      };
    } else {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }
  } catch (error: any) {
    console.error("Google Pay payment processing error:", error);
    const stripePaymentIntentError = error.raw || error;
    return {
      success: false,
      error: stripePaymentIntentError.message || "Failed to process payment",
    };
  }
}