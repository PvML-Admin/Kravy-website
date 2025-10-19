const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Always use SSL for remote databases (like Render), disable for local postgres
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? {
    rejectUnauthorized: false
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10 seconds for external connections
  query_timeout: 30000, // 30 seconds for queries
  statement_timeout: 30000, // 30 seconds for statements
});

// Test the connection
pool.on('connect', () => {
  console.log('Database connected');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Promise-based query methods matching the SQLite interface
async function runAsync(sql, params = []) {
  const client = await pool.connect();
  try {
    // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
    let pgSQL = convertSQLitePlaceholders(sql);
    
    // Add RETURNING id for INSERT statements to match SQLite's lastID behavior
    if (pgSQL.trim().toUpperCase().startsWith('INSERT') && !pgSQL.toUpperCase().includes('RETURNING')) {
      pgSQL += ' RETURNING id';
    }
    
    const result = await client.query(pgSQL, params);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  } finally {
    client.release();
  }
}

async function getAsync(sql, params = []) {
  const client = await pool.connect();
  try {
    const pgSQL = convertSQLitePlaceholders(sql);
    const result = await client.query(pgSQL, params);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function allAsync(sql, params = []) {
  const client = await pool.connect();
  try {
    const pgSQL = convertSQLitePlaceholders(sql);
    const result = await client.query(pgSQL, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function execAsync(sql) {
  const client = await pool.connect();
  try {
    const pgSQL = convertSQLitePlaceholders(sql);
    await client.query(pgSQL);
  } finally {
    client.release();
  }
}

// Helper function to convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
function convertSQLitePlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// Create a db object that matches the SQLite interface
const db = {
  runAsync,
  getAsync,
  allAsync,
  execAsync,
  pool, // Export pool for advanced usage if needed
};

module.exports = db;

