import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
// Use the new fixed routes file with proper authentication 
import { registerRoutes } from "./routes-auth-fixed";
import { setupVite, serveStatic, log } from "./vite";
import { notifyInactiveUsers } from "./scheduled-tasks";
import apiRoutes from "./api-routes";
import { registerStripeRoutes } from "./stripe-routes";

const app = express();

// Configure CORS for Replit environment
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Set up PostgreSQL session store
const PgSession = connectPgSimple(session);

// Set up session middleware with PostgreSQL store for production
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    schemaName: 'public'
  }),
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'leadgen-super-secret-key-change-in-production',
  resave: true,  // Changed to true for better persistence
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? false : false, // Keep false for now
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}));

// Add API routes from api-routes.ts to fix support tickets not showing
app.use('/api', apiRoutes);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register Stripe payment routes
  registerStripeRoutes(app);
  
  // Register main application routes
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 2010;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    /**
     * Scheduled Task System
     * 
     * The application uses a simple scheduled task system to handle recurring tasks:
     * 1. Inactive User Notifications: Sends emails to users who haven't logged in for 3+ days
     * 
     * Implementation details:
     * - Initial execution happens at server startup to ensure immediate action
     * - Regular intervals (daily) ensure continuous monitoring without requiring manual triggers
     * - Error handling preserves server stability even if scheduled tasks fail
     */
    
    // Run the inactive user notification check once at startup
    notifyInactiveUsers(3).catch(err => {
      console.error('Error running inactive user notification on startup:', err);
    });
    
    // Set up a daily check for inactive users (86400000 ms = 24 hours)
    const DAILY_INTERVAL = 24 * 60 * 60 * 1000;
    setInterval(() => {
      log('Running scheduled inactive user notification check');
      notifyInactiveUsers(3).catch(err => {
        console.error('Error running scheduled inactive user notification:', err);
      });
    }, DAILY_INTERVAL);
    
    log('Scheduled tasks initialized - inactive user notification system active');
  });
})();
