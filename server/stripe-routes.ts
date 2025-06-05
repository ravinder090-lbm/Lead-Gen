import { Express, Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "./storage";
import dotenv from 'dotenv'
dotenv.config()

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export const registerStripeRoutes = (app: Express) => {
  // Create a payment intent for one-time payments (lead coins)
  app.post("/api/create-payment-intent", async (req: Request, res: Response) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { id } = req.body; // Lead coin package ID
      
      // Get the lead coin package by ID
      const coinPackage = await storage.getLeadCoinPackageById(id);
      
      if (!coinPackage) {
        return res.status(404).json({ message: "Lead coin package not found" });
      }
      
      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(coinPackage.price * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.session.user.id.toString(),
          packageId: id.toString(),
          type: "lead_coins",
        },
      });
      
      // Return the client secret
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: coinPackage.price,
        coinAmount: coinPackage.coinAmount,
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        message: "Error creating payment intent: " + error.message 
      });
    }
  });
  
  // Create a subscription
  app.post("/api/create-subscription", async (req: Request, res: Response) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { id } = req.body; // Subscription plan ID
      
      // Get the subscription plan
      const plan = await storage.getSubscriptionById(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      // Get the user to ensure we have their email
      const user = await storage.getUserById(req.session.user.id);
      
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email is required" });
      }
      
      // Check if user already has a Stripe customer ID
      let customerId = user.stripeCustomerId;
      
      // If not, create a new customer
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
        });
        
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateStripeCustomerId(user.id, customerId);
      }
      
      // Create a payment intent for the subscription
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(plan.price * 100), // Convert to cents
        currency: "usd",
        customer: customerId,
        metadata: {
          userId: req.session.user.id.toString(),
          planId: id.toString(),
          type: "subscription",
        },
      });
      
      // Return the client secret
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: plan.price,
        planName: plan.name,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ 
        message: "Error creating subscription: " + error.message 
      });
    }
  });
  
  // Handle successful payments
  app.get("/api/payment-success", async (req: Request, res: Response) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { payment_intent } = req.query;
      
      if (!payment_intent || typeof payment_intent !== "string") {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }
      
      // Retrieve the payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
      
      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ message: "Payment has not succeeded" });
      }
      
      const { type, userId, packageId, planId } = paymentIntent.metadata;
      
      // Verify that the payment is for the logged-in user
      if (userId !== req.session.user.id.toString()) {
        return res.status(403).json({ message: "Unauthorized payment" });
      }
      
      // Handle lead coins purchase
      if (type === "lead_coins" && packageId) {
        const coinPackage = await storage.getLeadCoinPackageById(parseInt(packageId));
        
        if (!coinPackage) {
          return res.status(404).json({ message: "Lead coin package not found" });
        }
        
        // Add lead coins to user account
        await storage.addLeadCoinsToUser(req.session.user.id, coinPackage.coinAmount);
        
        // Record the transaction
        await storage.createCoinPurchase({
          userId: req.session.user.id,
          amount: coinPackage.coinAmount,
          price: coinPackage.price,
          paymentIntentId: payment_intent,
        });
        
        return res.json({ 
          success: true, 
          message: `Successfully purchased ${coinPackage.coinAmount} lead coins` 
        });
      }
      
      // Handle subscription purchase
      if (type === "subscription" && planId) {
        const plan = await storage.getSubscriptionById(parseInt(planId));
        
        if (!plan) {
          return res.status(404).json({ message: "Subscription plan not found" });
        }
        
        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + plan.durationDays);
        
        // Create user subscription
        await storage.createUserSubscription({
          userId: req.session.user.id,
          subscriptionId: plan.id,
          startDate: new Date(),
          endDate: expiresAt,
          status: "active",
          paymentIntentId: payment_intent,
        });
        
        // If the plan includes lead coins, add them to the user's account
        if (plan.leadCoins && plan.leadCoins > 0) {
          await storage.addLeadCoinsToUser(req.session.user.id, plan.leadCoins);
        }
        
        return res.json({ 
          success: true, 
          message: `Successfully subscribed to ${plan.name} plan` 
        });
      }
      
      return res.status(400).json({ message: "Invalid payment type" });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ 
        message: "Error verifying payment: " + error.message 
      });
    }
  });
  
  // Webhook for Stripe events
  app.post("/api/webhook", 
    // Use raw body parser for Stripe webhooks
    (req, res, next) => {
      if (req.originalUrl === '/api/webhook') {
        let data = '';
        req.on('data', chunk => {
          data += chunk;
        });
        req.on('end', () => {
          if (data) {
            req.body = JSON.parse(data);
          }
          next();
        });
      } else {
        next();
      }
    },
    async (req: Request, res: Response) => {
      const sig = req.headers['stripe-signature'];
      
      if (!process.env.STRIPE_WEBHOOK_SECRET || !sig) {
        return res.status(400).send('Webhook secret or signature missing');
      }
      
      let event;
      
      try {
        event = stripe.webhooks.constructEvent(
          req.body, 
          sig, 
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log('PaymentIntent was successful!', paymentIntent.id);
          
          try {
            const { type, userId, packageId, planId } = paymentIntent.metadata;
            
            // Handle lead coins purchase
            if (type === "lead_coins" && packageId && userId) {
              const coinPackage = await storage.getLeadCoinPackageById(parseInt(packageId));
              const userIdNum = parseInt(userId);
              
              if (coinPackage) {
                // Add lead coins to user account
                await storage.addLeadCoinsToUser(userIdNum, coinPackage.coinAmount);
                
                // Record the transaction
                await storage.createCoinPurchase({
                  userId: userIdNum,
                  amount: coinPackage.coinAmount,
                  price: coinPackage.price,
                  paymentIntentId: paymentIntent.id,
                });
              }
            }
            
            // Handle subscription purchase
            if (type === "subscription" && planId && userId) {
              const plan = await storage.getSubscriptionById(parseInt(planId));
              const userIdNum = parseInt(userId);
              
              if (plan) {
                // Calculate expiration date
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + plan.durationDays);
                
                // Create user subscription
                await storage.createUserSubscription({
                  userId: userIdNum,
                  subscriptionId: plan.id,
                  startDate: new Date(),
                  endDate: expiresAt,
                  status: "active",
                  paymentIntentId: paymentIntent.id,
                });
                
                // If the plan includes lead coins, add them to the user's account
                if (plan.leadCoins && plan.leadCoins > 0) {
                  await storage.addLeadCoinsToUser(userIdNum, plan.leadCoins);
                }
              }
            }
          } catch (error) {
            console.error('Error processing webhook payment:', error);
          }
          break;
          
        case 'payment_intent.payment_failed':
          console.log('Payment failed:', event.data.object.id);
          break;
          
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      
      // Return a response to acknowledge receipt of the event
      res.json({ received: true });
    }
  );
  
  // Create a route for the payment success page
  app.get("/api/payment/verify", async (req: Request, res: Response) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { payment_intent } = req.query;
      
      if (!payment_intent || typeof payment_intent !== "string") {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }
      
      // Retrieve the payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
      
      // Verify the payment status
      if (paymentIntent.status === "succeeded") {
        const { type } = paymentIntent.metadata;
        
        if (type === "lead_coins") {
          return res.json({ 
            success: true, 
            type: "lead_coins",
            message: "Lead coins purchase completed successfully" 
          });
        } else if (type === "subscription") {
          return res.json({ 
            success: true, 
            type: "subscription",
            message: "Subscription purchase completed successfully" 
          });
        }
      }
      
      return res.json({ 
        success: false, 
        message: `Payment status: ${paymentIntent.status}` 
      });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ 
        success: false,
        message: "Error verifying payment: " + error.message 
      });
    }
  });
};