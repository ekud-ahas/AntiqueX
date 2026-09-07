const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function main() {
  const hash = await bcrypt.hash('1234', 10);
  const result = await pool.query(
    'UPDATE users SET password = $1 WHERE email = $2 RETURNING user_id, username, email',
    [hash, 'showmajitsahaduke@gmail.com']
  );
  console.log('Successfully updated:', result.rows[0]);
  pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
