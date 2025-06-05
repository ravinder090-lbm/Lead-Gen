import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { mailer } from "./mailer";
import { db } from "./db";
import { eq, and, or, like, sql, ne, desc } from "drizzle-orm";
// import { users, coinTransactions, viewedLeads } from "../shared/schema";
import { users, coinTransactions, viewedLeads, leadCoinPackages, smtpSettings, leadViews, leadCoinSettings, leads, notifications,  coupons,
  couponClaims, 
  insertLeadCoinPackageSchema} from "../shared/schema";
import bcrypt from "bcrypt";
import * as z from "zod";
import dotenv from 'dotenv';
dotenv.config();


import Stripe from 'stripe';

// Add session type declaration to augment the Express session
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      role: string;
      permissions?: string[];
    };
  }
}


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
  insertSmtpSettingsSchema,
  insertUserSchema,
  insertCouponSchema,
  claimCouponSchema,
} from "../shared/schema";
import { createSubscriptionPaymentSession, verifyPaymentSession, processStripeWebhook, createCoinPaymentSession } from "./stripe-service";

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
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Note: Session middleware is now set up in index.ts to be shared across all routes

  // Authentication middleware with detailed logging
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
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

  // Middleware to check user role
  const hasRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (roles.includes(req.session.user.role)) {
        return next();
      }

      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    };
  };

  // Authentication Routes
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      // Detailed session debugging
      console.log("Session check - Session ID:", req.sessionID);
      console.log("Session data:", JSON.stringify(req.session, null, 2));

      // If there's a session with user data, return the user
      if (req.session && req.session.user) {
        console.log("Found user in session:", req.session.user);
        const user = await storage.getUser(req.session.user.id);
        if (user) {
          // Don't send password to client
          const { password, verification_code, resetToken, ...safeUser } = user;
          return res.json(safeUser);
        } else {
          console.log("User not found in database for ID:", req.session.user.id);
        }
      } else {
        console.log("No session or user data found");
      }

      // No authenticated user
      return res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      console.error("Auth check error:", error);
      return res.status(500).json({ message: "Failed to authenticate" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
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

      // Check if account is verified
      if (user.verified === false) {
        return res.status(401).json({ message: "Please verify your email first" });
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
      console.log(`Updated lastLoginAt for user ID: ${user.id}`);

      // Set session expiration based on rememberMe
      req.session.cookie.maxAge = rememberMe ?
        30 * 24 * 60 * 60 * 1000 : // 30 days
        7 * 24 * 60 * 60 * 1000;   // 7 days

      // Set user data in session with detailed logging
      console.log(`Setting user in session: ID=${user.id}, Role=${user.role}`);

      // Create session user object
      req.session.user = {
        id: user.id,
        role: user.role
      };

      // Force session regeneration to ensure proper storage
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }

        // Set user data again after regeneration
        req.session.user = {
          id: user.id,
          role: user.role
        };

        // Set session expiration
        req.session.cookie.maxAge = rememberMe ?
          30 * 24 * 60 * 60 * 1000 : // 30 days
          7 * 24 * 60 * 60 * 1000;   // 7 days

        // Save the session explicitly
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Session save failed" });
          }

          console.log(`Session saved successfully for user ID: ${user.id}`);
          console.log("Final session data:", JSON.stringify(req.session, null, 2));

          // Create sanitized user object without sensitive data
          const { password: _, verification_code, resetToken, ...safeUser } = user;

          return res.json(safeUser);
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
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

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Validate request body using Zod schema
      const validationResult = insertUserSchema.safeParse(req.body);
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

      // Generate 4-digit verification code
      const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

      // Create user with pending status
      const newUser = await storage.createUser({
        email,
        name,
        password, // Password will be hashed in storage implementation
        role: "user",
        status: "pending",
        verificationCode,
        // verificationCode will be generated in storage
        // leadCoins will be set during user creation

      });

      // Log for debugging
      console.log("Generated verification code:", verificationCode);

      // Send verification email
      await mailer.sendVerificationEmail(email, verificationCode);

      return res.status(201).json({
        message: "User registered successfully, verification email sent",
        userId: newUser.id,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      return res.status(500).json({
        message: "Failed to register user: " + error.message,
      });
    }
  });

  // OTP Verification
  app.post("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const data = verifyUserSchema.parse(req.body);
      console.log("Verification request:", data);

      // Get user by email
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Check verification code
      console.log("Verification code check:", {
        stored: user.verification_code,
        provided: data.code,
      });

      // Trim any whitespace from both codes before comparison
      const storedCode = user.verification_code?.trim();
      const providedCode = data.code?.trim();

      if (!storedCode || storedCode !== providedCode) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Mark user as verified and update status to active
      await storage.verifyUser(user.id);

      // Get the updated user data to confirm the changes
      const updatedUser = await storage.getUser(user.id);
      console.log("User after verification:", {
        id: updatedUser?.id,
        email: updatedUser?.email,
        verified: updatedUser?.verified,
        status: updatedUser?.status,
      });

      return res.status(200).json({
        message: "Email verification successful",
        userId: user.id,
      });
    } catch (error: any) {
      console.error("Verification error:", error);
      return res.status(400).json({ message: error.message });
    }
  });

  // Password reset request - initiates the flow
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Lookup user by email
      const user = await storage.getUserByEmail(email);

      // Don't reveal if the user exists or not for security reasons
      if (!user) {
        console.log(`Reset password requested for non-existent email: ${email}`);
        return res.status(200).json({ message: "If your email is registered, you will receive reset instructions" });
      }

      // Generate a reset token (use uuid for better security)
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Store the reset token in the user record
      await storage.updateUserResetToken(user.id, resetToken);

      // Send password reset email with the token
      // Format: https://yourapp.com/reset-password?token=TOKEN&email=EMAIL
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}&email=${email}`;

      try {
        await mailer.sendPasswordResetEmail(email, user.name || 'User', resetLink);
        console.log(`Password reset email sent to ${email} with token ${resetToken}`);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        return res.status(500).json({ message: "Failed to send reset email" });
      }

      return res.status(200).json({ message: "Password reset instructions sent to your email" });
    } catch (error: any) {
      console.error("Error sending reset password email:", error);
      res.status(500).json({ message: "Failed to send reset password email" });
    }
  });

  // Profile update endpoint
  app.patch("/api/auth/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.session.user.id;
      const { name, profileImage } = req.body;

      console.log(`Profile update request for user ${userId}:`, { name, hasImage: !!profileImage });

      // Validate input
      if (!name && !profileImage) {
        return res.status(400).json({ message: "At least one field must be provided" });
      }

      // Build update object
      const updateData: any = {};
      if (name) updateData.name = name;
      if (profileImage) updateData.profileImage = profileImage;

      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`Profile updated successfully for user ${userId}`);
      return res.json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change password endpoint with proper validation
  app.post("/api/auth/change-password", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(req.session, '--=-=-=-=-=-=-=-=-=-=----==-')
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
      console.log(`Verifying current password for user ${userId}`);
      console.log(`Current password provided: ${currentPassword.substring(0, 3)}...`);
      const isPasswordValid = await storage.verifyPassword(userId, currentPassword);
      console.log(`Password verification result: ${isPasswordValid}`);

      if (!isPasswordValid) {
        console.log(`Password change failed: Current password is incorrect for user ${userId}`);
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Password is verified, proceed with update
      console.log(`Updating password for user ${userId}`);
      console.log(`New password provided: ${newPassword.substring(0, 3)}...`);
      await storage.updateUserPassword(userId, newPassword);

      // Verify the password was actually updated by testing it
      console.log(`Verifying new password was saved correctly for user ${userId}`);
      const newPasswordWorks = await storage.verifyPassword(userId, newPassword);
      console.log(`New password verification result: ${newPasswordWorks}`);

      if (!newPasswordWorks) {
        console.error(`CRITICAL: New password verification failed after update for user ${userId}`);
        return res.status(500).json({ message: "Password update failed - please try again" });
      }

      console.log(`Password successfully changed and verified for user ${userId}`);
      return res.json({ success: true, message: "Password successfully updated" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      return res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Set new password with token
  app.post("/api/auth/set-new-password", async (req: Request, res: Response) => {
    try {
      const { email, resetToken, password } = req.body;

      if (!email || !resetToken || !password) {
        return res.status(400).json({
          message: "Email, reset token and new password are required"
        });
      }

      // Find user with matching email and reset token
      const user = await storage.getUserByEmail(email);

      if (!user || user.resetToken !== resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Update the user's password (storage method handles hashing)
      await storage.updateUserPassword(user.id, password);
      await storage.updateUserResetToken(user.id, null); // Clear the reset token

      return res.status(200).json({ message: "Password successfully reset" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // User dashboard data
  app.get("/api/user/dashboard", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const data = await storage.getUserDashboardData(req.session.user.id);
      return res.json(data);
    } catch (error) {
      console.error("Error fetching user dashboard data:", error);
      return res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Admin dashboard data
  app.get("/api/admin/dashboard", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const data = await storage.getAdminDashboardData();
      return res.json(data);
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      return res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Subadmin dashboard data
  app.get("/api/subadmin/dashboard", isAuthenticated, hasRole(["subadmin"]), async (req: Request, res: Response) => {
    try {
      const data = await storage.getSubadminDashboardData();
      return res.json(data);
    } catch (error) {
      console.error("Error fetching subadmin dashboard data:", error);
      return res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Lead Categories
  app.get("/api/lead-categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllLeadCategories();
      return res.json(categories);
    } catch (error) {
      console.error("Error fetching lead categories:", error);
      return res.status(500).json({ message: "Failed to fetch lead categories" });
    }
  });

  app.get("/api/lead-categories/active", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const categories = await storage.getActiveLeadCategories();
      return res.json(categories);
    } catch (error) {
      console.error("Error fetching active lead categories:", error);
      return res.status(500).json({ message: "Failed to fetch active lead categories" });
    }
  });

  app.get("/api/lead-categories/used", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const categories = await storage.getUsedLeadCategories();
      return res.json(categories);
    } catch (error) {
      console.error("Error fetching used lead categories:", error);
      return res.status(500).json({ message: "Failed to fetch used lead categories" });
    }
  });

  // Get lead category by ID
  app.get("/api/lead-categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const category = await storage.getLeadCategory(id);
      if (!category) {
        return res.status(404).json({ message: "Lead category not found" });
      }

      return res.json(category);
    } catch (error) {
      console.error(`Error fetching lead category ${req.params.id}:`, error);
      return res.status(500).json({ message: "Failed to fetch lead category" });
    }
  });

  // Create new lead category
  app.post("/api/lead-categories", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const categoryData = insertLeadCategorySchema.parse(req.body);
      const newCategory = await storage.createLeadCategory(categoryData);
      return res.status(201).json(newCategory);
    } catch (error) {
      console.error("Error creating lead category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to create lead category" });
    }
  });

  // Update lead category
  app.patch("/api/lead-categories/:id", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const categoryData = updateLeadCategorySchema.parse(req.body);
      const updatedCategory = await storage.updateLeadCategory(id, categoryData);
      return res.json(updatedCategory);
    } catch (error) {
      console.error(`Error updating lead category ${req.params.id}:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to update lead category" });
    }
  });

  // Delete lead category
  app.delete("/api/lead-categories/:id", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      await storage.deleteLeadCategory(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(`Error deleting lead category ${req.params.id}:`, error);
      if (error instanceof Error && error.message.includes("used by leads")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Failed to delete lead category" });
    }
  });

  // Leads
  app.get("/api/leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Lead fetch request received with cache-busting:", req.query.t);

      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log(`Fetching leads for user ${req.session.user.id} (${req.session.user.role})`);

      // Add server-side caching with a short TTL (5 minutes)
      // Generate a cache key based on the timestamp and user role
      const cacheKey = `leads_${req.session.user.role}_${Math.floor(Date.now() / (5 * 60 * 1000))}`;

      // Fetch leads with optimized query
      const leads = await storage.getAllLeads();

      console.log(`Successfully returned ${leads.length} leads`);
      return res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      return res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      return res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      return res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  // Create lead endpoint
  app.post("/api/leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.session.user.id;
      console.log(`Creating lead for user ID: ${userId}, Role: ${req.session.user.role}`);

      // Process request data
      const requestData = req.body;
      console.log("Lead data received:", requestData);

      // Check if a new category needs to be created
      if (requestData.categoryName && (!requestData.categoryId || requestData.categoryId < 0)) {
        try {
          // Check if category with this name already exists
          const existingCategory = await storage.getCategoryByName(requestData.categoryName);

          if (existingCategory) {
            console.log(`Using existing category with ID ${existingCategory.id}`);
            // Use existing category
            requestData.categoryId = existingCategory.id;
          } else {
            console.log(`Creating new category: ${requestData.categoryName}`);
            // Create a new category
            const newCategory = await storage.createLeadCategory({
              name: requestData.categoryName,
              description: `Category for ${requestData.title}`
            });

            console.log(`Created new category with ID ${newCategory.id}`);
            // Update request with new category ID
            requestData.categoryId = newCategory.id;
          }
        } catch (error) {
          console.error("Error handling category:", error);
          // Continue with lead creation even if category handling fails
        }
      }

      console.log("Processed lead data:", requestData);

      // Create lead with the data (we'll skip strict validation for now to fix the issue)
      const lead = await storage.createLead({
        ...requestData,
        creatorId: userId
      });

      console.log("Created new lead:", lead);
      return res.status(200).json(lead);
    } catch (error: any) {
      console.error("Error creating lead:", error);
      return res.status(500).json({ message: `Failed to create lead: ${error.message || 'Unknown error'}` });
    }
  });

  // Update lead endpoint
  app.patch("/api/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      console.log(`Attempting to update lead with ID: ${leadId}`);

      // Check if the lead exists
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check if user has permission (admin, subadmin or creator of the lead)
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      if (userRole !== 'admin' && userRole !== 'subadmin' && lead.creatorId !== userId) {
        return res.status(403).json({ message: "You don't have permission to update this lead" });
      }

      const requestData = req.body;

      // Handle category name if provided (for custom categories)
      if (requestData.categoryName && (!requestData.categoryId || requestData.categoryId < 0)) {
        try {
          // Check if the category already exists
          const existingCategory = await storage.getCategoryByName(requestData.categoryName);

          if (existingCategory) {
            // Use existing category
            requestData.categoryId = existingCategory.id;
          } else {
            // Create new category
            const newCategory = await storage.createLeadCategory({
              name: requestData.categoryName,
              description: `Category for ${requestData.title || 'lead'}`,
            });
            requestData.categoryId = newCategory.id;
          }

          // Remove categoryName as it's not part of the lead schema
          delete requestData.categoryName;
        } catch (error) {
          console.error("Error handling category during lead update:", error);
          // Continue with lead update even if category handling fails
        }
      }

      // Create an object with the fields to update
      const updatedData: Partial<typeof lead> = {};

      // Only update fields that are provided
      if (requestData.title !== undefined) updatedData.title = requestData.title;
      if (requestData.description !== undefined) updatedData.description = requestData.description;
      if (requestData.location !== undefined) updatedData.location = requestData.location;
      if (requestData.price !== undefined) updatedData.price = requestData.price;
      if (requestData.totalMembers !== undefined) updatedData.totalMembers = requestData.totalMembers;
      if (requestData.images !== undefined) updatedData.images = requestData.images;
      if (requestData.email !== undefined) updatedData.email = requestData.email;
      if (requestData.contactNumber !== undefined) updatedData.contactNumber = requestData.contactNumber;
      if (requestData.skills !== undefined) updatedData.skills = requestData.skills;
      if (requestData.duration !== undefined) updatedData.duration = requestData.duration;
      if (requestData.workType !== undefined) updatedData.workType = requestData.workType;
      if (requestData.categoryId !== undefined) updatedData.categoryId = requestData.categoryId;

      console.log("Updating lead with data:", updatedData);

      // Update the lead
      const updatedLead = await storage.updateLead(leadId, updatedData);

      console.log(`Successfully updated lead with ID: ${leadId}`);
      return res.status(200).json(updatedLead);
    } catch (error: any) {
      console.error("Error updating lead:", error);
      return res.status(500).json({ message: `Failed to update lead: ${error.message || 'Unknown error'}` });
    }
  });

  // Delete lead endpoint
  app.delete("/api/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      console.log(`Attempting to delete lead with ID: ${leadId}`);

      // Check if the lead exists
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check if user has permission (admin or creator of the lead)
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      if (userRole !== 'admin' && userRole !== 'subadmin' && lead.creatorId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this lead" });
      }

      // Delete the lead
      await storage.deleteLead(leadId);

      console.log(`Successfully deleted lead with ID: ${leadId}`);
      return res.status(200).json({ message: "Lead deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      return res.status(500).json({ message: `Failed to delete lead: ${error.message || 'Unknown error'}` });
    }
  });

  // Endpoint to check if a user has already viewed a lead
  app.get("/api/viewed-leads/:leadId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.session.user.id;
      const leadId = parseInt(req.params.leadId);

      if (isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      const viewedLead = await storage.getViewedLead(userId, leadId);
      return res.json({ found: !!viewedLead });
    } catch (error) {
      console.error("Error checking if lead was viewed:", error);
      return res.status(500).json({ message: "Failed to check if lead was viewed" });
    }
  });

  // Route to track when a user views a lead and deduct LeadCoins
  // app.post("/api/leads/:id/view", isAuthenticated, async (req: Request, res: Response) => {
  //   try {
  //     if (!req.session?.user) {
  //       return res.status(401).json({ message: "Not authenticated" });
  //     }

  //     const userId = req.session.user.id;
  //     const leadId = parseInt(req.params.id);

  //     if (isNaN(leadId)) {
  //       return res.status(400).json({ message: "Invalid lead ID" });
  //     }

  //     // Admin and subadmin roles don't need to spend coins
  //     if (req.session.user.role === "admin" || req.session.user.role === "subadmin") {
  //       return res.json({ success: true, alreadyViewed: true });
  //     }

  //     // Check if the user has already viewed this lead
  //     const viewedLead = await storage.getViewedLead(userId, leadId);

  //     // If already viewed, return success without deducting coins
  //     if (viewedLead) {
  //       return res.json({ success: true, alreadyViewed: true });
  //     }

  //     // Get lead coin settings
  //     const settings = await storage.getLeadCoinSettings();
  //     console.log("Lead coin settings:", settings);
  //     const contactInfoCost = settings?.contactInfoCost || 5; // Default cost is 5 if not set

  //     // Check if user has enough lead coins
  //     const user = await storage.getUser(userId);

  //     if (!user) {
  //       return res.status(404).json({ message: "User not found" });
  //     }

  //     if (user.leadCoins < contactInfoCost) {
  //       return res.status(400).json({
  //         message: "Insufficient lead coins",
  //         requiredCoins: contactInfoCost,
  //         availableCoins: user.leadCoins
  //       });
  //     }

  //     // Deduct lead coins
  //     const remainingCoins = user.leadCoins - contactInfoCost;
  //     await storage.updateUserLeadCoins(userId, remainingCoins);

  //     await db.insert(coinTransactions).values({
  //       userId: userId,
  //       adminId: null,
  //       amount: contactInfoCost,
  //       type: "spent",
  //       description: "Lead contact info view"
  //     });

  //     // Record the view
  //     await storage.createViewedLead(userId, leadId);

  //     return res.json({
  //       success: true,
  //       alreadyViewed: false,
  //       remainingCoins: remainingCoins,
  //       deducted: contactInfoCost
  //     });
  //   } catch (error) {
  //     console.error("Error tracking lead view:", error);
  //     return res.status(500).json({ message: "Failed to track lead view" });
  //   }
  // });
  app.get("/api/lead-views/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const userLeadViews = await db
        .select({
          id: leadViews.id,
          userId: leadViews.userId,
          leadId: leadViews.leadId,
          coinsSpent: leadViews.coinsSpent,
          viewType: leadViews.viewType,
          viewedAt: leadViews.viewedAt,
          userName: users.name,
          userEmail: users.email,
          leadTitle: leads.title,
          leadLocation: leads.location,
        })
        .from(leadViews)
        .innerJoin(users, eq(leadViews.userId, users.id))
        .innerJoin(leads, eq(leadViews.leadId, leads.id))
        .where(eq(leadViews.userId, user.id))
        .orderBy(desc(leadViews.viewedAt));
      res.json(userLeadViews);
    } catch (error: any) {
      console.error("Error fetching user lead views:", error);
      res.status(500).json({ message: "Failed to fetch user lead views", error: error.message });
    }
  });
  // Subscriptions
  app.get("/api/subscriptions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const subscriptions = await storage.getAllSubscriptions();
      return res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      return res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Create subscription plan
  app.post("/api/subscriptions", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      // Validate request body against the schema
      const validatedData = insertSubscriptionSchema.parse(req.body);

      // Create the subscription in database
      const newSubscription = await storage.createSubscription(validatedData);

      console.log(`Admin (${req.session?.user?.id}) created new subscription plan:`, newSubscription);

      return res.status(200).json(newSubscription);
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  // Delete subscription plan
  app.delete("/api/subscriptions/:id", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid subscription ID" });
      }

      // Check if subscription exists
      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      console.log(`Admin (${req.session?.user?.id}) is deleting subscription with ID: ${id}`);

      // Delete the subscription
      await storage.deleteSubscription(id);

      console.log(`Subscription ${id} has been successfully deleted`);
      return res.status(200).json({ message: "Subscription deleted successfully" });
    } catch (error) {
      console.error("Error deleting subscription:", error);
      return res.status(500).json({ message: "Failed to delete subscription" });
    }
  });

  app.get("/api/subscriptions/current", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const subscription = await storage.getUserActiveSubscription(req.session.user.id);
      return res.json(subscription || null);
    } catch (error) {
      console.error("Error fetching current subscription:", error);
      return res.status(500).json({ message: "Failed to fetch current subscription" });
    }
  });

  app.get("/api/subscriptions/pending", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user's subscription history
      const subscriptions = await storage.getUserSubscriptionHistory(req.session.user.id);

      // Filter for pending subscriptions
      const pendingSubscriptions = subscriptions.filter(sub =>
        sub.status === "pending" || (sub.status === "active" && !sub.paymentVerified)
      );

      return res.json(pendingSubscriptions);
    } catch (error) {
      console.error("Error fetching pending subscriptions:", error);
      return res.status(500).json({ message: "Failed to fetch pending subscriptions" });
    }
  });

  app.get("/api/subscriptions/history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Get user's full subscription history
      const allSubscriptions = await storage.getUserSubscriptionHistory(req.session.user.id);

      // Paginate the results
      // Get admin coin transfers for this user
      const coinTransfers = await db
        .select({
          id: coinTransactions.id,
          amount: coinTransactions.amount,
          type: coinTransactions.type,
          description: coinTransactions.description,
          createdAt: coinTransactions.createdAt,
          adminId: coinTransactions.adminId,
          adminName: users.name
        })
        .from(coinTransactions)
        .leftJoin(users, eq(coinTransactions.adminId, users.id))
        .where(
          and(
            eq(coinTransactions.userId, req.session.user.id),
            eq(coinTransactions.type, "admin_topup")
          )
        )
        .orderBy(desc(coinTransactions.createdAt));
      // Combine subscriptions and coin transfers into a unified history
      const combinedHistory = [
        ...allSubscriptions.map(sub => ({
          ...sub,
          type: 'subscription' as const,
          sortDate: sub.createdAt
        })),
        ...coinTransfers.map(transfer => ({
          id: transfer.id,
          type: 'coin_transfer' as const,
          amount: transfer.amount,
          description: transfer.description,
          createdAt: transfer.createdAt,
          adminName: transfer.adminName,
          sortDate: transfer.createdAt
        }))
      ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

      // Paginate the combined results
      const paginatedHistory = combinedHistory.slice(offset, offset + limit);

      // Return paginated data with metadata
      return res.json({
        history: paginatedHistory,
        pagination: {
          total: combinedHistory.length,
          page,
          limit,
          totalPages: Math.ceil(combinedHistory.length / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching subscription history:", error);
      return res.status(500).json({ message: "Failed to fetch subscription history" });
    }
  });

  // Support tickets
  app.get("/api/support/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const tickets = await storage.getUserSupportTickets(req.session.user.id);
      return res.json(tickets);
    } catch (error) {
      console.error("Error fetching user support tickets:", error);
      return res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  // Users
  app.get("/api/users", isAuthenticated, hasRole(["admin", "subadmin"]), async (req: Request, res: Response) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const searchTerm = req.query.search ? (req.query.search as string) : '';

      // Get users with search capability
      const { users, total } = await storage.getAllUsers(page, limit, searchTerm);

      return res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Delete user
  app.delete("/api/users/:id", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Ensure admin role
      if (req.session.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }

      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent deleting own account
      if (userId === req.session.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      console.log(`Admin (${req.session.user.id}) is deleting user with ID: ${userId}`);

      // Delete the user
      await storage.deleteUser(userId);

      console.log(`User ${userId} has been successfully deleted`);
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: "Failed to delete user" });
    }
  });
  // Export users as CSV
  app.get("/api/export/users", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      // Get all users (without pagination)
      const allUsers = await storage.getAllUsersNoPagination();

      if (!allUsers || allUsers.length === 0) {
        return res.status(404).json({ message: "No users found to export" });
      }

      // Simplify user data for export (remove sensitive information)
      const exportUsers = allUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        verified: user.verified ? "Yes" : "No",
        registeredAt: user.createdAt ? new Date(user.createdAt).toISOString() : "",
        lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : ""
      }));

      // Convert to CSV
      const csv = convertToCSV(exportUsers);

      // Set headers for file download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=users-export.csv");

      // Send the CSV data
      return res.send(csv);
    } catch (error) {
      console.error("Error exporting users:", error);
      return res.status(500).json({ message: "Failed to export users" });
    }
  });

  // Subadmin Management
  app.get("/api/subadmins", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.search ? (req.query.search as string) : '';
      const subadmins = await storage.getSubadmins(searchTerm);
      return res.json(subadmins);
    } catch (error) {
      console.error("Error fetching subadmins:", error);
      return res.status(500).json({ message: "Failed to fetch subadmins" });
    }
  });

  app.post("/api/subadmins", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { name, email, password, permissions } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password are required" });
      }

      // Check if email is already in use
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "Email already in use",
        });
      }

      // When admins create subadmins, the subadmins should be automatically verified and active
      const subadmin = await storage.createSubadmin({
        name,
        email,
        password,
        permissions: permissions || [],
        status: "active",
        verified: true  // Make sure subadmins are automatically verified
      });

      console.log(`Admin created a new subadmin: ${subadmin.id} - ${subadmin.email}`);

      return res.status(201).json(subadmin);
    } catch (error) {
      console.error("Error creating subadmin:", error);
      return res.status(500).json({ message: "Failed to create subadmin" });
    }
  });

  app.patch("/api/subadmins/:id/permissions", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { permissions } = req.body;

      if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions array is required" });
      }

      await storage.updateSubadminPermissions(id, permissions);

      return res.json({ success: true });
    } catch (error) {
      console.error("Error updating subadmin permissions:", error);
      return res.status(500).json({ message: "Failed to update subadmin permissions" });
    }
  });

  app.delete("/api/subadmins/:id", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      // First, we get the user to confirm it's a subadmin
      const user = await storage.getUser(id);

      if (!user || user.role !== "subadmin") {
        return res.status(404).json({ message: "Subadmin not found" });
      }

      await storage.deleteUser(id);

      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting subadmin:", error);
      return res.status(500).json({ message: "Failed to delete subadmin" });
    }
  });

  // Subscription purchase endpoint
  app.post("/api/subscriptions/purchase", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID is required" });
      }

      // Get user details
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }



      // Get subscription details
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      // const getActivesubscription = await storage.getUserActiveSubscription(user.id);
      // if (getActivesubscription && getActivesubscription.initial_lead_coins   ) {
      //   return res.status(404).json({ message: "Subscription not found" });
      // }

      // Create payment session
      const paymentSession = await createSubscriptionPaymentSession(user, subscription, 'subscriptions');

      return res.json({ paymentSession });
    } catch (error: any) {
      console.error("Error creating payment session:", error);
      return res.status(500).json({ message: "Failed to create payment session" });
    }
  });
  app.post("/api/subscriptions/purchase-coin", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { leadpurchaseId } = req.body;

      if (!leadpurchaseId) {
        return res.status(400).json({ message: "leadpurchase ID is required" });
      }

      // Get user details
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get subscription details

      const subscription = await storage.getLeadPackages(leadpurchaseId);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }


      // Create payment session
      const paymentSession = await createCoinPaymentSession(user, subscription, "coins");

      return res.json({ paymentSession });
    } catch (error: any) {
      console.error("Error creating payment session:", error);
      return res.status(500).json({ message: "Failed to create payment session" });
    }
  });
  // Verify payment status endpoint
  app.get("/api/subscriptions/verify-payment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { sessionId, type } = req.query;
      const isCoinPurchase = req.query.coins;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ message: "Session ID is required" });
      }

      console.log(`Checking payment status for session ID: ${sessionId} (${isCoinPurchase ? 'Coin Purchase' : 'Subscription'})`);

      console.log("payment type =====", isCoinPurchase, type, req.query)

      // Check for coin purchase if the coins flag is set
      if (isCoinPurchase) {
        // Look for a coin purchase with this session ID
        const coinPurchase = await storage.getCoinPurchaseBySessionId(sessionId);
        console.log(coinPurchase,'=-=-coinPurchase=---=-=-=-=')

        if (coinPurchase) {
          console.log(`Found coin purchase with ID ${coinPurchase.id} for session ${sessionId}`);

          // If it's already completed, just return success
          if (coinPurchase.status === 'completed') {
            return res.json({
              verified: true,
              success: true,
              coinPurchase: coinPurchase,
              message: "Your coin purchase has already been processed"
            });
          }



          if (coinPurchase) {
            // Update the coin purchase status
            await storage.updateCoinPurchaseStatus(coinPurchase.id, 'completed');

            // Get the subscription details to know how many coins to add
            const subscription = await storage.getLeadPackages(coinPurchase.subscriptionId);

            if (subscription) {
              // Update the user's lead coins
              const user = await storage.getUser(req.session.user.id);
              if (user) {
                const updatedUser = await storage.updateUser(user.id, {
                  leadCoins: user.leadCoins + subscription.leadCoins
                });

                let currentSubscription=await storage.getUserActiveSubscription(user.id)
                if(currentSubscription){
                 let newcoins=currentSubscription?.leadCoinsLeft+subscription?.leadCoins
                 await storage.updateUserSubscription(currentSubscription.id,{leadCoinsLeft:newcoins})
                }
 
                console.log(`Added ${subscription.leadCoins} LeadCoins to user ${user.id}, now has ${updatedUser.leadCoins}`);

                return res.json({
                  verified: true,
                  success: true,
                  coinPurchase: {
                    ...coinPurchase,
                    status: 'completed'
                  },
                  leadCoins: subscription.leadCoins,
                  message: "Your coin purchase has been successfully processed"
                });
              }
            }
          }


        }
      } else {
        // Regular subscription verification
        // First, check if we have a user subscription with this payment session ID
        const existingSubscription = await storage.getUserSubscriptionByPaymentSession(sessionId);

        if (!existingSubscription) {
          console.log(`No subscription found with payment session ID: ${sessionId}`);
          // Try to get pending subscriptions for this user
          const pendingSubscriptions = await storage.getUserSubscriptionHistory(req.session.user.id);
          const pendingSub = pendingSubscriptions.find(sub => sub.status === 'pending');

          if (pendingSub) {
            console.log(`Using existing pending subscription for user: ${req.session.user.id}`);
            // Update the payment session ID on the pending subscription
            await storage.updateUserSubscription(pendingSub.id, {
              paymentSessionId: sessionId,
              status: 'pending'
            });
          }
        }
      }

      // Now verify the payment status
      const verificationResult = await verifyPaymentSession(sessionId);

      return res.json(verificationResult);
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      return res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // Create payment session endpoint (direct frontend integration)
  app.post("/api/payment/create-session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID is required" });
      }

      // Get user details
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get subscription details
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      // Create payment session
      const paymentSession = await createSubscriptionPaymentSession(user, subscription, "subcription");

      return res.json({ paymentSession });
    } catch (error: any) {
      console.error("Error creating payment session:", error);
      return res.status(500).json({ message: "Failed to create payment session" });
    }
  });

  // Verify payment session endpoint (direct frontend integration)
  app.get("/api/payment/verify-session/:sessionId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Verify payment status
      const verificationResult = await verifyPaymentSession(sessionId);

      return res.json(verificationResult);
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      return res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // Process Google Pay payment endpoint
  app.post("/api/payment/google-pay", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { subscriptionId, paymentToken } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID is required" });
      }

      if (!paymentToken) {
        return res.status(400).json({ message: "Payment token is required" });
      }

      // Process the Google Pay payment (implementation needed)
      return res.status(501).json({ message: "Google Pay integration not yet implemented" });
    } catch (error: any) {
      console.error("Error processing Google Pay payment:", error);
      return res.status(500).json({ message: "Failed to process Google Pay payment" });
    }
  });

  // Create checkout session endpoint (fallback for direct payment)
  // Add Buy Coins endpoint before the checkout session endpoint
  app.post("/api/subscriptions/buy-coins", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID is required" });
      }

      // Get user details
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get subscription details (coin package)
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2023-10-16' });


      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${subscription.leadCoins} LeadCoins`,
                description: `Purchase ${subscription.leadCoins} LeadCoins for your account`,
              },
              unit_amount: Math.round(subscription.price * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`}/user/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}&coins=true`,
        cancel_url: `${process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`}/user/subscriptions?canceled=true&coins=true`,
        metadata: {
          userId: user.id.toString(),
          subscriptionId: subscription.id.toString(),
          type: 'coins_purchase' // Specify that this is a coin purchase
        },
      });

      // Record the coin purchase transaction
      const coinPurchase = await storage.createCoinPurchase({
        userId: user.id,
        subscriptionId: subscription.id,
        amount: subscription.price,
        leadCoins: subscription.leadCoins,
        paymentSessionId: session.id,
        status: 'pending',
        purchaseDate: new Date()
      });

      console.log(`Created coin purchase:`, coinPurchase);

      return res.json({
        sessionId: session.id,
        url: session.url,
        message: "Redirecting to payment page..."
      });
    } catch (error: any) {
      console.error("Error creating coin purchase session:", error);
      return res.status(500).json({ message: "Failed to create coin purchase session: " + error.message });
    }
  });

  app.post("/api/subscriptions/create-checkout-session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID is required" });
      }

      // Get user details
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get subscription details
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      // Create a Stripe checkout session
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/user/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/user/subscriptions?canceled=true`,
        customer_email: user.email,
        client_reference_id: user.id.toString(),
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: subscription.name,
                description: subscription.description || undefined,
              },
              unit_amount: Math.round(subscription.price * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: user.id.toString(),
          subscriptionId: subscription.id.toString(),
          subscriptionName: subscription.name,
        },
      });

      // Create a pending subscription record with the session ID
      await storage.createUserSubscription({
        userId: user.id,
        subscriptionId: subscription.id,
        status: "pending",
        paymentSessionId: session.id,
        startDate: new Date(),
        endDate: new Date(
          new Date().setDate(new Date().getDate() + subscription.durationDays)
        ),
        leadCoinsLeft: subscription.leadCoins,
        amount: subscription.price,
      });

      return res.json({
        checkoutUrl: session.url,
        sessionId: session.id
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      return res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Stripe webhook endpoint
  // API endpoint for creating a payment session to buy lead coins
  app.post("/api/subscriptions/buy-coins", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.session.user.id;
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID is required" });
      }

      // Get the subscription plan to determine how many coins to add
      const subscription = await storage.getSubscription(subscriptionId);

      if (!subscription) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      if (!subscription.active) {
        return res.status(400).json({ message: "This subscription plan is not active" });
      }

      // Get the user to attach their info to the payment
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create a Stripe checkout session
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-06-20',
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/user/subscriptions?success=true&coins=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/user/subscriptions?canceled=true&coins=true`,
        customer_email: user.email,
        client_reference_id: user.id.toString(),
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${subscription.leadCoins} LeadCoins`,
                description: `Purchase of ${subscription.leadCoins} LeadCoins for your account`,
              },
              unit_amount: Math.round(subscription.price * 100),  // Convert to cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: user.id.toString(),
          subscriptionId: subscription.id.toString(),
          leadCoins: subscription.leadCoins.toString(),
          type: 'coins_purchase',
        },
      });

      // Record the payment intent in the database for later verification
      await storage.createCoinPurchase({
        userId: user.id,
        subscriptionId: subscription.id,
        paymentSessionId: session.id,
        status: 'pending',
        amount: subscription.price,
        leadCoins: subscription.leadCoins
      });

      // Return payment session details to the client
      return res.json({
        paymentSession: {
          sessionId: session.id,
          paymentUrl: session.url,
        },
        message: "Redirecting to payment page...",
      });
    } catch (error: any) {
      console.error("Error creating payment session for coins:", error);
      return res.status(500).json({ message: "Failed to create payment session: " + error.message });
    }
  });

  app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      return res.status(400).send('Missing stripe-signature header');
    }

    try {
      // Get stripe instance
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-06-20',
      });

      // Construct the event from the raw body and signature
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      console.log(`Webhook received: ${event.type}`);

      // Handle specific event types
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log(`Payment successful for session: ${session.id}`);

        try {
          // Extract metadata
          const userId = parseInt(session.metadata?.userId || '0');
          const subscriptionId = parseInt(session.metadata?.subscriptionId || '0');
          const transactionType = session.metadata?.type || 'subscription';

          if (!userId || !subscriptionId) {
            console.error('Missing metadata in session:', session.metadata);
            return res.status(400).json({ error: 'Missing metadata in session' });
          }

          console.log(`Processing ${transactionType} for user ${userId}, subscription ${subscriptionId}`);

          // Check if this is a coin purchase transaction
          if (transactionType === 'coins_purchase' || transactionType === 'leadcoins') {
            // Check if we have a coin purchase record for this session
            const coinPurchase = await storage.getCoinPurchaseBySessionId(session.id);

            if (coinPurchase) {
              // Make sure it's not already processed
              if (coinPurchase.status === "completed") {
                console.log(`Coin purchase ${coinPurchase.id} is already completed, skipping update`);
                return res.status(200).json({ received: true, status: "already_processed" });
              }

              // Update coin purchase status
              await storage.updateCoinPurchaseStatus(coinPurchase.id, "completed");

              // For direct LeadCoins purchases, use the coin amount from metadata
              let coinsToAdd = 0;
              if (transactionType === 'leadcoins' && session.metadata?.coinAmount) {
                coinsToAdd = parseInt(session.metadata.coinAmount);
              } else {
                // For subscription-based coin purchases, get subscription details
                const subscription = await storage.getSubscription(subscriptionId);
                if (!subscription) {
                  console.error(`Subscription ${subscriptionId} not found`);
                  return res.status(400).json({ error: "Subscription not found" });
                }
                coinsToAdd = subscription.leadCoins;
              }

              // Get user to update lead coins
              const user = await storage.getUser(userId);
              if (!user) {
                console.error(`User ${userId} not found`);
                return res.status(400).json({ error: "User not found" });
              }

              // Update user's lead coins
              const updatedUser = await storage.updateUser(userId, {
                leadCoins: user.leadCoins + coinsToAdd
              });

              console.log(`Added ${coinsToAdd} LeadCoins to user ${userId} (new balance: ${user.leadCoins + coinsToAdd})`);
            } else if (transactionType === 'leadcoins') {
              // Create new coin purchase record for direct LeadCoins purchase
              const coinAmount = parseInt(session.metadata?.coinAmount || '0');
              const price = (session.amount_total || 0) / 100; // Convert from cents

              const newCoinPurchase = await storage.createCoinPurchase({
                userId,
                paymentSessionId: session.id,
                leadCoins: coinAmount,
                subscriptionId: 0, // Default for direct coin purchases
                amount: price,
                status: "completed"
              });

              console.log(`Created new LeadCoins purchase:`, newCoinPurchase);

              // Get user to update lead coins
              const user = await storage.getUser(userId);
              if (!user) {
                console.error(`User ${userId} not found`);
                return res.status(400).json({ error: "User not found" });
              }

              // Update user's lead coins
              const updatedUser = await storage.updateUser(userId, {
                leadCoins: user.leadCoins + coinAmount
              });

              console.log(`Added ${coinAmount} LeadCoins to user ${userId} (new balance: ${user.leadCoins + coinAmount})`);
            } else {
              console.log(`No coin purchase record found for session ID ${session.id}`);
            }
          } else {
            // This is a regular subscription purchase
            const userSubscription = await storage.getUserSubscriptionByPaymentSession(session.id);

            if (userSubscription) {
              // Make sure it's not already activated
              if (userSubscription.status === "active" && userSubscription.paymentVerified) {
                console.log(`Subscription ${userSubscription.id} is already active, skipping update`);
                return res.status(200).json({ received: true, status: "already_active" });
              }

              // Update user subscription status
              await storage.updateUserSubscription(userSubscription.id, {
                status: "active",
                paymentVerified: true,
              });

              // Get the subscription to know how many coins to add
              const subscription = await storage.getSubscription(userSubscription.subscriptionId);
              if (subscription) {
                // Get user to update lead coins
                const user = await storage.getUser(userId);
                if (user) {
                  await storage.updateUser(userId, {
                    leadCoins: user.leadCoins + subscription.leadCoins
                  });
                  console.log(`Added ${subscription.leadCoins} LeadCoins to user ${userId}`);
                }
              }
            } else {
              console.log(`No subscription found with session ID ${session.id}`);
            }
          }
        } catch (error: any) {
          console.error("Error processing checkout session:", error);
          return res.status(500).json({ message: "Error processing checkout session" });
        }
      }

      // Return a 200 response to acknowledge receipt of the event
      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error(`Webhook error: ${error.message}`);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  // Create payment session endpoint
  app.post("/api/payment/create-session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID is required" });
      }

      // Get subscription details
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      // Get user details
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create payment session
      const session = await createSubscriptionPaymentSession(user, subscription);

      // Create a pending user subscription to track the payment
      await storage.createUserSubscription({
        userId: user.id,
        subscriptionId: subscription.id,
        status: "pending",
        paymentSessionId: session.sessionId,
        paymentVerified: false,
        initialLeadCoins: subscription.leadCoins,
        leadCoinsLeft: subscription.leadCoins,
      });

      // Return payment session details to the client
      return res.json(session);
    } catch (error: any) {
      console.error("Error creating payment session:", error);
      return res.status(500).json({ message: "Failed to create payment session" });
    }
  });

  // LeadCoin Management Routes
  app.get("/api/leadcoins/settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins can access this
      if (req.session.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the lead coin settings
      const settings = await storage.getLeadCoinSettings();

      // If no settings found, return default values
      if (!settings) {
        return res.json({
          id: 0,
          contactInfoCost: 5,
          detailedInfoCost: 10,
          fullAccessCost: 15,
          createdAt: new Date()
        });
      }

      return res.json(settings);
    } catch (error) {
      console.error("Error fetching lead coin settings:", error);
      return res.status(500).json({ message: "Failed to fetch lead coin settings" });
    }
  });

  app.put("/api/leadcoins/settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins can access this
      if (req.session.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { contactInfoCost, detailedInfoCost, fullAccessCost } = req.body;

      // Update the settings
      const updatedSettings = await storage.updateLeadCoinSettings({
        contactInfoCost: contactInfoCost !== undefined ? contactInfoCost : undefined,
        detailedInfoCost: detailedInfoCost !== undefined ? detailedInfoCost : undefined,
        fullAccessCost: fullAccessCost !== undefined ? fullAccessCost : undefined
      });

      return res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating lead coin settings:", error);
      return res.status(500).json({ message: "Failed to update lead coin settings" });
    }
  });

  app.get("/api/leadcoins/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins can access this
      if (req.session.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get some basic stats for lead coins usage
      // This would typically come from database queries

      // Calculate total coins in circulation
      const totalCoinsResult = await db.select({
        total: sql<number>`SUM(${users.leadCoins})::int`
      }).from(users);
      const totalCoins = totalCoinsResult[0]?.total || 0;
      // Calculate coins spent this month
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

      const coinsSpentResult = await db.select({
        total: sql<number>`SUM(${coinTransactions.amount})::int`
      })
        .from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.type, "spent"),
            sql`${coinTransactions.createdAt} >= ${startOfMonth.toISOString()}`
          )
        );
      const coinsSpentThisMonth = coinsSpentResult[0]?.total || 0;
      // Get leads viewed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const leadsViewedResult = await db.select({
        count: sql<number>`COUNT(*)::int`
      })
        .from(viewedLeads)
        .where(sql`${viewedLeads.viewedAt} >= ${today.toISOString()}`);
      const leadsViewedToday = leadsViewedResult[0]?.count || 0;
      // Get top 10 users by current LeadCoin balance
      const topUsers = await db.select({
        name: users.name,
        email: users.email,
        currentBalance: users.leadCoins,
        totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${coinTransactions.type} = 'spent' THEN ${coinTransactions.amount} ELSE 0 END), 0)::int`
      })
        .from(users)
        .leftJoin(coinTransactions, eq(users.id, coinTransactions.userId))
        .where(
          and(
            ne(users.role, "admin"),
            eq(users.status, "active"),
            eq(users.verified, true)
          )
        )
        .groupBy(users.id, users.name, users.email, users.leadCoins)
        .orderBy(sql`${users.leadCoins} DESC`)
        .limit(10);



      const stats = {
        totalCoins,
        coinsSpentThisMonth,
        leadsViewedToday,
        topUsers

      };

      return res.json(stats);
    } catch (error) {
      console.error("Error fetching lead coin stats:", error);
      return res.status(500).json({ message: "Failed to fetch lead coin statistics" });
    }
  });

  // PATCH subscription update endpoint
  app.patch("/api/subscriptions/:id", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      // Validate subscription data
      const validatedData = insertSubscriptionSchema.partial().parse(req.body);

      // Update the subscription
      const updatedSubscription = await storage.updateSubscription(id, validatedData);

      if (!updatedSubscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      console.log(`Updated subscription ${id}:`, updatedSubscription);
      res.json(updatedSubscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Create payment session specifically for LeadCoins purchase
  app.post("/api/payment/create-coins-session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { coinAmount, price, packageName } = req.body;

      if (!coinAmount || !price || !packageName) {
        return res.status(400).json({ message: "Missing required fields: coinAmount, price, packageName" });
      }

      const userId = req.session.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if we have Stripe secret key
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Payment system not configured. Please contact support." });
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      // Create Stripe checkout session for coins
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: user.email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${packageName} - ${coinAmount} LeadCoins`,
              description: `Purchase ${coinAmount} LeadCoins to unlock lead contact details`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        }],
        metadata: {
          userId: userId.toString(),
          type: 'leadcoins',
          coinAmount: coinAmount.toString(),
          packageName: packageName,
        },
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/user/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/user/subscriptions?canceled=true`,
      });

      console.log(`Created Stripe session for LeadCoins purchase: ${session.id} for user ${userId}`);

      return res.json({
        url: session.url,
        sessionId: session.id,
        success: true
      });

    } catch (error) {
      console.error('Error creating LeadCoins payment session:', error);
      return res.status(500).json({
        message: "Failed to create payment session",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.post("/api/users/:id/send-coins", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const adminId = req.session?.user?.id;
      const { amount, description } = req.body;
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
      // Check if user exists
      const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (targetUser.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      // Update user's lead coins
      await db.update(users)
        .set({ leadCoins: sql`${users.leadCoins} + ${amount}` })
        .where(eq(users.id, userId));
      // Record the transaction
      await db.insert(coinTransactions).values({
        userId: userId,
        adminId: adminId,
        amount: amount,
        type: "admin_topup",
        description: description || "Admin Top-up"
      });
       // Create notification for the user
       await db.insert(notifications).values({
        userId: userId,
        type: "coin_received",
        title: "Coins Received from Admin",
        message: `You have received ${amount} coins from an administrator. ${description || ""}`,
        metadata: {
          amount: amount,
          adminId: adminId,
          description: description || "Admin Top-up"
        }
      });
      // Get updated user data to check for low balance alerts
      const [updatedUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            // Check for low balance and create notifications if needed
            if (updatedUser) {
              const balance = updatedUser.leadCoins;
              const thresholds = [10, 5, 0];
              
              for (const threshold of thresholds) {
                if (balance === threshold) {
                  // Check if we already sent this notification recently
                  const existingNotification = await db
                    .select()
                    .from(notifications)
                    .where(
                      and(
                        eq(notifications.userId, userId),
                        eq(notifications.type, "low_balance")
                      )
                    )
                    .limit(1);
                  if (existingNotification.length === 0 || 
                      JSON.stringify(existingNotification[0].metadata).includes(`"threshold":${threshold}`) === false) {
                    const message = threshold === 0 
                      ? "Your LeadCoin balance has reached zero. Purchase more coins to continue viewing lead details."
                      : `Your LeadCoin balance is running low (${threshold} coins remaining). Consider purchasing more coins to continue viewing leads.`;
                    // Create low balance notification
                    await db.insert(notifications).values({
                      userId: userId,
                      type: "low_balance",
                      title: threshold === 0 ? "No Coins Remaining" : "Low Coin Balance Alert",
                      message: message,
                      metadata: { threshold, currentBalance: balance }
                    });
                    // Send email notification for critical thresholds
                    if (threshold <= 5) {
                      try {
                        await mailer.sendLowBalanceAlert(updatedUser.email, updatedUser.name, balance);
                      } catch (emailError) {
                        console.error("Failed to send low balance email:", emailError);
                      }
                    }
                  }
                  break;
                }
              }
            }
      res.json({
        message: "Coins sent successfully",
        amount: amount,
        recipient: targetUser[0].name
      });
    } catch (error: any) {
      console.error("Error sending coins:", error);
      res.status(500).json({ message: "Failed to send coins" });
    }
  });
  // SMTP Settings endpoints
  app.get("/api/smtp-settings", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const settings = await db.select().from(smtpSettings).where(eq(smtpSettings.active, true)).limit(1);
      res.json(settings[0] || null);
    } catch (error) {
      console.error("Error fetching SMTP settings:", error);
      res.status(500).json({ error: "Failed to fetch SMTP settings" });
    }
  });
  app.post("/api/smtp-settings", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const validatedData = insertSmtpSettingsSchema.parse(req.body);

      // Deactivate existing settings
      await db.update(smtpSettings).set({ active: false });

      // Create new settings
      const [newSettings] = await db.insert(smtpSettings).values(validatedData).returning();
      res.status(201).json(newSettings);
    } catch (error) {
      console.error("Error creating SMTP settings:", error);
      res.status(500).json({ error: "Failed to create SMTP settings" });
    }
  });
  app.patch("/api/smtp-settings/:id", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = insertSmtpSettingsSchema.partial().parse(req.body);

      const [updatedSettings] = await db
        .update(smtpSettings)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(smtpSettings.id, parseInt(id)))
        .returning();
      if (!updatedSettings) {
        return res.status(404).json({ error: "SMTP settings not found" });
      }
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating SMTP settings:", error);
      res.status(500).json({ error: "Failed to update SMTP settings" });
    }
  });
  app.post("/api/smtp-settings/test", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email address is required for testing" });
      }
      // Get current SMTP settings
      const settings = await db.select().from(smtpSettings).where(eq(smtpSettings.active, true)).limit(1);

      if (!settings[0]) {
        return res.status(400).json({ error: "No SMTP settings configured" });
      }
      // Test email sending with current settings

      const testResult = await mailer.testSmtpSettings(settings[0], email);

      if (testResult.success) {
        res.json({ success: true, message: "Test email sent successfully" });
      } else {
        res.status(400).json({ success: false, error: testResult.error });
      }
    } catch (error) {
      console.error("Error testing SMTP settings:", error);
      res.status(500).json({ error: "Failed to test SMTP settings" });
    }
  });
  app.get("/api/leadcoin-packages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const packages = await db.select().from(leadCoinPackages).orderBy(leadCoinPackages.leadCoins);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching LeadCoin packages:", error);
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });
  app.post("/api/leadcoin-packages", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const validatedData = insertLeadCoinPackageSchema.parse(req.body);
      const [newPackage] = await db.insert(leadCoinPackages).values(validatedData).returning();
      res.status(201).json(newPackage);
    } catch (error) {
      console.error("Error creating LeadCoin package:", error);
      res.status(500).json({ error: "Failed to create package" });
    }
  });
  app.patch("/api/leadcoin-packages/:id", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = insertLeadCoinPackageSchema.partial().parse(req.body);

      const [updatedPackage] = await db
        .update(leadCoinPackages)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(leadCoinPackages.id, parseInt(id)))
        .returning();
      if (!updatedPackage) {
        return res.status(404).json({ error: "Package not found" });
      }
      res.json(updatedPackage);
    } catch (error) {
      console.error("Error updating LeadCoin package:", error);
      res.status(500).json({ error: "Failed to update package" });
    }
  });
  app.delete("/api/leadcoin-packages/:id", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [deletedPackage] = await db
        .delete(leadCoinPackages)
        .where(eq(leadCoinPackages.id, parseInt(id)))
        .returning();
      if (!deletedPackage) {
        return res.status(404).json({ error: "Package not found" });
      }
      res.json({ message: "Package deleted successfully" });
    } catch (error) {
      console.error("Error deleting LeadCoin package:", error);
      res.status(500).json({ error: "Failed to delete package" });
    }
  });
  // Lead View Reports endpoints
  app.get("/api/lead-views/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const userLeadViews = await db
        .select({
          id: leadViews.id,
          leadId: leadViews.leadId,
          coinsSpent: leadViews.coinsSpent,
          viewType: leadViews.viewType,
          viewedAt: leadViews.viewedAt,
          leadTitle: leads.title,
          leadLocation: leads.location,
        })
        .from(leadViews)
        .innerJoin(leads, eq(leadViews.leadId, leads.id))
        .where(eq(leadViews.userId, user.id))
        .orderBy(desc(leadViews.viewedAt));
      res.json(userLeadViews);
    } catch (error: any) {
      console.error("Error fetching user lead views:", error);
      res.status(500).json({ message: "Failed to fetch lead view history", error: error.message });
    }
  });
  app.get("/api/lead-views/admin", isAuthenticated, hasRole(["admin", "subadmin"]), async (req: Request, res: Response) => {
    try {
      const adminLeadViews = await db
        .select({
          id: leadViews.id,
          userId: leadViews.userId,
          leadId: leadViews.leadId,
          coinsSpent: leadViews.coinsSpent,
          viewType: leadViews.viewType,
          viewedAt: leadViews.viewedAt,
          userName: users.name,
          userEmail: users.email,
          leadTitle: leads.title,
          leadLocation: leads.location,
        })
        .from(leadViews)
        .innerJoin(users, eq(leadViews.userId, users.id))
        .innerJoin(leads, eq(leadViews.leadId, leads.id))
        .orderBy(desc(leadViews.viewedAt));
      res.json(adminLeadViews);
    } catch (error: any) {
      console.error("Error fetching admin lead views:", error);
      res.status(500).json({ message: "Failed to fetch lead view reports", error: error.message });
    }
  });
  app.post("/api/leads/:id/view", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const leadId = parseInt(req.params.id);
      let viewType = req.body?.viewType || "contact_info";
      if (!["contact_info", "detailed_info", "full_access"].includes(viewType)) {
        viewType = "contact_info";
      }
      // Get lead coin cost settings
      const [settings] = await db.select().from(leadCoinSettings).limit(1);
      if (!settings) {
        return res.status(500).json({ message: "Lead coin settings not configured" });
      }

      // Determine cost based on view type
      let coinsRequired = 0;
      switch (viewType) {
        case "contact_info":
          coinsRequired = settings.contactInfoCost || 5;
          break;
        case "detailed_info":
          coinsRequired = settings.detailedInfoCost || 10;
          break;
        case "full_access":
          coinsRequired = settings.fullAccessCost || 15;
          break;
      }

      // Get current user
      const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check balance
      if (currentUser.leadCoins < coinsRequired) {
        return res.status(400).json({ message: "Insufficient LeadCoins" });
      }

      // Deduct coins
      const newBalance = currentUser.leadCoins - coinsRequired;

      // Send low balance email if needed (non-blocking)
      if (newBalance <= 20) {
        try {
          await mailer.sendLowBalanceAlert(
            currentUser.email,
            currentUser.name || currentUser.email,
            newBalance
          );
        } catch (emailError: any) {
          console.error("Low balance email failed:", emailError.message || emailError);
          // Don't block the flow
        }
      }
      if (req.query.check) {
        // Update user balance
        await db
          .update(users)
          .set({ leadCoins: newBalance })
          .where(eq(users.id, user.id));

        // Record view
        let insrerRows = await db.insert(leadViews).values({
          userId: user.id,
          leadId: leadId,
          coinsSpent: coinsRequired,
          viewType: viewType,
          viewedAt: new Date(),
        });

        // Record coin transaction
        await db.insert(coinTransactions).values({
          userId: user.id,
          amount: -coinsRequired,
          type: "spent",
          description: `Viewed lead: ${viewType}`,
          createdAt: new Date(),
        });
      }


      // Respond success
      res.json({
        success: true,
        coinsSpent: coinsRequired,
        remainingCoins: newBalance,
      });

    } catch (error: any) {
      console.error("Error recording lead view:", error);
      res.status(500).json({
        message: "Failed to record lead view",
        error: error.message,
      });
    }
  });
  
  
  // Notification endpoints
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unread === 'true';
      let whereCondition = eq(notifications.userId, req.session.user.id);
      
      if (unreadOnly) {
        whereCondition = and(
          eq(notifications.userId, req.session.user.id),
          eq(notifications.read, false)
        );
      }
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(whereCondition)
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      return res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const notificationId = parseInt(req.params.id);
      
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, req.session.user.id)
          )
        );
      return res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  app.patch("/api/notifications/read-all", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, req.session.user.id),
            eq(notifications.read, false)
          )
        );
      return res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });



  // Get all coupons (admin only)
  app.get("/api/coupons", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const couponsData = await db
        .select({
          id: coupons.id,
          code: coupons.code,
          maxUses: coupons.maxUses,
          currentUses: coupons.currentUses,
          coinAmount: coupons.coinAmount,
          active: coupons.active,
          createdAt: coupons.createdAt,
          createdByName: users.name,
        })
        .from(coupons)
        .leftJoin(users, eq(coupons.createdById, users.id))
        .orderBy(desc(coupons.createdAt));
      res.json(couponsData);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });
  // Create a new coupon (admin only)
  app.post("/api/coupons", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).user!.id;
      const { maxUses, coinAmount, active } = req.body;
      // Validate input
      if (!maxUses || !coinAmount || typeof maxUses !== 'number' || typeof coinAmount !== 'number') {
        return res.status(400).json({
          message: "Invalid input - maxUses and coinAmount are required and must be numbers",
        });
      }
      if (maxUses < 1 || coinAmount < 1) {
        return res.status(400).json({
          message: "maxUses and coinAmount must be positive numbers",
        });
      }
   
      // Generate unique coupon code in format XXXX-XXXX-XXXX
      const generateCouponCode = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const segments = [];
        for (let i = 0; i < 3; i++) {
          let segment = '';
          for (let j = 0; j < 4; j++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          segments.push(segment);
        }
        return segments.join('-');
      };
      let couponCode: string;
      let attempts = 0;
      const maxAttempts = 10;
      // Ensure unique code
      do {
        couponCode = generateCouponCode();
        const existing = await db
          .select()
          .from(coupons)
          .where(eq(coupons.code, couponCode))
          .limit(1);
        
        if (existing.length === 0) break;
        attempts++;
      } while (attempts < maxAttempts);
      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: "Failed to generate unique coupon code" });
      }
      const [newCoupon] = await db
        .insert(coupons)
        .values({
          code: couponCode,
          maxUses,
          coinAmount,
          active,
          createdById: userId,
        })
        .returning();
      res.status(201).json({
        message: "Coupon created successfully",
        coupon: newCoupon,
      });
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });
  // Update coupon status (admin only)
  app.patch("/api/coupons/:id", isAuthenticated, hasRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const couponId = parseInt(req.params.id);
      const { active } = req.body;
      if (typeof active !== 'boolean') {
        return res.status(400).json({ message: "Active status must be a boolean" });
      }
      const [updatedCoupon] = await db
        .update(coupons)
        .set({ active, updatedAt: new Date() })
        .where(eq(coupons.id, couponId))
        .returning();
      if (!updatedCoupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json({
        message: "Coupon updated successfully",
        coupon: updatedCoupon,
      });
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ message: "Failed to update coupon" });
    }
  });
  // Claim a coupon (user)
  app.post("/api/coupons/claim", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).user!.id;
      const { code } = req.body;

      // Validate input
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return res.status(400).json({
          message: "Coupon code is required",
        });
      }

      // Get coupon details
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, code))
        .limit(1);

      if (!coupon) {
        return res.status(404).json({ message: "Invalid coupon code" });
      }

      if (!coupon.active) {
        return res.status(400).json({ message: "This coupon is no longer active" });
      }

      if (coupon.currentUses >= coupon.maxUses) {
        return res.status(400).json({ message: "This coupon has reached its maximum usage limit" });
      }

      // Check if user has already claimed this coupon
      const existingClaim = await db
        .select()
        .from(couponClaims)
        .where(and(
          eq(couponClaims.couponId, coupon.id),
          eq(couponClaims.userId, userId)
        ))
        .limit(1);

      if (existingClaim.length > 0) {
        return res.status(400).json({ message: "You have already claimed this coupon" });
      }

      // Update user's lead coins
      const [updatedUser] = await db
        .update(users)
        .set({ 
          leadCoins: sql`lead_coins + ${coupon.coinAmount}` 
        })
        .where(eq(users.id, userId))
        .returning();

      // Record the coupon claim
      await db.insert(couponClaims).values({
        couponId: coupon.id,
        userId: userId,
        coinsReceived: coupon.coinAmount,
      });

      // Update coupon usage count
      await db
        .update(coupons)
        .set({ 
          currentUses: sql`current_uses + 1`,
          updatedAt: new Date()
        })
        .where(eq(coupons.id, coupon.id));

      // Create coin transaction record
      await db.insert(coinTransactions).values({
        userId: userId,
        type: "admin_topup" as any,
        amount: coupon.coinAmount,
        description: `Coupon claimed: ${code}`,
      });

      // Create notification
      await db.insert(notifications).values({
        userId: userId,
        type: "coin_received",
        title: "Coupon Claimed Successfully",
        message: `You received ${coupon.coinAmount} LeadCoins from coupon ${code}`,
        metadata: { couponCode: code, coinsReceived: coupon.coinAmount },
      });

      res.json({
        message: "Coupon claimed successfully",
        coinsReceived: coupon.coinAmount,
        newBalance: updatedUser.leadCoins,
      });
    } catch (error) {
      console.error("Error claiming coupon:", error);
      res.status(500).json({ message: "Failed to claim coupon" });
    }
  });

  app.post(
    "/api/admin/notify-inactive-users",
    isAuthenticated,
    hasRole(["admin"]),
    async (req: Request, res: Response) => {
      try {
        const { days } = req.body;
  
        if (!days || days < 1) {
          return res.status(400).json({ message: "Valid number of days is required" });
        }
  
        // Get inactive users from database
        const inactiveUsers = await storage.getUsersNotLoggedInDays(days);
  
        if (inactiveUsers.length === 0) {
          return res.json({
            success: true,
            message: `No inactive users found for ${days} days.`,
            notificationsSent: 0
          });
        }
  
        let successCount = 0;
        let errorCount = 0;
        let arr=[]
        // Send notifications to each inactive user
        for (const user of inactiveUsers) {
          try {
            arr.push(user.email)
           await mailer.sendInactivityNotification(user.email, user.name);
            successCount++;
            console.log(`Notification sent to ${user.email}`);
          } catch (error) {
            console.error(`Failed to send notification to ${user.email}:`, error);
            errorCount++;
          }
        }

            // mailer.sendInactivityNotification(arr,"User");

  
        return res.json({
          success: true,
          message: `Notifications sent to ${successCount} users${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
          notificationsSent: successCount,
          errors: errorCount
        });
      } catch (error) {
        console.error("Error sending inactive user notifications:", error);
        return res.status(500).json({ message: "Failed to send notifications" });
      }
    }
  );
  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}

