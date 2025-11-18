import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine the path to the .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log(`Loading environment variables from: ${envPath}`);

// Load environment variables from the .env file
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Log the loaded environment variables (except sensitive ones)
console.log('Environment variables loaded successfully');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);

// Export environment variables
export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || 'votepancake-secret-key-change-in-production',
  NODE_ENV: process.env.NODE_ENV || 'development'
} as const;

// Validate required environment variables
if (!env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not set in the environment variables');
  console.log('Current working directory:', process.cwd());
  console.log('Environment variables:', Object.keys(process.env).join(', '));
  process.exit(1);
}

console.log('Environment configuration loaded successfully');
