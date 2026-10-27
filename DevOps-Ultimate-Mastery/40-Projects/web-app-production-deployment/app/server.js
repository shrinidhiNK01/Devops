const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8080;

// Setup database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'prod_db',
  port: 5432,
});

app.use(express.json());

// Health Check Endpoint (vital for Kubernetes/ALB health probes)
app.get('/health', async (req, res) => {
  try {
    // Ping database to verify connection health
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'UP', database: 'CONNECTED' });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

// Main Web Route
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`
      <html>
        <head>
          <title>Production Node App</title>
          <style>
            body { font-family: sans-serif; background-color: #f4f6f9; color: #333; text-align: center; padding-top: 50px; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🚀 DevOps Production App Running</h1>
            <p>Database time query: <strong>${result.rows[0].now}</strong></p>
            <p>Status: Healthy & Active</p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`Database error: ${err.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
