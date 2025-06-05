import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import stripe from "stripe";
import { storage } from "./storage";
// Remove session import since it's configured in main index.js
import { db } from "./db";
import crypto from "crypto";
import { mailer } from "./mailer";
import path from "path";
import fs from "fs";
import { eq, ne, and, or, like, ilike, isNull, asc, desc } from "drizzle-orm";
import { 
  verifyUserSchema, 
  loginUserSchema, 
  changePasswordSchema,
  updateUserProfileSchema,
  insertLeadSchema,
  insertSubscriptionSchema,
  insertSupportTicketSchema,
  insertSupportTicketReplySchema,
  updateLeadCoinSettingsSchema,
  insertLeadCategorySchema,
  updateLeadCategorySchema,
  createSubadminSchema,
  smtpSettings
} from "../shared/schema";
import { createSubscriptionPaymentSession, verifyPaymentSession, processStripeWebhook } from "./stripe-service";
import { notifyInactiveUsers } from "./scheduled-tasks";

function convertToCSV(arr: Record<string, any>[]): string {
  if (arr.length === 0) return "";
  
  // Generate headers from the first object's keys
  const headers = Object.keys(arr[0]);
  const csvRows = [headers.join(',')];
  
  // Generate data rows
  for (const item of arr) {
    const values = headers.map(header => {
      const val = item[header];
      // Handle special cases: null, undefined, objects, and strings with commas
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '""');
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware is now configured in main index.js with PostgreSQL store
  // No need to duplicate it here
  
  // Authentication middleware with detailed logging
  const isAuthenticated = (req: any, res: any, next: any) => {
    console.log(`Auth middleware - Session exists: ${!!req.session}, User in session: ${!!req.session?.user}`);
    
    if (req.session && req.session.user) {
      // Log auth success for debugging
      console.log(`User authenticated: ${req.session.user.id} (${req.session.user.role})`);
      next();
    } else {
      // Log auth failure for debugging
      console.log(`Authentication failed - Missing session or user data`);
      res.status(401).json({ message: "Not authenticated" });
    }
  };
  
  // Authentication routes
  app.get("/api/auth/me", async (req, res) => {
    try {
      // If there's a session with user data, return the user
      if (req.session && req.session.user) {
        const user = await storage.getUser(req.session.user.id);
        if (user) {
          // Don't send password to client
          const { password, verificationCode, resetToken, ...safeUser } = user;
          return res.json(safeUser);
        }
      }
      
      // No authenticated user
      return res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      console.error("Auth check error:", error);
      return res.status(500).json({ message: "Failed to authenticate" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      // Validate request body
      const validationResult = loginUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationResult.error.errors,
        });
      }

      const { email, password, rememberMe } = validationResult.data;

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check user status
      if (user.status === "pending") {
        return res.status(403).json({ message: "Please verify your email before logging in" });
      }

      if (user.status === "inactive") {
        return res.status(403).json({ message: "Your account has been deactivated" });
      }

      // Verify password using storage layer's verification
      if (!user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      try {
        const isPasswordValid = await storage.verifyPassword(user.id, password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
      } catch (error) {
        console.error("Password verification error:", error);
        return res.status(500).json({ message: "Login failed" });
      }

      // Update last login time
      await storage.updateUserLastLogin(user.id);

      // Set session expiration based on rememberMe
      req.session.cookie.maxAge = rememberMe ? 
        30 * 24 * 60 * 60 * 1000 : // 30 days
        7 * 24 * 60 * 60 * 1000;   // 7 days

      // Set user data in session
      req.session.user = {
        id: user.id,
        role: user.role,
      };

      // Create sanitized user object without sensitive data
      const { password: _, verificationCode, resetToken, ...safeUser } = user;

      return res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // Destroy session
    req.session.destroy(err => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      // Validate request body using Zod schema
      const validationResult = verifyUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationResult.error.errors,
        });
      }
      
      const { email, name, password, confirmPassword } = validationResult.data;
      
      // Check if email is already in use
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "Email already in use",
        });
      }
      
      // Generate verification code
      const verificationCode = crypto.randomInt(100000, 999999).toString();
      
      // Create user with pending status
      const newUser = await storage.createUser({
        email,
        name,
        password, // Password will be hashed in storage implementation
        role: "user",
        status: "pending",
        verificationCode,
        leadCoins: 20, // Initial lead coins for new users
      });
      
      // Send verification email
      await mailer.sendVerificationEmail(email, name, verificationCode);
      
      return res.status(201).json({
        message: "User registered successfully, verification email sent",
        userId: newUser.id,
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({
        message: "Failed to register user",
      });
    }
  });

  // Add more routes here...

  // Stripe webhook handler
  app.post(
    "/api/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const signature = req.headers["stripe-signature"] as string;

        if (!signature) {
          console.error("No Stripe signature found in webhook request");
          return res.status(400).send("No Stripe signature found");
        }

        console.log(
          "Received Stripe webhook with signature:",
          signature.substring(0, 20) + "...",
        );
        console.log(
          "Webhook payload size:",
          Buffer.isBuffer(req.body) ? req.body.length : "Not a buffer",
        );

        // Validate that we actually received the raw body
        if (!Buffer.isBuffer(req.body)) {
          console.error(
            "Webhook payload is not a buffer. Make sure express.raw() middleware is properly configured.",
          );
          return res.status(400).send("Invalid webhook payload format");
        }

        // Process webhook event
        const event = await processStripeWebhook(signature, req.body);

        if (!event) {
          console.error("Failed to process webhook event");
          return res.status(400).send("Failed to process webhook event");
        }

        console.log("Webhook validated successfully");
        console.log(`Processing webhook event of type: ${event.type}`);

        // Handle different event types
        if (event.type === "checkout.session.completed") {
          // Payment was successful
          const session = event.data.object;
          console.log("Session data:", {
            id: session.id,
            paymentStatus: session.payment_status,
            customer: session.customer,
            metadata: session.metadata,
          });

          if (session.metadata && session.metadata.userId) {
            const userId = parseInt(session.metadata.userId);
            const subscriptionId = parseInt(session.metadata.subscriptionId || "0");

            console.log(`Processing payment for user ${userId} and subscription ${subscriptionId}`);

            try {
              if (userId && subscriptionId) {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure it's not already activated
                  if (userSubscription.status === "active" && userSubscription.paymentVerified) {
                    console.log(`Subscription ${userSubscription.id} is already active and verified, skipping update`);
                    return res.status(200).json({ received: true, status: "already_active" });
                  }

                  // Update user subscription status
                  const updatedSubscription = await storage.updateUserSubscription(userSubscription.id, {
                    status: "active",
                    paymentVerified: true,
                  });

                  console.log(`Updated subscription status to active:`, updatedSubscription);

                  // Update user's lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated user's lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Simple fallback - get subscription details and create a new subscription
                  const subscription = await storage.getSubscription(subscriptionId);
                  if (!subscription) {
                    console.error(`Subscription ${subscriptionId} not found`);
                    return res.status(400).json({ error: "Subscription not found" });
                  }

                  // Create a new user subscription
                  const newUserSubscription = await storage.createUserSubscription({
                    userId,
                    subscriptionId,
                    status: "active",
                    startDate: new Date(),
                    paymentSessionId: session.id,
                    paymentVerified: true,
                    initialLeadCoins: subscription.leadCoins,
                    leadCoinsLeft: subscription.leadCoins,
                  });

                  console.log(`Created new user subscription:`, newUserSubscription);

                  // Update user's lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated user's lead coins by ${subscription.leadCoins}`);
                }
              }
            } catch (error: any) {
              console.error(`Error processing subscription payment:`, error);
              return res.status(500).json({
                error: "Failed to process subscription payment",
                details: error.message,
              });
            }
          } else {
            console.log("Session metadata missing userId:", session.metadata);
          }
        } else {
          console.log(`Unhandled event type: ${event.type}`);
        }

        // Respond with 200 status for successful processing
        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error("Webhook error:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );



  // Add more routes...

  const httpServer = createServer(app);
  return httpServer;
}

 