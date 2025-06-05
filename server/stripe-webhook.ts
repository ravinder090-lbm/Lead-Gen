import { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from './storage';
import dotenv from 'dotenv'
dotenv.config()

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe key: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// This is your Stripe webhook handler for asynchronous payment events
export async function handleWebhook(req: Request, res: Response) {
  // Get the signature from the header
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    console.error('Missing Stripe signature');
    return res.status(400).send('Missing signature');
  }

  let event: Stripe.Event;

  try {
    // Verify and construct the event
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // If a webhook secret is configured, verify the signature
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        endpointSecret
      );
    } else {
      // For testing environments without a webhook secret
      event = JSON.parse(req.body);
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event based on its type
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`PaymentIntent was successful: ${paymentIntent.id}`);
      
      // Update the subscription status if metadata contains subscription ID
      if (paymentIntent.metadata.subscriptionId) {
        const subscriptionId = parseInt(paymentIntent.metadata.subscriptionId);
        
        try {
          await storage.updateUserSubscription(subscriptionId, { status: 'active' });
          console.log(`Updated subscription ${subscriptionId} to active`);
        } catch (error) {
          console.error('Error updating subscription status:', error);
        }
      }
      break;
      
    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`Payment failed: ${failedPaymentIntent.id}`);
      
      // Update the subscription status to failed if metadata contains subscription ID
      if (failedPaymentIntent.metadata.subscriptionId) {
        const subscriptionId = parseInt(failedPaymentIntent.metadata.subscriptionId);
        
        try {
          await storage.updateUserSubscription(subscriptionId, { status: 'cancelled' });
          console.log(`Updated subscription ${subscriptionId} to cancelled due to payment failure`);
        } catch (error) {
          console.error('Error updating subscription status:', error);
        }
      }
      break;
      
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`Checkout session completed: ${session.id}`);
      
      if (session.metadata?.subscriptionId) {
        const subscriptionId = parseInt(session.metadata.subscriptionId);
        
        try {
          await storage.updateUserSubscription(subscriptionId, { status: 'active' });
          console.log(`Updated subscription ${subscriptionId} to active from checkout`);
        } catch (error) {
          console.error('Error updating subscription status from checkout:', error);
        }
      }
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
}