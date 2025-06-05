import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mailer } from "./mailer";
import { notifyInactiveUsers } from "./scheduled-tasks";
import { generateOTP } from "../client/src/lib/utils";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { randomBytes } from "crypto";
import { db } from "./db";
import { eq, and, lte, gt } from "drizzle-orm";
import {
  createSubscriptionPaymentSession,
  verifyPaymentSession,
  processStripeWebhook,
} from "./stripe-service";

import { z } from "zod";
import {
  User,
  Lead,
  LeadCategory,
  SupportTicket,
  Subscription,
  LeadCoinSetting,
  userSubscriptions,
  viewedLeads,
  insertUserSchema,
  loginUserSchema,
  verifyUserSchema,
  updateUserProfileSchema,
  changePasswordSchema,
  insertLeadSchema,
  insertLeadCategorySchema,
  insertSubscriptionSchema,
  insertSupportTicketSchema,
  insertSupportTicketReplySchema,
  updateLeadCoinSettingsSchema,
  updateLeadCategorySchema,
  createSubadminSchema,
} from "@shared/schema";

// Helper function to convert array of objects to CSV
function convertToCSV(arr: Record<string, any>[]): string {
  if (!arr || !arr.length) return '';
  
  const header = Object.keys(arr[0]).join(',');
  const rows = arr.map((obj: Record<string, any>) => {
    return Object.values(obj).map((value: any) => {
      // Handle special cases: null, undefined, objects, and strings with commas
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') {
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Authentication error:", error);
      return res.status(500).json({ message: "Authentication error" });
    }}
  };

  // Middleware to check if user has specific role
  const hasRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      console.log("hasRole middleware - session:", req.session);
      console.log("hasRole middleware - allowed roles:", roles);

      if (!req.session || !req.session.user) {
        console.log("hasRole middleware - no user in session");
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("hasRole middleware - user role:", req.session.user.role);

      if (roles.includes(req.session.user.role)) {
        console.log("hasRole middleware - role authorized");
        return next();
      }

      console.log("hasRole middleware - insufficient permissions");
      res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    };
  };

  // Middleware to check if subadmin has specific permission
  const hasPermission = (permission: string) => {
    return (req: any, res: any, next: any) => {
      console.log("hasPermission middleware - session:", req.session);
      console.log(
        "hasPermission middleware - required permission:",
        permission,
      );

      if (!req.session || !req.session.user) {
        console.log("hasPermission middleware - no user in session");
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log(
        "hasPermission middleware - user role:",
        req.session.user.role,
      );

      // Admin always has all permissions
      if (req.session.user.role === "admin") {
        console.log("hasPermission middleware - admin has all permissions");
        return next();
      }

      // Subadmin needs to have the specific permission
      if (req.session.user.role === "subadmin") {
        // Enhanced logging for debugging permissions
        const userPermissions = req.session.user.permissions || [];
        console.log(
          "hasPermission middleware - subadmin permissions:",
          userPermissions,
          "Required permission:",
          permission,
          "Has permission:",
          userPermissions.includes(permission),
        );

        if (userPermissions.includes(permission)) {
          console.log("hasPermission middleware - permission granted");
          return next();
        }
      }

      console.log("hasPermission middleware - insufficient permissions");
      res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    };
  };

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to verify user" });
    }
  });

  app.post("/api/auth/resend-code", async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res.status(500).json({ message: "Failed to resend verification code" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "An error occurred during logout" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Error in /api/auth/me:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = req.session.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      console.log(`Change password request received for user ${userId}`);
      
      // Validate all required fields are present
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ 
          message: "Current password, new password, and confirmation are required" 
        });
      }
      
      // Validate password confirmation matches
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New password and confirmation do not match" });
      }
      
      // Validate new password meets complexity requirements
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }
      
      // Critical check: Verify current password is correct
      const isPasswordValid = await storage.verifyPassword(userId, currentPassword);
      
      if (!isPasswordValid) {
        console.log(`Password change failed: Current password is incorrect for user ${userId}`);
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Password is verified, proceed with update
      await storage.updateUserPassword(userId, newPassword);
      
      console.log(`Password successfully changed for user ${userId}`);
      return res.json({ success: true, message: "Password successfully updated" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Error sending reset password email:", error);
      res.status(500).json({ message: "Failed to send reset password email" });
    }
  });

  // Handle password reset with token
  app.post("/api/auth/set-new-password", async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Error setting new password:", error);
      res
        .status(500)
        .json({ message: "Failed to reset password. Please try again." });
    }
  });

  // User Management Routes
  app.get(
    "/api/users",
    isAuthenticated,
    hasRole(["admin", "subadmin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.log("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
      }
    },
  );

  app.post(
    "/api/users",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: "Failed to create user" });
      }
    },
  );

  app.patch(
    "/api/users/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res.status(500).json({ message: "Failed to update user" });
      }
    },
  );

  app.delete(
    "/api/users/:id",
    isAuthenticated,
    hasRole(["admin", "subadmin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Failed to delete user" });
      }
    },
  );

  app.patch(
    "/api/users/:id/status",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res.status(500).json({ message: "Failed to update user status" });
      }
    },
  );

  // Subadmin Management Routes
  app.get(
    "/api/subadmins",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch subadmins" });
      }
    },
  );

  app.post(
    "/api/subadmins",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: "Failed to create subadmin" });
      }
    },
  );

  app.patch(
    "/api/subadmins/:id/permissions",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res
          .status(500)
          .json({ message: "Failed to update subadmin permissions" });
      }
    },
  );

  app.delete(
    "/api/subadmins/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res.status(500).json({ message: "Failed to delete subadmin" });
      }
    },
  );

  // Lead Category Management Routes
  app.get("/api/lead-categories", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  // Endpoint to check if a user has already viewed a lead
  app.get("/api/viewed-leads/:leadId", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Error checking viewed lead:", error);
      res.status(500).json({ message: "Failed to check if lead was viewed" });
    }
  });

  // Route to track when a user views a lead's contact info and deduct LeadCoins
  app.post("/api/leads/:id/view", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Error tracking lead view:", error);
      res.status(500).json({ message: "Failed to track lead view" });
    }
  });

  app.post(
    "/api/leads",
    isAuthenticated,
    hasPermission("leads_management"),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
            console.error("Error creating new category:", error);
            // If category creation fails, we'll still try to create the lead
            // but with no category
          }
        }

        // Validate the lead data
        const data = insertLeadSchema.parse(requestData);

        // Create lead
        const lead = await storage.createLead({
          ...data,
          creatorId: userId,
        });

        res.status(201).json(lead);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors[0].message });
        }
        console.error("Failed to create lead:", error);
        res.status(500).json({ message: "Failed to create lead" });
      }
    },
  );

  app.patch(
    "/api/leads/:id",
    isAuthenticated,
    hasPermission("leads_management"),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
            console.error(
              "Error creating new category during lead update:",
              error,
            );
            // If category creation fails, we'll still try to update the lead
          }
        }

        // Update lead
        const updatedData: Partial<Lead> = {};

        // Only update fields that are provided
        if (requestData.title) updatedData.title = requestData.title;
        if (requestData.description)
          updatedData.description = requestData.description;
        if (requestData.location) updatedData.location = requestData.location;
        if (requestData.price) updatedData.price = requestData.price;
        if (requestData.totalMembers)
          updatedData.totalMembers = requestData.totalMembers;
        if (requestData.images) updatedData.images = requestData.images;
        if (requestData.email) updatedData.email = requestData.email;
        if (requestData.contactNumber)
          updatedData.contactNumber = requestData.contactNumber;
        if (requestData.skills) updatedData.skills = requestData.skills;
        if (requestData.duration) updatedData.duration = requestData.duration;
        if (requestData.workType) updatedData.workType = requestData.workType;
        if (requestData.categoryId !== undefined)
          updatedData.categoryId = requestData.categoryId;

        console.log("Updating lead with data:", updatedData);

        const updatedLead = await storage.updateLead(leadId, updatedData);

        res.status(200).json(updatedLead);
      } catch (error) {
        console.error("Failed to update lead:", error);
        res.status(500).json({ message: "Failed to update lead" });
      }
    },
  );

  app.delete(
    "/api/leads/:id",
    isAuthenticated,
    // hasPermission("leads_management"),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Error deleting lead:", error);
        res.status(500).json({ message: "Failed to delete lead" });
      }
    },
  );

  // The lead view tracking route is already defined above

  // Subscription Management Routes
  app.get("/api/subscriptions", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post(
    "/api/subscriptions",
    // isAuthenticated,
    // hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: "Failed to create subscription" });
      }
    },
  );

  app.patch(
    "/api/subscriptions/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        
        // Validate subscription data
        const validatedData = insertSubscriptionSchema.partial().parse(req.body);
        
        // Update the subscription
        const updatedSubscription = await storage.updateSubscription(id, validatedData);
        
        if (!updatedSubscription) {
          return res.status(404).json({ message: "Subscription not found" });
        }
        
        res.json(updatedSubscription);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors[0].message });
        }
        console.error("Error updating subscription:", error);
        res.status(500).json({ message: "Failed to update subscription" });
      }
    },
  );

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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res.status(500).json({ message: "Failed to update subscription" });
      }
    },
  );

  app.delete(
    "/api/subscriptions/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res.status(500).json({ message: "Failed to delete subscription" });
      }
    },
  );

  // Toggle subscription active status
  app.patch(
    "/api/subscriptions/:id/toggle-status",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res
          .status(500)
          .json({ message: "Failed to toggle subscription status" });
      }
    },
  );

  app.get("/api/subscriptions/current", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch current subscription" });
    }
  });

  app.get("/api/subscriptions/history", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch subscription history" });
    }
  });

  app.get("/api/subscriptions/pending", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res
        .status(500)
        .json({ message: "Failed to fetch pending subscriptions" });
    }
  });

  app.post(
    "/api/subscriptions/subscribe",
    isAuthenticated,
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
          console.error("Error creating payment session:", error);
          return res.status(500).json({
            message: "Failed to create payment session",
            error: error.message,
          });
        }

        /* Legacy code - now using Stripe payments
        // Create user subscription with appropriate status
        const userSubscription = await storage.createUserSubscription({
          userId,
          subscriptionId,
          // If user already has an active subscription, set status to pending
          status: activeSubscription ? "pending" : "active",
        });

        // Only update lead coins if this is an active subscription (not pending)
        if (!activeSubscription) {
          // Update user's lead coins only for active subscriptions
          await storage.updateUserLeadCoins(userId, subscription.leadCoins);

          // Update session user's lead coins
          (req.session as any).user.leadCoins = subscription.leadCoins;
        }
        */

        // Get the updated user data to return to the client for real-time updates
        const updatedUser = await storage.getUser(userId);

        res.status(201).json({
          userSubscription,
          userData: updatedUser, // Include updated user data for real-time frontend updates
          message: "Subscription created successfully",
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to subscribe" });
      }
    },
  );

  app.get("/api/subscriptions/:id", async (req, res) => {
    const subscriptionId = req.params.id;

            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Error fetching subscription:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(
    "/api/subscriptions/buy-coins",
    isAuthenticated,
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res.status(500).json({ message: "Failed to buy lead coins" });
      }
    },
  );

  // Subscription purchase with Stripe payment
  app.post("/api/subscriptions/purchase", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Error creating payment session:", error);
      res.status(500).json({ message: "Failed to create payment session" });
    }
  });
  
  // Direct Stripe Checkout endpoint for subscription purchases
  app.post("/api/subscriptions/create-checkout-session", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ 
        message: "Failed to create checkout session",
        error: error.message
      });
    }
  });

  // Verify payment success (query param version)
  app.get(
    "/api/subscriptions/verify-payment",
    isAuthenticated, 
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Error verifying payment session:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error during payment verification",
        });
      }
    }
  );
  // Verify payment success (path param version - keep for backward compatibility)
  app.get(
    "/api/subscriptions/verify-payment/:sessionId",
    isAuthenticated,
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ message: "Failed to verify payment" });
      }
    },
  );

  // Payment verification endpoint
  app.get(
    "/api/payment/verify-session/:sessionId",
    isAuthenticated,
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Payment verification error:", error);
        res.status(500).json({
          message: "Failed to verify payment session",
          error: error.message,
        });
      }
    },
  );

  // Stripe webhook handler
  app.post(
    "/api/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
              // Log any errors during processing
              console.error(`Error processing subscription payment:`, error);
              return res.status(500).json({
                error: "Failed to process subscription payment",
                details: error.message ? error.message : "Unknown error",
              });
            }
          } else {
            console.log("Session metadata missing userId:", session.metadata);
          }
        } else {
          console.log(`Unhandled event type: ${event.type}`);
        }

        // Respond with 200 status for successful processing
        res.status(200).json({
          received: true,
          success: true,
          event_type: event.type,
        });
      } catch (error) {
        console.error("Error processing webhook:", error);
        console.error(error.stack); // Log the full stack trace for debugging

        // Add structured error response with more context
        return res.status(400).json({
          received: true,
          success: false,
          error: error.message,
          errorType: error.name,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // Support Ticket Routes
  app.get(
    "/api/support",
    isAuthenticated,
    hasPermission("support_management"),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch support tickets" });
      }
    },
  );

  app.get("/api/support/user", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.get("/api/support/:id", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch support ticket" });
    }
  });

  app.post("/api/support", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  app.get("/api/support/:id/replies", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res
        .status(500)
        .json({ message: "Failed to fetch support ticket replies" });
    }
  });

  app.post("/api/support/:id/reply", isAuthenticated, async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      res
        .status(500)
        .json({ message: "Failed to create support ticket reply" });
    }
  });

  app.patch(
    "/api/support/:id/status",
    isAuthenticated,
    hasPermission("support_management"),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res
          .status(500)
          .json({ message: "Failed to update support ticket status" });
      }
    },
  );

  // LeadCoin Management Routes
  app.get(
    "/api/leadcoins/settings",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch LeadCoin settings" });
      }
    },
  );

  app.patch(
    "/api/leadcoins/settings",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: "Failed to update LeadCoin settings" });
      }
    },
  );

  app.get(
    "/api/leadcoins/stats",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Error fetching LeadCoin stats:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch LeadCoin statistics" });
      }
    },
  );

  // Test route for debugging session
  app.get("/api/test-session", (req, res) => {
    console.log("Current session in test-session route:", req.session);
    res.status(200).json({
      sessionExists: !!req.session,
      userInSession: !!(req.session as any).user,
      userDetails: (req.session as any).user
        ? {
            id: (req.session as any).user.id,
            email: (req.session as any).user.email,
            role: (req.session as any).user.role,
          }
        : null,
    });
  });

  // Test route for easy admin login
  app.post("/api/dev/login-admin", async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Error logging in admin:", error);
      res.status(500).json({ message: "Failed to login admin" });
    }
  });

  // Debug/development route to create a test admin user
  app.post("/api/dev/create-admin", async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
      console.error("Error creating admin user:", error);
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });

  // Dashboard Routes
  app.get(
    "/api/admin/dashboard",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Error fetching admin dashboard data:", error);
        res.status(500).json({
          message: "Failed to fetch dashboard data",
          error: error.message,
        });
      }
    },
  );

  app.get(
    "/api/subadmin/dashboard",
    isAuthenticated,
    hasRole(["subadmin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch dashboard data" });
      }
    },
  );

  /**
   * Admin endpoint to manually trigger inactive user notifications
   * This allows administrators to send reminder emails to users
   * who haven't logged in for a specified number of days
   */
  app.post(
    "/api/admin/notify-inactive-users",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Error triggering inactive user notifications:", error);
        res
          .status(500)
          .json({ message: "Failed to trigger inactive user notifications" });
      }
    },
  );

  // Export data endpoints
  
  /**
   * Export all leads as CSV
   * Admin and subadmin only
   */
  app.get(
    "/api/export/leads",
    isAuthenticated,
    hasRole(["admin", "subadmin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Error exporting leads:", error);
        res.status(500).json({ message: "Failed to export leads" });
      }
    }
  );
  
  /**
   * Export users as CSV
   * Admin only
   */
  app.get(
    "/api/export/users",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Error exporting users:", error);
        res.status(500).json({ message: "Failed to export users" });
      }
    }
  );
  
  /**
   * Export user subscriptions as CSV
   * Admin only
   */
  app.get(
    "/api/export/subscriptions",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
            if (userId && subscriptionId) {
              try {
                // Get user subscription by session ID
                const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

                if (userSubscription) {
                  console.log(`Found user subscription with ID ${userSubscription.id}`);

                  // Make sure its not already activated
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

                  // Update users lead coins based on subscription
                  await storage.updateUserLeadCoins(userSubscription.userId, userSubscription.leadCoinsLeft);
                  console.log(`Updated users lead coins by ${userSubscription.leadCoinsLeft}`);
                } else {
                  // No subscription found, create a new one
                  console.log(`No user subscription found with session ID ${session.id}`);
                  
                  // Get subscription details
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

                  // Update users lead coins
                  await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                  console.log(`Updated users lead coins by ${subscription.leadCoins}`);
                }
              } catch (error: any) {
        console.error("Error exporting subscriptions:", error);
        res.status(500).json({ message: "Failed to export subscriptions" });
      }
    }
  );

  return httpServer;
}