import {
  users,
  leads,
  leadCategories,
  subscriptions,
  leadCoinPackages,
  supportTickets,
  supportTicketReplies,
  userSubscriptions,
  viewedLeads,
  leadCoinSettings,
  coinPurchases,
  coinTransactions,
  leadViews,
  type User,
  type InsertUser,
  type Lead,
  type InsertLead,
  type LeadCategory,
  type InsertLeadCategory,
  type Subscription,
  type InsertSubscription,
  type SupportTicket,
  type InsertSupportTicket,
  type SupportTicketReply,
  type InsertSupportTicketReply,
  type UserSubscription,
  type ViewedLead,
  type LeadCoinSetting,
  type CoinPurchase,
  type InsertCoinPurchase,
  type LeadCoinPackage
} from "@shared/schema";
import {
  eq,
  and,
  desc,
  gt,
  lte,
  sql,
  or,
  isNull,
  isNotNull,
  inArray,
  ne,
} from "drizzle-orm";
import { db } from "./db";
import * as bcrypt from "bcrypt";

// modify the interface with any CRUD methods you might need
export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  
  // Coin purchase methods
  createCoinPurchase(purchase: InsertCoinPurchase): Promise<CoinPurchase>;
  getCoinPurchaseBySessionId(sessionId: string): Promise<CoinPurchase | undefined>;
  updateCoinPurchaseStatus(id: number, status: string): Promise<CoinPurchase | undefined>;
  updateUserProfile(id: number, userData: Partial<User>): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<void>;
  updateUserStatus(id: number, status: string): Promise<void>;
  verifyUser(id: number): Promise<void>;
  updateUserVerificationCode(id: number, code: string): Promise<void>;
  updateUserResetToken(id: number, token: string): Promise<void>;
  updateUserLastLogin(id: number): Promise<void>;
  verifyPassword(id: number, password: string): Promise<boolean>;
  getUsersNotLoggedInDays(days: number): Promise<User[]>;
  getLatestLead(): Promise<Lead | undefined>;
  getAllUsers(
    page?: number,
    limit?: number,
  ): Promise<{ users: User[]; total: number }>;
  getAllUsersNoPagination(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;

  // Subadmin related methods
  getSubadmins(searchTerm?: string): Promise<User[]>;
  createSubadmin(data: any): Promise<User>;
  updateSubadminPermissions(id: number, permissions: string[]): Promise<void>;

  // Lead Category related methods
  getLeadCategory(id: number): Promise<LeadCategory | undefined>;
  getCategoryByName(name: string): Promise<LeadCategory | undefined>;
  getAllLeadCategories(): Promise<LeadCategory[]>;
  getActiveLeadCategories(): Promise<LeadCategory[]>;
  getUsedLeadCategories(): Promise<LeadCategory[]>;
  createLeadCategory(category: InsertLeadCategory): Promise<LeadCategory>;
  updateLeadCategory(
    id: number,
    categoryData: Partial<LeadCategory>,
  ): Promise<LeadCategory>;
  deleteLeadCategory(id: number): Promise<void>;

  // Lead related methods
  getLead(id: number): Promise<Lead | undefined>;
  getAllLeads(): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, leadData: Partial<Lead>): Promise<Lead>;
  deleteLead(id: number): Promise<void>;

  // Subscription related methods
  getSubscription(id: number): Promise<Subscription | undefined>;
  getAllSubscriptions(): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(
    id: number,
    subscriptionData: Partial<Subscription>,
  ): Promise<Subscription>;
  deleteSubscription(id: number): Promise<void>;

  // User subscription related methods
  getUserSubscription(userId: number): Promise<UserSubscription | undefined>;
  getUserActiveSubscription(
    userId: number,
  ): Promise<UserSubscription | undefined>;
  getUserSubscriptionHistory(userId: number): Promise<UserSubscription[]>;
  getUserSubscriptionByPaymentSession(
    sessionId: string,
  ): Promise<UserSubscription | undefined>;
  createUserSubscription(userSubscription: any): Promise<UserSubscription>;
  updateUserSubscription(
    id: number,
    data: Partial<UserSubscription>,
  ): Promise<UserSubscription>;
  updateUserLeadCoins(userId: number, coins: number): Promise<void>;

  // Support ticket related methods
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  getAllSupportTickets(): Promise<SupportTicket[]>;
  getUserSupportTickets(userId: number): Promise<SupportTicket[]>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicketStatus(id: number, status: string): Promise<void>;

  // Support ticket reply related methods
  getSupportTicketReplies(ticketId: number): Promise<SupportTicketReply[]>;
  createSupportTicketReply(
    reply: InsertSupportTicketReply,
  ): Promise<SupportTicketReply>;

  // Viewed lead related methods
  getViewedLead(
    userId: number,
    leadId: number,
  ): Promise<ViewedLead | undefined>;
  createViewedLead(userId: number, leadId: number): Promise<ViewedLead>;

  // Lead coin settings related methods
  getLeadCoinSettings(): Promise<LeadCoinSetting | undefined>;
  updateLeadCoinSettings(
    data: Partial<LeadCoinSetting>,
  ): Promise<LeadCoinSetting>;

  // Dashboard related methods
  getAdminDashboardData(): Promise<any>;
  getSubadminDashboardData(): Promise<any>;
  getUserDashboardData(userId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Coin purchase methods
  async createCoinPurchase(purchase: InsertCoinPurchase): Promise<CoinPurchase> {
    try {
      const [created] = await db.insert(coinPurchases).values(purchase).returning();
      console.log("Created coin purchase:", created);
      return created;
    } catch (error) {
      console.error("Error creating coin purchase:", error);
      throw error;
    }
  }
  
  async getCoinPurchaseBySessionId(sessionId: string): Promise<CoinPurchase | undefined> {
    try {
      const result = await db.select().from(coinPurchases).where(eq(coinPurchases.paymentSessionId, sessionId));
      return result[0];
    } catch (error) {
      console.error("Error getting coin purchase by session ID:", error);
      throw error;
    }
  }
  
  async updateCoinPurchaseStatus(id: number, status: string): Promise<CoinPurchase | undefined> {
    try {
      const [updated] = await db
        .update(coinPurchases)
        .set({ status })
        .where(eq(coinPurchases.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error("Error updating coin purchase status:", error);
      throw error;
    }
  }
  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const allUsers = await db.select().from(users);
    return allUsers.find((user) => user.email.split("@")[0] === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const lowerEmail = email.toLowerCase();
    const allUsers = await db.select().from(users);
    return allUsers.find((user) => user.email.toLowerCase() === lowerEmail);
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Hash the password before storing it
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    // Create the base values object with required fields from userData
    const values = {
      email: userData.email,
      name: userData.name,
      password: hashedPassword, // Store the hashed password, not plain text
      role: userData.role || "user",
      status: userData.status || "pending",
      verified: false,
      verification_code: userData.verificationCode || "",  
      resetToken: "",
      profileImage: userData.profileImage || "",
      leadCoins: userData.leadCoins || 20,
      permissions: [],
    };

    // Log the values for debugging
    console.log("Creating user with values:", {
      email: values.email,
      verification_code: values.verification_code,
    });

    // Insert the user and return the result
    const [user] = await db
      .insert(users)
      .values(values)
      .returning();
    
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async updateUserProfile(id: number, userData: Partial<User>): Promise<User> {
    // Build the update object dynamically
    const updateData: any = {};
    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.profileImage !== undefined) updateData.profileImage = userData.profileImage;
    if (userData.email !== undefined) updateData.email = userData.email;
    
    // Only proceed if there's something to update
    if (Object.keys(updateData).length === 0) {
      throw new Error("No valid fields provided for update");
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    // Hash the password using the same method as registration and login
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log(`Updating password for user ${id} - new hash generated`);
    
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (result.length === 0) {
      throw new Error("User not found");
    }
    
    console.log(`Password successfully updated in database for user ${id}`);
  }

  async updateUserStatus(id: number, status: string): Promise<void> {
    if (status !== "active" && status !== "inactive" && status !== "pending") {
      throw new Error("Invalid status");
    }

    const result = await db
      .update(users)
      .set({ status: status as any })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (result.length === 0) {
      throw new Error("User not found");
    }
  }

  async verifyUser(id: number): Promise<void> {
    const result = await db
      .update(users)
      .set({
        verified: true,
        status: "active", // Also update status to active when verified
        verification_code: "", // Match the field name from schema.ts
      })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (result.length === 0) {
      throw new Error("User not found");
    }

    console.log("User verified and status updated to active:", result);
  }

  async updateUserVerificationCode(id: number, code: string): Promise<void> {
    const result = await db
      .update(users)
      .set({ verification_code: code }) // Match the field name from schema.ts
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (result.length === 0) {
      throw new Error("User not found");
    }
  }

  async updateUserResetToken(id: number, token: string | null): Promise<void> {
    const result = await db
      .update(users)
      .set({ resetToken: token })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (result.length === 0) {
      throw new Error("User not found");
    }
    
    console.log(`Updated reset token for user ID: ${id}`);
  }

  async updateUserLastLogin(id: number): Promise<void> {
    try {
      const result = await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, id))
        .returning({ id: users.id });

      if (result.length === 0) {
        throw new Error("User not found");
      }

      console.log(`Updated lastLoginAt for user ID: ${id}`);
    } catch (error) {
      console.error(`Error updating lastLoginAt for user ID: ${id}:`, error);
      // Don't throw - we don't want login to fail if this update fails
      // The login will still work and we just won't have the updated timestamp
    }
  }
  
  async verifyPassword(id: number, password: string): Promise<boolean> {
    try {
      // Get user to get the hashed password
      const [user] = await db.select().from(users).where(eq(users.id, id));
      
      if (!user || !user.password) {
        return false;
      }
      
      // Compare the provided password with the stored hash
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  }

  async getUsersNotLoggedInDays(days: number): Promise<User[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Find users who haven't logged in for specified days or have never logged in
      // Only include active users with role "user"
      const inactiveUsers = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "user"),
            eq(users.status, "active"),
            or(lte(users.lastLoginAt, cutoffDate), isNull(users.lastLoginAt)),
          ),
        );

      console.log(
        `Found ${inactiveUsers.length} inactive users (not logged in for ${days} days)`,
      );
      return inactiveUsers;
    } catch (error) {
      console.error(`Error getting inactive users:`, error);
      // Return empty array on error rather than failing
      return [];
    }
  }

  async getLatestLead(): Promise<Lead | undefined> {
    const latestLeads = await db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(1);

    return latestLeads.length > 0 ? latestLeads[0] : undefined;
  }

  async getAllUsers(
    page = 1,
    limit = 10,
    searchTerm = '',
  ): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    let whereConditions = eq(users.role, "user");
    
    // If search term is provided, add search conditions
    if (searchTerm && searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase().trim();
      // Create a complex search condition
      whereConditions = and(
        eq(users.role, "user"),
        or(
          sql`LOWER(${users.name}) LIKE ${`%${search}%`}`,
          sql`LOWER(${users.email}) LIKE ${`%${search}%`}`
        )
      );
    }

    // Get users with pagination and search in descending order by ID (newest first)
    const paginatedUsers = await db
      .select()
      .from(users)
      .where(whereConditions)
      .orderBy(desc(users.id)) // Sort in descending order by ID
      .limit(limit)
      .offset(offset);

    // Get total count for pagination with the same search condition
    const [{ count }] = await db
      .select({
        count: sql`count(*)`.mapWith(Number),
      })
      .from(users)
      .where(whereConditions);

    return {
      users: paginatedUsers,
      total: count,
    };
  }
  
  async getAllUsersNoPagination(): Promise<User[]> {
    // Get all users without pagination for export
    return db
      .select()
      .from(users)
      .where(eq(users.role, "user"))
      .orderBy(desc(users.id));
  }

  async deleteUser(id: number): Promise<void> {
    // First delete related records in user_subscriptions table
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, id));
    
    // Then delete related records in support_tickets table if it exists
    try {
      // Delete user's support ticket replies if they exist
      await db.delete(supportTicketReplies).where(eq(supportTicketReplies.userId, id));
      
      // Delete user's support tickets if they exist
      await db.delete(supportTickets).where(eq(supportTickets.userId, id));
    } catch (error) {
      console.log("No support ticket tables to clean up");
    }
    
    // Delete related records in viewed_leads table if it exists
    try {
      await db.delete(viewedLeads).where(eq(viewedLeads.userId, id));
    } catch (error) {
      console.log("No viewed leads to clean up");
    }
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  // Subadmin related methods
  async getSubadmins(searchTerm = ''): Promise<User[]> {
    let whereConditions = eq(users.role, "subadmin");
    
    // If search term is provided, add search conditions
    if (searchTerm && searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase().trim();
      // Create a complex search condition
      whereConditions = and(
        eq(users.role, "subadmin"),
        or(
          sql`LOWER(${users.name}) LIKE ${`%${search}%`}`,
          sql`LOWER(${users.email}) LIKE ${`%${search}%`}`
        )
      );
    }
    
    return db.select().from(users).where(whereConditions).orderBy(desc(users.id));
  }

  async createSubadmin(data: any): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const [subadmin] = await db
      .insert(users)
      .values({
        email: data.email,
        password: hashedPassword, // Use the hashed password
        name: data.name,
        role: "subadmin",
        status: "active",
        verified: true,
        verification_code: "", // Using the correct field name from schema
        resetToken: "",
        profileImage: "",
        leadCoins: 0,
        permissions: data.permissions || [],
      })
      .returning();

    // Log successful creation
    console.log(`Created subadmin with ID ${subadmin.id} and email ${subadmin.email}`);

    return subadmin;
  }

  async updateSubadminPermissions(
    id: number,
    permissions: string[],
  ): Promise<void> {
    const result = await db
      .update(users)
      .set({ permissions })
      .where(and(eq(users.id, id), eq(users.role, "subadmin")))
      .returning({ id: users.id });

    if (result.length === 0) {
      throw new Error("Subadmin not found");
    }
  }

  // Lead Category related methods
  async getLeadCategory(id: number): Promise<LeadCategory | undefined> {
    const [category] = await db
      .select()
      .from(leadCategories)
      .where(eq(leadCategories.id, id));

    return category;
  }
  
  async getCategoryByName(name: string): Promise<LeadCategory | undefined> {
    const [category] = await db
      .select()
      .from(leadCategories)
      .where(eq(leadCategories.name, name));
      
    return category;
  }

  async getAllLeadCategories(): Promise<LeadCategory[]> {
    return db.select().from(leadCategories).orderBy(desc(leadCategories.id));
  }

  async getActiveLeadCategories(): Promise<LeadCategory[]> {
    return db
      .select()
      .from(leadCategories)
      .where(eq(leadCategories.active, true))
      .orderBy(leadCategories.name);
  }

  async getUsedLeadCategories(): Promise<LeadCategory[]> {
    // Get distinct category IDs from leads table
    const distinctCategoryIds = await db
      .selectDistinct({ categoryId: leads.categoryId })
      .from(leads)
      .where(and(isNotNull(leads.categoryId), ne(leads.categoryId, 0)));

    // If no categories are used in leads, return empty array
    if (distinctCategoryIds.length === 0) {
      return [];
    }

    // Get the category details for these IDs
    const categoryIds = distinctCategoryIds.map((c) => c.categoryId);
    return db
      .select()
      .from(leadCategories)
      .where(
        and(
          inArray(leadCategories.id, categoryIds as number[]),
          eq(leadCategories.active, true),
        ),
      )
      .orderBy(leadCategories.name);
  }

  async createLeadCategory(
    category: InsertLeadCategory,
  ): Promise<LeadCategory> {
    const [newCategory] = await db
      .insert(leadCategories)
      .values({
        name: category.name,
        description: category.description || "",
        active: true,
      })
      .returning();

    return newCategory;
  }

  async updateLeadCategory(
    id: number,
    categoryData: Partial<LeadCategory>,
  ): Promise<LeadCategory> {
    const [category] = await db
      .update(leadCategories)
      .set({
        ...categoryData,
        updatedAt: new Date(),
      })
      .where(eq(leadCategories.id, id))
      .returning();

    if (!category) {
      throw new Error("Lead category not found");
    }

    return category;
  }

  async deleteLeadCategory(id: number): Promise<void> {
    // Check if the category is being used by any leads
    const categoryLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.categoryId, id));

    if (categoryLeads.length > 0) {
      throw new Error("Cannot delete category that is being used by leads");
    }

    await db.delete(leadCategories).where(eq(leadCategories.id, id));
  }

  // Lead related methods
  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));

    return lead;
  }

  async getAllLeads(): Promise<Lead[]> {
    try {
      console.log("Fetching all leads - optimized query");
      // Return leads in descending order by creation date (newest first)
      // Using more efficient query with limit of 100 leads
      const result = await db
        .select()
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(100);
        
      console.log(`Successfully fetched ${result.length} leads`);
      return result;
    } catch (error) {
      console.error("Error in getAllLeads:", error);
      // Return empty array in case of error to prevent app from crashing
      return [];
    }
  }

  async createLead(
    leadData: InsertLead & { creatorId?: number },
  ): Promise<Lead> {
    console.log("Creating lead with data:", leadData);
    const [lead] = await db
      .insert(leads)
      .values({
        title: leadData.title,
        description: leadData.description,
        location: leadData.location,
        price: leadData.price,
        totalMembers: leadData.totalMembers,
        email: leadData.email,
        contactNumber: leadData.contactNumber,
        images: leadData.images || [],
        skills: leadData.skills || [], // Add skills array
        workType: leadData.workType || "full_time", // Add work type
        duration: leadData.duration || "", // Add duration
        creatorId: leadData.creatorId || 1, // Default to admin if not specified
        categoryId: leadData.categoryId, // Add category ID if provided
      } as any)
      .returning();

    console.log("Created lead:", lead);
    return lead;
  }

  async updateLead(id: number, leadData: Partial<Lead>): Promise<Lead> {
    const [lead] = await db
      .update(leads)
      .set({
        ...leadData,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    if (!lead) {
      throw new Error("Lead not found");
    }

    return lead;
  }

  async deleteLead(id: number): Promise<void> {
    try {
      // Get the lead to check if it has a unique category
      const lead = await this.getLead(id);
      if (!lead) {
        throw new Error("Lead not found");
      }

      // First delete all viewed_leads records for this lead
      await db.delete(viewedLeads).where(eq(viewedLeads.leadId, id));

      // Then delete the lead itself
      await db.delete(leads).where(eq(leads.id, id));

      // If the lead had a category, check if it's unique (only used by this lead)
      if (lead.categoryId) {
        // Count other leads using this category
        const otherLeadsWithSameCategory = await db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(leads)
          .where(
            and(
              eq(leads.categoryId, lead.categoryId),
              // Not including the lead we just deleted
              ne(leads.id, id),
            ),
          );

        // If no other leads use this category, delete it
        if (otherLeadsWithSameCategory[0].count === 0) {
          console.log(
            `Deleting orphaned category ID ${lead.categoryId} after lead deletion`,
          );
          // Delete the category
          await db
            .delete(leadCategories)
            .where(eq(leadCategories.id, lead.categoryId));
        }
      }
    } catch (error) {
      console.error("Error in deleteLead:", error);
      throw error;
    }
  }

  // Subscription related methods
  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id));

    return subscription;
  }

    // Subscription related methods
    async getLeadPackages(id: number): Promise<LeadCoinPackage | undefined> {
      const [leadcoin_packages] = await db
        .select()
        .from(leadCoinPackages)
        .where(eq(leadCoinPackages.id, id));
  
      return leadcoin_packages;
    }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions);
  }

  async createSubscription(
    subscriptionData: InsertSubscription,
  ): Promise<Subscription> {
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        name: subscriptionData.name,
        description: subscriptionData.description,
        price: subscriptionData.price,
        durationDays: subscriptionData.durationDays,
        leadCoins: subscriptionData.leadCoins,
        features: subscriptionData.features || [],
        active: true,
      } as any)
      .returning();

    return subscription;
  }

  async updateSubscription(
    id: number,
    subscriptionData: Partial<Subscription>,
  ): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set(subscriptionData)
      .where(eq(subscriptions.id, id))
      .returning();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    return subscription;
  }

  async deleteSubscription(id: number): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.id, id));
  }

  // User subscription related methods
  async getUserSubscription(
    userId: number,
  ): Promise<UserSubscription | undefined> {
    const [userSubscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));

    return userSubscription;
  }

  async getUserActiveSubscription(
    userId: number,
  ): Promise<UserSubscription | undefined> {
    const now = new Date();

    // Check if any active subscriptions have expired and need to be updated
    await this.checkAndUpdateExpiredSubscriptions(userId);

    // Get subscription that's active and not expired
    const [userSubscription] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, "active"),
          gt(userSubscriptions.endDate, now),
        ),
      );

    return userSubscription;
  }

  async checkAndUpdateExpiredSubscriptions(userId: number): Promise<void> {
    const now = new Date();

    // Find any active subscriptions that have expired
    const expiredSubscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, "active"),
          lte(userSubscriptions.endDate, now),
        ),
      );

    // Update expired subscriptions
    for (const expiredSub of expiredSubscriptions) {
      await db
        .update(userSubscriptions)
        .set({ status: "expired" })
        .where(eq(userSubscriptions.id, expiredSub.id));

      // Find the next pending subscription if any
      const [pendingSub] = await db
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.status, "pending"),
          ),
        )
        .orderBy(userSubscriptions.startDate)
        .limit(1);

      // If there's a pending subscription, activate it
      if (pendingSub) {
        // Get subscription details to get the leadCoins amount
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, pendingSub.subscriptionId));

        if (subscription) {
          // Update the subscription to active status
          await db
            .update(userSubscriptions)
            .set({ status: "active" })
            .where(eq(userSubscriptions.id, pendingSub.id));

          // Add lead coins to user
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId));

          if (user) {
            await db
              .update(users)
              .set({
                leadCoins: user.leadCoins + subscription.leadCoins,
              })
              .where(eq(users.id, userId));
          }
        }
      }
    }
  }

  async getUserSubscriptionHistory(
    userId: number,
  ): Promise<UserSubscription[]> {
    // Get all user's subscriptions ordered by start date descending (newest first)
    return db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .orderBy(desc(userSubscriptions.startDate));
  }

  async getUserSubscriptionByPaymentSession(
    sessionId: string,
  ): Promise<UserSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.paymentSessionId, sessionId));

    return subscription;
  }

  async updateUserLeadCoins(userId: number, coins: number): Promise<void> {
    const result = await db
      .update(users)
      .set({
        leadCoins: sql`${users.leadCoins} + ${coins}`
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
  
    if (result.length === 0) {
      throw new Error("User not found");
    }
  }

  async createUserSubscription(
    userSubscriptionData: any,
  ): Promise<UserSubscription> {
    // Get subscription details to calculate end date and lead coins
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, userSubscriptionData.subscriptionId));

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Check if user already has an active subscription
    const activeSubscription = await this.getUserActiveSubscription(
      userSubscriptionData.userId,
    );

    // Default status is pending unless explicitly set to active and payment is verified
    let status = userSubscriptionData.status || "pending";
    
    // If we're trying to set it as active but payment isn't verified, force it to pending
    if (status === "active" && userSubscriptionData.paymentVerified !== true) {
      console.log("Forcing subscription status to pending because payment is not verified");
      status = "pending";
    }
    
    let startDate = userSubscriptionData.startDate || new Date();
    let endDate = userSubscriptionData.endDate || new Date();

    // If endDate is not provided, calculate based on subscription duration
    if (!userSubscriptionData.endDate) {
      if (activeSubscription && status === "pending") {
        // If user already has an active subscription, this pending one will start after
        if (activeSubscription.endDate) {
          startDate = new Date(activeSubscription.endDate);
        } else {
          // If no end date is set, use current date + 1 day as a fallback
          startDate = new Date();
          startDate.setDate(startDate.getDate() + 1);
        }

        // Calculate end date from the start date
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + subscription.durationDays);
      } else {
        // No active subscription or this is being activated now
        // Calculate end date from today
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + subscription.durationDays);
      }
    }

    // Create user subscription
    // Include paymentSessionId and paymentVerified if provided
    const subscriptionValues: any = {
      userId: userSubscriptionData.userId,
      subscriptionId: userSubscriptionData.subscriptionId,
      startDate,
      endDate,
      status,
      leadCoinsLeft: subscription.leadCoins,
    };

    // Add optional fields if they exist
    if (userSubscriptionData.paymentSessionId) {
      subscriptionValues.paymentSessionId = userSubscriptionData.paymentSessionId;
    }
    
    // Always explicitly set paymentVerified flag
    subscriptionValues.paymentVerified = !!userSubscriptionData.paymentVerified;

    const [userSubscription] = await db
      .insert(userSubscriptions)
      .values(subscriptionValues)
      .returning();

    // Only add lead coins to user if the subscription is active (not pending)
    if (status === "active") {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userSubscriptionData.userId));
      if (user) {
        await db
          .update(users)
          .set({
            leadCoins: user.leadCoins + subscription.leadCoins,
          })
          .where(eq(users.id, userSubscriptionData.userId));
      }
    }

    return userSubscription;
  }

  async updateUserSubscription(
    id: number,
    data: Partial<UserSubscription>,
  ): Promise<UserSubscription> {
    const [userSubscription] = await db
      .update(userSubscriptions)
      .set(data)
      .where(eq(userSubscriptions.id, id))
      .returning();

    if (!userSubscription) {
      throw new Error("User subscription not found");
    }

    return userSubscription;
  }

  // Support ticket related methods
  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id));

    return ticket;
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt));
  }

  async getUserSupportTickets(userId: number): Promise<SupportTicket[]> {
    return db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async createSupportTicket(
    ticketData: InsertSupportTicket & { userId: number },
  ): Promise<SupportTicket> {
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        userId: ticketData.userId,
        subject: ticketData.subject,
        message: ticketData.message,
        status: "open",
      })
      .returning();

    return ticket;
  }

  async updateSupportTicketStatus(id: number, status: string): Promise<void> {
    const statusValue = status as
      | "open"
      | "in_progress"
      | "resolved"
      | "closed";

    const result = await db
      .update(supportTickets)
      .set({
        status: statusValue,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, id))
      .returning({ id: supportTickets.id });

    if (result.length === 0) {
      throw new Error("Support ticket not found");
    }
  }

  // Support ticket reply related methods
  async getSupportTicketReplies(
    ticketId: number,
  ): Promise<SupportTicketReply[]> {
    return db
      .select()
      .from(supportTicketReplies)
      .where(eq(supportTicketReplies.ticketId, ticketId))
      .orderBy(supportTicketReplies.createdAt);
  }

  async createSupportTicketReply(
    replyData: InsertSupportTicketReply & {
      ticketId: number;
      userId: number;
      isFromStaff: boolean;
    },
  ): Promise<SupportTicketReply> {
    const [reply] = await db
      .insert(supportTicketReplies)
      .values({
        ticketId: replyData.ticketId,
        userId: replyData.userId,
        message: replyData.message,
        isFromStaff: replyData.isFromStaff,
      })
      .returning();

    // Update the ticket's updatedAt timestamp
    await db
      .update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, replyData.ticketId));

    return reply;
  }

  // Viewed lead related methods
  async getViewedLead(
    userId: number,
    leadId: number,
  ): Promise<ViewedLead | undefined> {
    const [viewedLead] = await db
      .select()
      .from(viewedLeads)
      .where(
        and(eq(viewedLeads.userId, userId), eq(viewedLeads.leadId, leadId)),
      );

    return viewedLead;
  }

  async createViewedLead(userId: number, leadId: number): Promise<ViewedLead> {
    const [viewedLead] = await db
      .insert(viewedLeads)
      .values({
        userId,
        leadId,
      })
      .returning();

    return viewedLead;
  }

  // Lead coin settings related methods
  async getLeadCoinSettings(): Promise<LeadCoinSetting | undefined> {
    const [settings] = await db.select().from(leadCoinSettings).limit(1);

    return settings;
  }

  async updateLeadCoinSettings(
    data: Partial<LeadCoinSetting>,
  ): Promise<LeadCoinSetting> {
    // Try to update existing settings
    let result = await db.update(leadCoinSettings).set(data).returning();

    // If no settings exist, create them
    if (result.length === 0) {
      result = await db
        .insert(leadCoinSettings)
        .values({
          contactInfoCost: data.contactInfoCost || 5,
          detailedInfoCost: data.detailedInfoCost || 10,
          fullAccessCost: data.fullAccessCost || 15,
        })
        .returning();
    }

    return result[0];
  }
  // Get real lead coin statistics from database
  async getLeadCoinStats(): Promise<any> {
    try {
      // Calculate total coins in circulation from all active users
      const totalCoinsResult = await db.select({ 
        total: sql<number>`SUM(${users.leadCoins})::int` 
      })
      .from(users)
      .where(and(
        ne(users.role, "admin"),
        eq(users.status, "active"),
        eq(users.verified, true)
      ));
      const totalCoins = totalCoinsResult[0]?.total || 0;
      // Calculate coins spent this month from coin transactions
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const coinsSpentResult = await db.select({ 
        total: sql<number>`SUM(ABS(${coinTransactions.amount}))::int` 
      })
      .from(coinTransactions)
      .where(
        and(
          eq(coinTransactions.type, "spent"),
          sql`${coinTransactions.createdAt} >= ${startOfMonth.toISOString()}`
        )
      );
      const coinsSpentThisMonth = coinsSpentResult[0]?.total || 0;
      // Get leads viewed today from viewed_leads table
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const leadsViewedResult = await db.execute(
        sql`SELECT COUNT(*)::int as count FROM lead_views WHERE viewed_at >= ${today.toISOString()}`
      );
      const leadsViewedToday = leadsViewedResult.rows[0]?.count || 0;
      // Get top 10 users by current LeadCoin balance (only real registered users)
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
      
      return {
        totalCoins,
        coinsSpentThisMonth,
        leadsViewedToday,
        topUsers
      };
    } catch (error) {
      console.error("Error fetching lead coin stats:", error);
      throw error;
    }
  }
  // Dashboard related methods
  async getAdminDashboardData(): Promise<any> {
    console.log("Starting to fetch admin dashboard data...");

    // Get counts for all entities
    const allUsers = await db.select().from(users);
    console.log(`Retrieved ${allUsers.length} users`);

    const allLeads = await db.select().from(leads);
    console.log(`Retrieved ${allLeads.length} leads`);

    const allTickets = await db.select().from(supportTickets);
    console.log(`Retrieved ${allTickets.length} tickets`);

    const allUserSubscriptions = await db.select().from(userSubscriptions);
    console.log(`Retrieved ${allUserSubscriptions.length} user subscriptions`);

    // Get recent activities
    const recentUsers = allUsers
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    const recentLeads = allLeads
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    const recentTickets = allTickets
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    // Calculate previous month counts for growth metrics
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );

    const prevMonthUsers = allUsers.filter(
      (u) => new Date(u.createdAt) < oneMonthAgo,
    ).length;
    const prevMonthLeads = allLeads.filter(
      (l) => new Date(l.createdAt) < oneMonthAgo,
    ).length;
    const prevMonthTickets = allTickets.filter(
      (t) => new Date(t.createdAt) < oneMonthAgo,
    ).length;
    const prevMonthSubscriptions = allUserSubscriptions.filter(
      (s) => new Date(s.createdAt) < oneMonthAgo,
    ).length;

    const currentUserCount = allUsers.length;
    const currentLeadCount = allLeads.length;
    const currentTicketCount = allTickets.length;
    const currentSubscriptionCount = allUserSubscriptions.length;

    // Calculate growth percentages
    const userGrowth =
      prevMonthUsers > 0
        ? Math.round(
            ((currentUserCount - prevMonthUsers) / prevMonthUsers) * 100,
          )
        : 100;

    const leadGrowth =
      prevMonthLeads > 0
        ? Math.round(
            ((currentLeadCount - prevMonthLeads) / prevMonthLeads) * 100,
          )
        : 100;

    const ticketGrowth =
      prevMonthTickets > 0
        ? Math.round(
            ((currentTicketCount - prevMonthTickets) / prevMonthTickets) * 100,
          )
        : 100;

    const subscriptionGrowth =
      prevMonthSubscriptions > 0
        ? Math.round(
            ((currentSubscriptionCount - prevMonthSubscriptions) /
              prevMonthSubscriptions) *
              100,
          )
        : 100;

    // Get subscription distribution data
    const subscriptionsData = await db.select().from(subscriptions);
    const subscriptionDistribution = await Promise.all(
      subscriptionsData.map(async (s) => {
        const count = allUserSubscriptions.filter(
          (us) => us.subscriptionId === s.id,
        ).length;
        return {
          name: s.name,
          value: count,
        };
      }),
    );

    // Generate lead generation data for last 7 days
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const leadGenerationData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dayLeads = allLeads.filter((lead) => {
        const leadDate = new Date(lead.createdAt);
        return (
          leadDate.getDate() === date.getDate() &&
          leadDate.getMonth() === date.getMonth() &&
          leadDate.getFullYear() === date.getFullYear()
        );
      }).length;

      leadGenerationData.push({
        date: days[date.getDay()],
        value: dayLeads,
      });
    }

    // Calculate total lead coins in circulation
    const totalLeadCoins = allUsers.reduce(
      (sum, user) => sum + user.leadCoins,
      0,
    );

    // Calculate coins spent this month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const coinsSpentResult = await db
    .select({
      total: sql<number>`SUM(ABS(${coinTransactions.amount}))::int`,
    })
    .from(coinTransactions)
    .where(
      and(
        eq(coinTransactions.type, "spent"),
        sql`${coinTransactions.createdAt} >= ${thisMonthStart.toISOString()}`,
      ),
    );
  const coinsSpentThisMonth = coinsSpentResult[0]?.total || 0;


    // Calculate leads viewed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const viewedLeadsTodayResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM lead_views WHERE viewed_at >= ${today.toISOString()}`
    );
    const viewedLeadsToday = viewedLeadsTodayResult.rows[0]?.count || 0;

    return {
      users: {
        total: currentUserCount,
        growth: userGrowth,
        recent: recentUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
        })),
      },
      leads: {
        total: currentLeadCount,
        growth: leadGrowth,
        recent: recentLeads.map((l) => ({
          id: l.id,
          title: l.title,
          location: l.location,
          price: l.price,
          createdAt: l.createdAt,
        })),
      },
      tickets: {
        total: currentTicketCount,
        growth: ticketGrowth,
        recent: recentTickets.map((t) => ({
          id: t.id,
          title: t.subject, // Using subject as title
          status: t.status,
          createdAt: t.createdAt,
        })),
      },
      subscriptions: {
        total: currentSubscriptionCount,
        growth: subscriptionGrowth,
        distribution: subscriptionDistribution,
      },
      leadGenerationData,
      leadCoins: {
        total: totalLeadCoins,
        spentThisMonth: coinsSpentThisMonth,
        viewedToday: viewedLeadsToday,
      },
      activities: [
        ...recentUsers.map((u) => ({
          type: "user",
          title: `New user registered: ${u.name}`,
          time: new Date(u.createdAt).toISOString(),
          id: u.id,
        })),
        ...recentLeads.map((l) => ({
          type: "lead",
          title: `New lead added: ${l.title}`,
          time: new Date(l.createdAt).toISOString(),
          id: l.id,
        })),
        ...recentTickets.map((t) => ({
          type: "support",
          title: `New support ticket: ${t.subject}`,
          time: new Date(t.createdAt).toISOString(),
          id: t.id,
        })),
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10),
    };
  }

  async getSubadminDashboardData(): Promise<any> {
    // Get counts for all entities
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, "user"));
    const allLeads = await db.select().from(leads);

    // Recent leads and users
    const recentUsers = allUsers
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    const recentLeads = allLeads
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    // Calculate previous month counts for growth metrics
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );

    const prevMonthUsers = allUsers.filter(
      (u) => new Date(u.createdAt) < oneMonthAgo,
    ).length;
    const prevMonthLeads = allLeads.filter(
      (l) => new Date(l.createdAt) < oneMonthAgo,
    ).length;

    const currentUserCount = allUsers.length;
    const currentLeadCount = allLeads.length;

    // Calculate growth percentages
    const userGrowth =
      prevMonthUsers > 0
        ? Math.round(
            ((currentUserCount - prevMonthUsers) / prevMonthUsers) * 100,
          )
        : 100;

    const leadGrowth =
      prevMonthLeads > 0
        ? Math.round(
            ((currentLeadCount - prevMonthLeads) / prevMonthLeads) * 100,
          )
        : 100;

    return {
      users: {
        total: currentUserCount,
        growth: userGrowth,
        recent: recentUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
        })),
      },
      leads: {
        total: currentLeadCount,
        growth: leadGrowth,
        recent: recentLeads.map((l) => ({
          id: l.id,
          title: l.title,
          location: l.location,
          price: l.price,
          createdAt: l.createdAt,
        })),
      },
      activities: [
        ...recentUsers.map((u) => ({
          type: "user",
          title: `New user registered: ${u.name}`,
          time: new Date(u.createdAt).toISOString(),
          id: u.id,
        })),
        ...recentLeads.map((l) => ({
          type: "lead",
          title: `New lead added: ${l.title}`,
          time: new Date(l.createdAt).toISOString(),
          id: l.id,
        })),
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10),
    };
  }

  async getUserDashboardData(userId: number): Promise<any> {
    // Get user details
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get user subscription
    const userSubscription = await this.getUserSubscription(userId);

    // Get subscription details if user has a subscription
    let subscription;
    if (userSubscription) {
      subscription = await this.getSubscription(
        userSubscription.subscriptionId,
      );
    }

    // Get user's support tickets
    const userTickets = await this.getUserSupportTickets(userId);

    // Get viewed leads by user
    const viewedLeadsData = await db
      .select()
      .from(viewedLeads)
      .where(eq(viewedLeads.userId, userId));

    // Get viewed lead details
    const viewedLeadIds = viewedLeadsData.map((vl) => vl.leadId);
    const userViewedLeads = [];

    for (const id of viewedLeadIds) {
      const lead = await this.getLead(id);
      if (lead) {
        userViewedLeads.push(lead);
      }
    }

    // Get lead coin settings
    const leadCoinSettings = await this.getLeadCoinSettings();

    return {
      user: {
        ...user,
        password: undefined,
      },
      subscription: subscription || null,
      subscriptionStatus: userSubscription
        ? userSubscription.endDate &&
          new Date(userSubscription.endDate) > new Date()
          ? "active"
          : "expired"
        : "none",
      tickets: {
        total: userTickets.length,
        pending: userTickets.filter((t) => t.status === "open").length,
        recent: userTickets
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 5),
      },
      leads: {
        viewed: userViewedLeads.length,
        recent: userViewedLeads
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 5),
      },
      leadCoins: {
        balance: user.leadCoins,
        settings: leadCoinSettings,
      },
    };
  }
}

// Use the database storage for production
export const storage = new DatabaseStorage();