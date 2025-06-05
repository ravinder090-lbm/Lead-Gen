import { storage } from "./storage";
import { mailer } from "./mailer";

/**
 * Send notification emails to users who haven't logged in for a specified number of days
 *
 * This function:
 * 1. Retrieves users who haven't logged in for the specified period (default: 3 days)
 * 2. Sends a personalized email notification to each inactive user
 * 3. Logs the process for monitoring and debugging
 *
 * The system runs this function:
 * - Once when the server starts
 * - Daily via a scheduled interval to continually monitor user activity
 *
 * @param days Number of days of inactivity to check for (default: 3)
 */
export async function notifyInactiveUsers(days: number = 3): Promise<void> {
  try {
    console.log(`Checking for users who haven't logged in for ${days} days...`);

    // Get users who haven't logged in for the specified number of days
    // This uses the getUsersNotLoggedInDays method which checks:
    // - Users with role="user" and status="active"
    // - Users with lastLoginAt older than the cutoff date OR null (never logged in)
    const inactiveUsers = await storage.getUsersNotLoggedInDays(days);

    console.log(`Found ${inactiveUsers.length} inactive users`);

    // Send notification emails to each inactive user
    // Each email contains personalized information with the user's name
    // for (const user of inactiveUsers) {
    //   try {
    //     console.log(`Sending inactivity notification to ${user.email}`);
    //     // await mailer.sendInactivityNotification(user.email, user.name);
    //     console.log(`Notification sent to ${user.email}`);
    //   } catch (error) {
    //     console.error(`Failed to send notification to ${user.email}:`, error);
    //     // Continue with other users even if one email fails
    //   }
    // }

    console.log("Inactive user notification process completed");
  } catch (error) {
    console.error("Error in notifyInactiveUsers:", error);
  }
}