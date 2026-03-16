import { neon, Pool } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to .env.local or your deployment environment variables.');
}

// Tagged template for static queries
const sql = neon(DATABASE_URL);

// Pool for dynamic queries (array table sync, etc.)
const pool = new Pool({ connectionString: DATABASE_URL });

export { pool };
export default sql;
