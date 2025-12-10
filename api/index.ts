import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/repositories/prisma.js';

// Initialize the Express app
const app = createApp();

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // Ensure database connection is established
  await connectDatabase();
  
  // Forward the request to the Express application
  app(req, res);
}
