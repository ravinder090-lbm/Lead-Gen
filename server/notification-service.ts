import { db } from "./db";
import { users, notifications } from "@shared/schema";
import { eq, and, not } from "drizzle-orm";
import { mailer } from "./mailer";

export class NotificationService {
  // Check for low balance and create notifications
  async checkAndCreateLowBalanceNotification(userId: number): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user) return;

      const balance = user.leadCoins;
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
                eq(notifications.type, "low_balance"),
                eq(notifications.metadata, { threshold })
              )
            )
            .limit(1);

          if (existingNotification.length === 0) {
            const message = threshold === 0 
              ? "Your LeadCoin balance has reached zero. Purchase more coins to continue viewing lead details."
              : `Your LeadCoin balance is running low (${threshold} coins remaining). Consider purchasing more coins to continue viewing leads.`;

            // Create notification
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
                await mailer.sendLowBalanceAlert(user.email, user.name, balance);
              } catch (emailError) {
                console.error("Failed to send low balance email:", emailError);
              }
            }
          }
          break; // Only trigger one threshold at a time
        }
      }
    } catch (error) {
      console.error("Error checking low balance:", error);
    }
  }

  // Create notification for coin transactions
  async createCoinNotification(
    userId: number, 
    type: "coin_received" | "subscription_update", 
    title: string, 
    message: string, 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await db.insert(notifications).values({
        userId,
        type,
        title,
        message,
        metadata
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }

  // Get user notifications
  async getUserNotifications(userId: number, limit = 20): Promise<any[]> {
    try {
      return await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(notifications.createdAt)
        .limit(limit);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(userId: number, notificationId: number): Promise<boolean> {
    try {
      const result = await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.read, false)
          )
        );
      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();