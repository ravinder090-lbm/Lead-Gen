import express, { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import session from "express-session";

const router = express.Router();

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check if session exists and has user data
  console.log("Auth middleware - Session exists:", !!req.session, ", User in session:", !!(req.session && req.session.user));
  
  if (req.session && req.session.user) {
    // User is authenticated
    console.log(`User authenticated: ${req.session.user.id} (${req.session.user.role})`);
    next();
  } else {
    // User is not authenticated
    console.log(`Authentication failed - Missing session or user data`);
    res.status(401).json({ message: "Not authenticated" });
  }
};

// Get all subadmins
router.get("/subadmins", async (req: Request, res: Response) => {
  try {
    const subadmins = await storage.getSubadmins();
    // Set content type explicitly to make sure it returns as JSON
    res.setHeader('Content-Type', 'application/json');
    return res.json(subadmins);
  } catch (error) {
    console.error("Error fetching subadmins:", error);
    return res.status(500).json({ message: "Failed to fetch subadmins" });
  }
});

// Create subadmin
router.post("/subadmins", async (req: Request, res: Response) => {
  try {
    const { name, email, password, permissions } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    
    const subadmin = await storage.createSubadmin({
      name,
      email,
      password,
      permissions: permissions || []
    });
    
    return res.status(201).json(subadmin);
  } catch (error) {
    console.error("Error creating subadmin:", error);
    return res.status(500).json({ message: "Failed to create subadmin" });
  }
});

// Update subadmin permissions
router.patch("/subadmins/:id/permissions", async (req: Request, res: Response) => {
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

// Delete subadmin
router.delete("/subadmins/:id", async (req: Request, res: Response) => {
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

// Support Module Endpoints

// Get all support tickets (for admin) - direct access with no auth check for now
router.get("/support", async (req: Request, res: Response) => {
  try {
    // Get tickets directly from database
    const tickets = await storage.getAllSupportTickets();
    console.log(`Support API: Successfully retrieved ${tickets.length} tickets - direct access`);
    return res.json(tickets);
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return res.status(500).json({ message: "Failed to fetch support tickets" });
  }
});

// Get user's support tickets
router.get("/support/user", isAuthenticated, async (req: Request, res: Response) => {
  
  try {
    const tickets = await storage.getUserSupportTickets(req.session.user.id);
    return res.json(tickets);
  } catch (error) {
    console.error("Error fetching user support tickets:", error);
    return res.status(500).json({ message: "Failed to fetch support tickets" });
  }
});

// Get specific support ticket
router.get("/support/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const ticket = await storage.getSupportTicket(id);
    
    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }
    
    // Only allow access if the user is an admin/subadmin or the ticket owner
    if (req.session.user.role === 'user' && ticket.userId !== req.session.user.id) {
      return res.status(403).json({ message: "Unauthorized access to this ticket" });
    }
    
    return res.json(ticket);
  } catch (error) {
    console.error("Error fetching support ticket:", error);
    return res.status(500).json({ message: "Failed to fetch support ticket" });
  }
});

// Create new support ticket
router.post("/support", isAuthenticated, async (req: Request, res: Response) => {
  
  try {
    const { subject, message } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ message: "Subject and message are required" });
    }
    
    const ticket = await storage.createSupportTicket({
      userId: req.session.user.id,
      subject,
      message
    });
    
    return res.status(201).json(ticket);
  } catch (error) {
    console.error("Error creating support ticket:", error);
    return res.status(500).json({ message: "Failed to create support ticket" });
  }
});

// Update support ticket status
router.patch("/support/:id/status", isAuthenticated, async (req: Request, res: Response) => {
  // Only admin and subadmin can update ticket status
  if (req.session.user.role === 'user') {
    return res.status(403).json({ message: "Unauthorized - Only staff can update ticket status" });
  }
  
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    await storage.updateSupportTicketStatus(id, status);
    
    return res.json({ success: true });
  } catch (error) {
    console.error("Error updating support ticket status:", error);
    return res.status(500).json({ message: "Failed to update support ticket status" });
  }
});

// Get ticket replies
router.get("/support/:id/replies", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const ticket = await storage.getSupportTicket(id);
    
    // Only allow access to replies if user is admin/subadmin or ticket owner
    if (req.session.user.role === 'user' && ticket.userId !== req.session.user.id) {
      return res.status(403).json({ message: "Unauthorized access to ticket replies" });
    }
    
    const replies = await storage.getSupportTicketReplies(id);
    return res.json(replies);
  } catch (error) {
    console.error("Error fetching support ticket replies:", error);
    return res.status(500).json({ message: "Failed to fetch support ticket replies" });
  }
});

// Add reply to ticket
router.post("/support/:id/reply", isAuthenticated, async (req: Request, res: Response) => {
  
  try {
    const ticketId = parseInt(req.params.id);
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: "Reply message is required" });
    }
    
    const reply = await storage.createSupportTicketReply({
      ticketId,
      userId: req.session.user.id,
      message,
      isStaff: req.session.user.role !== "user"
    });
    
    return res.status(201).json(reply);
  } catch (error) {
    console.error("Error creating support ticket reply:", error);
    return res.status(500).json({ message: "Failed to create support ticket reply" });
  }
});

// LeadCoin Management Endpoints

// Get lead coin settings
router.get("/leadcoins/settings", async (req: Request, res: Response) => {
  try {
    const settings = await storage.getLeadCoinSettings();
    return res.json(settings || {});
  } catch (error) {
    console.error("Error fetching lead coin settings:", error);
    return res.status(500).json({ message: "Failed to fetch lead coin settings" });
  }
});

// Update lead coin settings
router.patch("/leadcoins/settings", async (req: Request, res: Response) => {
  if (!req.session?.user?.id || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized - admin access required" });
  }
  
  try {
    const { conversionRate, minPurchase, maxPurchase } = req.body;
    
    const updatedSettings = await storage.updateLeadCoinSettings({
      conversionRate: conversionRate !== undefined ? conversionRate : undefined,
      minPurchase: minPurchase !== undefined ? minPurchase : undefined,
      maxPurchase: maxPurchase !== undefined ? maxPurchase : undefined
    });
    
    return res.json(updatedSettings);
  } catch (error) {
    console.error("Error updating lead coin settings:", error);
    return res.status(500).json({ message: "Failed to update lead coin settings" });
  }
});

// Get lead coin stats - direct access without auth check
router.get("/leadcoins/stats", async (req: Request, res: Response) => {
  try {

      // Get actual lead coin statistics from the database
      const stats = await storage.getLeadCoinStats();
      return res.json(stats);
  } catch (error) {
    console.error("Error fetching lead coin stats:", error);
    return res.status(500).json({ message: "Failed to fetch lead coin stats" });
  }
});

// User Management Endpoints

// Update user status (activate/deactivate)
router.patch("/users/:id/status", async (req: Request, res: Response) => {
  console.log("Update user status request received:", { 
    userId: req.params.id, 
    session: req.session ? "exists" : "missing", 
    authenticated: req.session?.user ? "yes" : "no"
  });

  if (!req.session?.user?.id || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized - admin access required" });
  }
  
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || !["active", "inactive", "pending"].includes(status)) {
      return res.status(400).json({ message: "Valid status (active, inactive, pending) is required" });
    }
    
    await storage.updateUserStatus(id, status);
    
    // Fetch the updated user to return complete data
    const updatedUser = await storage.getUser(id);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log("User status updated successfully:", { id, status });
    return res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({ message: "Failed to update user status" });
  }
});

// Update user profile - PATCH version (original)
router.patch("/users/:id", async (req: Request, res: Response) => {
  console.log("Update user PATCH request received:", { 
    userId: req.params.id, 
    session: req.session ? "exists" : "missing", 
    authenticated: req.session?.user ? "yes" : "no"
  });
  
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // Check if user is admin or the user is updating their own profile
  const isAdmin = req.session.user.role === "admin";
  const isOwnProfile = req.session.user.id === parseInt(req.params.id);
  
  if (!isAdmin && !isOwnProfile) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  
  try {
    const id = parseInt(req.params.id);
    const { name, email, profileImage, status } = req.body;
    
    console.log("Updating user:", { id, name, email, status, isAdmin });
    
    // Only update fields that are provided
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    
    // Handle status separately to avoid issues
    if (isAdmin && status !== undefined) {
      console.log("Updating user status to:", status);
      await storage.updateUserStatus(id, status);
    }
    
    const updatedUser = await storage.updateUserProfile(id, updateData);
    console.log("User updated successfully:", { id, success: true });
    
    return res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ message: "Failed to update user profile" });
  }
});

// New alternate POST endpoint for user updates
router.post("/users/:id/update", async (req: Request, res: Response) => {
  console.log("Update user POST request received:", { 
    userId: req.params.id, 
    session: req.session ? "exists" : "missing", 
    authenticated: req.session?.user ? "yes" : "no"
  });
  
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // Check if user is admin or the user is updating their own profile
  const isAdmin = req.session.user.role === "admin";
  const isOwnProfile = req.session.user.id === parseInt(req.params.id);
  
  if (!isAdmin && !isOwnProfile) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  
  try {
    const id = parseInt(req.params.id);
    const { name, email, profileImage, status } = req.body;
    
    console.log("Updating user via POST:", { id, name, email, status, isAdmin });
    
    // Only update fields that are provided
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    
    // Handle status separately to avoid issues
    if (isAdmin && status !== undefined) {
      console.log("Updating user status to:", status);
      await storage.updateUserStatus(id, status);
    }
    
    const updatedUser = await storage.updateUserProfile(id, updateData);
    console.log("User updated successfully via POST:", { id, success: true });
    
    return res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ message: "Failed to update user profile" });
  }
});

// Change password endpoint with proper validation
router.post("/auth/change-password", async (req: Request, res: Response) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        message: "Current password, new password, and confirmation are required" 
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirmation do not match" });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long" });
    }
    
    // Verify current password is correct
    const isPasswordValid = await storage.verifyPassword(req.session.user.id, currentPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    
    // Update to the new password
    await storage.updateUserPassword(req.session.user.id, newPassword);
    
    return res.json({ success: true, message: "Password successfully updated" });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ message: "Failed to change password" });
  }
});

export default router;