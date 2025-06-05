import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  json,
  foreignKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "subadmin", "user"] })
    .notNull()
    .default("user"),
  status: text("status", { enum: ["active", "inactive", "pending"] })
    .notNull()
    .default("pending"),
  verified: boolean("verified").notNull().default(false),
  verification_code: text("verification_code").default(""),
  resetToken: text("reset_token").default(""),
  profileImage: text("profile_image").default(""),
  permissions: json("permissions").$type<string[]>().default([]),
  leadCoins: integer("lead_coins").notNull().default(20),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Lead Categories table
export const leadCategories = pgTable("lead_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Leads table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  // Step 1: Basic Information
  title: text("title").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id").references(() => leadCategories.id),
  categoryName: text("category_name"), // Store custom category name
  // Step 2: Skills
  skills: json("skills").$type<string[]>().default([]),
  // Step 3: Work Type & Duration
  workType: text("work_type", { enum: ["part_time", "full_time"] })
    .notNull()
    .default("full_time"),
  duration: text("duration").notNull().default(""),

  // Step 4: Contact Information
  location: text("location").notNull(),
  price: integer("price").notNull(),
  totalMembers: integer("total_members").notNull().default(1),
  images: json("images").$type<string[]>().default([]),
  email: text("email").notNull(),
  contactNumber: text("contact_number").notNull(),

  // Other fields
  creatorId: integer("creator_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  durationDays: integer("duration_days").notNull(), // in days
  leadCoins: integer("lead_coins").notNull(),
  features: json("features").$type<string[]>().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  subscription_type: boolean("subscription_type").notNull().default(true),
});

// User Subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  subscriptionId: integer("subscription_id")
    .notNull()
    .references(() => subscriptions.id),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  status: text("status", {
    enum: ["active", "pending", "expired", "cancelled"],
  }).notNull(),
  leadCoinsLeft: integer("lead_coins_left").notNull(),
  // initialLeadCoins: integer("initial_lead_coins").notNull().default(0),
  paymentSessionId: text("payment_session_id"),
  paymentVerified: boolean("payment_verified").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  initial_lead_coins: boolean("initial_lead_coins"),
});

// Support Tickets table
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status", {
    enum: ["open", "in_progress", "resolved", "closed"],
  })
    .notNull()
    .default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Support Ticket Replies table
export const supportTicketReplies = pgTable("support_ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => supportTickets.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  message: text("message").notNull(),
  isFromStaff: boolean("is_from_staff").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const smtpSettings = pgTable("smtp_settings", {
  id: serial("id").primaryKey(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  secure: boolean("secure").notNull().default(true),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Viewed Leads table
export const viewedLeads = pgTable("viewed_leads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

// Lead Coin Settings table
export const leadCoinSettings = pgTable("lead_coin_settings", {
  id: serial("id").primaryKey(),
  contactInfoCost: integer("contact_info_cost").notNull().default(5),
  detailedInfoCost: integer("detailed_info_cost").notNull().default(10),
  fullAccessCost: integer("full_access_cost").notNull().default(15),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Table for storing coin purchase transactions
export const coinPurchases = pgTable("coin_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { 
    onDelete: "cascade" 
  }),
  subscriptionId: integer("subscription_id").notNull().references(() => leadCoinPackages.id, { 
    onDelete: "set null" 
  }),
  paymentSessionId: text("payment_session_id"),
  status: text("status", { enum: ["pending", "completed", "failed", "cancelled"] }).notNull().default("pending"),
  leadCoins: integer("lead_coins").notNull(),
  amount: integer("amount").notNull(),
  purchaseDate: timestamp("purchase_date").notNull().defaultNow(),
});
// Table for storing LeadCoin packages (Additional LeadCoins)
export const leadCoinPackages = pgTable("leadcoin_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  leadCoins: integer("lead_coins").notNull(),
  price: integer("price").notNull(), // Price in cents
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Table for storing coin transactions history
export const coinTransactions = pgTable("coin_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { 
    onDelete: "cascade" 
  }),
  adminId: integer("admin_id").references(() => users.id),
  amount: integer("amount").notNull(),
  type: text("type", { enum: ["purchase", "admin_topup", "spent", "refund"] }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leadViews = pgTable("lead_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  coinsSpent: integer("coins_spent").notNull(),
  viewType: text("view_type", { enum: ["contact_info", "detailed_info", "full_access"] }).notNull(),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

// Table for user notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type", { enum: ["coin_received", "low_balance", "subscription_update", "system"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


// Table for coupons
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  maxUses: integer("max_uses").notNull(),
  currentUses: integer("current_uses").notNull().default(0),
  coinAmount: integer("coin_amount").notNull(),
  active: boolean("active").notNull().default(true),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
// Table for coupon claims/redemptions
export const couponClaims = pgTable("coupon_claims", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").references(() => coupons.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  coinsReceived: integer("coins_received").notNull(),
  claimedAt: timestamp("claimed_at").notNull().defaultNow(),
});

// Schema for inserting a user
export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    verified: true,
    verification_code: true,
    resetToken: true,
    permissions: true,
    leadCoins: true,
    createdAt: true,
  })
  .extend({
    email: z.string().email({ message: "Please enter a valid email address" }),
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z
      .string()
      .min(6, { message: "Confirm password must be at least 6 characters" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Schema for verifying a user
export const verifyUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  code: z
    .string()
    .min(4, { message: "Verification code must be at least 4 characters" })
    .max(4, { message: "Verification code must be at most 4 characters" }),
});

// Schema for logging in
export const loginUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  rememberMe: z.boolean().optional().default(false),
});

// Schema for updating a user profile
export const updateUserProfileSchema = createInsertSchema(users)
  .pick({
    name: true,
    profileImage: true,
  })
  .extend({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  });


// Schema for changing password
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(6, { message: "Current password must be at least 6 characters" }),
    newPassword: z
      .string()
      .min(6, { message: "New password must be at least 6 characters" }),
    confirmPassword: z
      .string()
      .min(6, { message: "Confirm password must be at least 6 characters" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Schema for inserting a lead
export const insertLeadSchema = createInsertSchema(leads)
  .omit({
    id: true,
    creatorId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Step 1: Basic Information
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    categoryId: z.number().optional(),

    // Step 2: Skills
    skills: z.array(z.string()).default([]),

    // Step 3: Work Type & Duration
    workType: z.enum(["part_time", "full_time"], {
      invalid_type_error: "Please select work type",
    }),
    duration: z.string().min(1, { message: "Please specify the duration" }),

    // Step 4: Contact Information
    location: z.string().min(1, { message: "Location is required" }),
    price: z.number().min(0, { message: "Price must be a positive number" }),
    totalMembers: z
      .number()
      .min(1, { message: "Total members must be at least 1" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    contactNumber: z.string().regex(/^\d{10}$/, {
      message: "Contact number must be exactly 10 digits",
    }),
    images: z.array(z.string()).optional().default([]),
  });

// Schema for inserting a subscription
export const insertSubscriptionSchema = createInsertSchema(subscriptions)
  .omit({
    id: true,
    active: true,
    createdAt: true,
  })
  .extend({
    name: z.string().min(1, { message: "Plan name is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    price: z.number().min(0, { message: "Price must be a positive number" }),
    durationDays: z
      .number()
      .min(1, { message: "Duration must be at least 1 day" }),
    leadCoins: z.number().min(1, { message: "Lead coins must be at least 1" }),
  });

// Schema for inserting a support ticket
export const insertSupportTicketSchema = createInsertSchema(supportTickets)
  .omit({
    id: true,
    userId: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    subject: z.string().min(1, { message: "Subject is required" }),
    message: z.string().min(1, { message: "Message is required" }),
  });

// Schema for inserting a support ticket reply
export const insertSupportTicketReplySchema = createInsertSchema(
  supportTicketReplies,
)
  .omit({
    id: true,
    ticketId: true,
    userId: true,
    isFromStaff: true,
    createdAt: true,
  })
  .extend({
    message: z.string().min(1, { message: "Reply message is required" }),
  });

// Schema for updating lead coin settings
export const updateLeadCoinSettingsSchema = createInsertSchema(leadCoinSettings)
  .pick({ contactInfoCost: true, detailedInfoCost: true, fullAccessCost: true })
  .extend({
    contactInfoCost: z
      .number()
      .min(1, { message: "Contact info cost must be at least 1 coin" }),
    detailedInfoCost: z
      .number()
      .min(1, { message: "Detailed info cost must be at least 1 coin" }),
    fullAccessCost: z
      .number()
      .min(1, { message: "Full access cost must be at least 1 coin" }),
  });

// Schema for inserting and updating a lead category
export const insertLeadCategorySchema = createInsertSchema(leadCategories)
  .omit({
    id: true,
    active: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    name: z.string().min(1, { message: "Category name is required" }),
    description: z.string().optional(),
  });

export const updateLeadCategorySchema = insertLeadCategorySchema.extend({
  active: z.boolean().optional(),
});

// Schema for creating a subadmin
export const createSubadminSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  permissions: z
    .array(z.string())
    .min(1, { message: "At least one permission must be selected" }),
});

export const sendCoinsSchema = z.object({
  amount: z.number().min(1, { message: "Amount must be at least 1 coin" }),
  description: z.string().min(1, { message: "Description is required" }).default("Admin Top-up"),
});
// Schema for creating a coupon
export const insertCouponSchema = createInsertSchema(coupons)
  .omit({
    id: true,
    code: true,
    currentUses: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    maxUses: z.number().min(1, { message: "Max uses must be at least 1" }),
    coinAmount: z.number().min(1, { message: "Coin amount must be at least 1" }),
    active: z.boolean().default(true),
  });
// Schema for claiming a coupon
export const claimCouponSchema = z.object({
  code: z.string().min(1, { message: "Coupon code is required" }).transform(val => val.toUpperCase()),
});


// Types for database operations
export type InsertUser = z.infer<typeof insertUserSchema>;
export type VerifyUser = z.infer<typeof verifyUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type InsertSupportTicketReply = z.infer<
  typeof insertSupportTicketReplySchema
>;
export type UpdateLeadCoinSettings = z.infer<
  typeof updateLeadCoinSettingsSchema
>;
export type SendCoins = z.infer<typeof sendCoinsSchema>;
export type CreateSubadmin = z.infer<typeof createSubadminSchema>;
export type InsertLeadCategory = z.infer<typeof insertLeadCategorySchema>;
export type UpdateLeadCategory = z.infer<typeof updateLeadCategorySchema>;
// / Lead view types
export type LeadView = typeof leadViews.$inferSelect;
export type InsertLeadView = typeof leadViews.$inferInsert;

// Notification types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
// Schema for inserting notifications
export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({
    id: true,
    read: true,
    createdAt: true,
  })
  .extend({
    title: z.string().min(1, { message: "Title is required" }),
    message: z.string().min(1, { message: "Message is required" }),
  });
  // Types for coupons
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type ClaimCoupon = z.infer<typeof claimCouponSchema>;
export type CouponClaim = typeof couponClaims.$inferSelect;

// Define relations

export const usersRelations = relations(users, ({ many }) => ({
  leads: many(leads),
  userSubscriptions: many(userSubscriptions),
  supportTickets: many(supportTickets),
  supportTicketReplies: many(supportTicketReplies),
  // viewedLeads: many(viewedLeads),
  leadViews: many(leadViews),
  notifications: many(notifications),
  createdCoupons: many(coupons),
  couponClaims: many(couponClaims),
}));

export const leadCategoriesRelations = relations(
  leadCategories,
  ({ many }) => ({
    leads: many(leads),
  }),
);

export const leadsRelations = relations(leads, ({ one, many }) => ({
  creator: one(users, {
    fields: [leads.creatorId],
    references: [users.id],
  }),
  category: one(leadCategories, {
    fields: [leads.categoryId],
    references: [leadCategories.id],
  }),
  viewedLeads: many(viewedLeads),
}));
export const leadViewsRelations = relations(leadViews, ({ one }) => ({
  user: one(users, {
    fields: [leadViews.userId],
    references: [users.id],
  }),
  lead: one(leads, {
    fields: [leadViews.leadId],
    references: [leads.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ many }) => ({
  userSubscriptions: many(userSubscriptions),
}));

export const userSubscriptionsRelations = relations(
  userSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [userSubscriptions.userId],
      references: [users.id],
    }),
    subscription: one(subscriptions, {
      fields: [userSubscriptions.subscriptionId],
      references: [subscriptions.id],
    }),
  }),
);

export const supportTicketsRelations = relations(
  supportTickets,
  ({ one, many }) => ({
    user: one(users, {
      fields: [supportTickets.userId],
      references: [users.id],
    }),
    replies: many(supportTicketReplies),
  }),
);

export const supportTicketRepliesRelations = relations(
  supportTicketReplies,
  ({ one }) => ({
    user: one(users, {
      fields: [supportTicketReplies.userId],
      references: [users.id],
    }),
    ticket: one(supportTickets, {
      fields: [supportTicketReplies.ticketId],
      references: [supportTickets.id],
    }),
  }),
);

export const viewedLeadsRelations = relations(viewedLeads, ({ one }) => ({
  user: one(users, {
    fields: [viewedLeads.userId],
    references: [users.id],
  }),
  lead: one(leads, {
    fields: [viewedLeads.leadId],
    references: [leads.id],
  }),
}));

export const insertSmtpSettingsSchema = createInsertSchema(smtpSettings)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    host: z.string().min(1, { message: "SMTP host is required" }),
    port: z.number().min(1).max(65535, { message: "Port must be between 1 and 65535" }),
    username: z.string().min(1, { message: "Username is required" }),
    password: z.string().min(1, { message: "Password is required" }),
    fromEmail: z.string().email({ message: "Valid from email is required" }),
    fromName: z.string().min(1, { message: "From name is required" }),
  });
  export const couponsRelations = relations(coupons, ({ one, many }) => ({
    createdBy: one(users, {
      fields: [coupons.createdById],
      references: [users.id],
    }),
    claims: many(couponClaims),
  }));
  export const couponClaimsRelations = relations(couponClaims, ({ one }) => ({
    coupon: one(coupons, {
      fields: [couponClaims.couponId],
      references: [coupons.id],
    }),
    user: one(users, {
      fields: [couponClaims.userId],
      references: [users.id],
    }),
  }));
// Types for database selects
export type User = typeof users.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadCategory = typeof leadCategories.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type CoinTransaction = typeof coinTransactions.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type LeadCoinPackage = typeof leadCoinPackages.$inferSelect;
export type SupportTicketReply = typeof supportTicketReplies.$inferSelect;
export type ViewedLead = typeof viewedLeads.$inferSelect;
export type LeadCoinSetting = typeof leadCoinSettings.$inferSelect;
export type CoinPurchase = typeof coinPurchases.$inferSelect;
export type InsertCoinPurchase = typeof coinPurchases.$inferInsert;
export type InsertSmtpSettings = z.infer<typeof insertSmtpSettingsSchema>;
export type SmtpSettings = typeof smtpSettings.$inferSelect;

export const insertLeadCoinPackageSchema = createInsertSchema(leadCoinPackages)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });
export type InsertLeadCoinPackage = z.infer<typeof insertLeadCoinPackageSchema>;
