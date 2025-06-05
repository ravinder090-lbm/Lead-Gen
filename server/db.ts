// import { Pool, neonConfig } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-serverless';
// import ws from "ws";
// import * as schema from "@shared/schema";

// neonConfig.webSocketConstructor = ws;
// console.log(process.env,'-=---==-=--==')

// // if (!process.env.DATABASE_URL) {
// //   throw new Error(
// //     "DATABASE_URL must be set. Did you forget to provision a database?",
// //   );
// // }

// // Configure Pool with connection management parameters for better resilience
// export const pool = new Pool({ 
//   connectionString: process.env.DATABASE_URL || "postgresql://postgres:ravinder@localhost:5432/lead_generation",
//   max: 10,                  // Maximum number of clients in the pool
//   idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
//   connectionTimeoutMillis: 5000, // Maximum time to wait for connection
//   maxUses: 100,             // Max number of times a single connection can be reused before being recycled
//   ssl: true                 // Enable SSL/TLS
// });

// // Add error handler to prevent crashes
// pool.on('error', (err) => {
//   console.error('Unexpected error on idle database client', err);
//   // Don't crash the server if a pooled connection encounters an error
// });

// // Wrap with drizzle ORM
// export const db = drizzle({ client: pool, schema });

// // Helper function to execute queries with automatic reconnection
// export async function executeWithRetry(operation, maxRetries = 3) {
//   let attempts = 0;
//   let lastError;

//   while (attempts < maxRetries) {
//     try {
//       return await operation();
//     } catch (error) {
//       lastError = error;
//       attempts++;
      
//       // Check for connection termination errors that warrant reconnection
//       const isConnectionError = error.code === '57P01' || 
//                                error.message.includes('terminating connection') ||
//                                error.message.includes('Connection terminated');
      
//       if (isConnectionError && attempts < maxRetries) {
//         console.log(`Database connection error, retrying (attempt ${attempts}/${maxRetries})...`);
//         // Wait a bit before retrying
//         await new Promise(r => setTimeout(r, 500 * attempts));
//         continue;
//       }
      
//       // For other errors or if we've reached max retries, throw
//       throw error;
//     }
//   }
  
//   throw lastError;
// }

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
import dotenv from 'dotenv'
dotenv.config()

// Configure PostgreSQL connection pool
export const pool = new Pool({
  connectionString:process.env.DATABASE_URL,
  max: 10,                      // Max number of clients in the pool
  idleTimeoutMillis: 30000,    // Time a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // Time to wait for a new connection
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Optional error handling for unexpected pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
});

// Wrap the pool with drizzle ORM and your schema
export const db = drizzle(pool, { schema });

// Retry helper function for resilient queries
export async function executeWithRetry(operation: () => Promise<any>, maxRetries = 3) {
  let attempts = 0;
  let lastError;

  while (attempts < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      attempts++;

      const isConnectionError = error.code === '57P01' || 
                                 error.message?.includes('terminating connection') ||
                                 error.message?.includes('Connection terminated');

      if (isConnectionError && attempts < maxRetries) {
        console.warn(`Retrying DB operation (attempt ${attempts}/${maxRetries})...`);
        await new Promise(res => setTimeout(res, 500 * attempts));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
