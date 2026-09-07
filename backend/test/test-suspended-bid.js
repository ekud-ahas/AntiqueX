const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { generateToken } = require('../utils/jwt');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const userToken = generateToken({
  userId: 7,
  username: 'Ekud_Ahas',
  email: 'showmajitsahaduke@gmail.com',
  role: 'customer'
});

async function main() {
  // 1. Suspend user 7
  await pool.query("UPDATE users SET status = 'suspended' WHERE user_id = 7");
  console.log('USER 7 SUSPENDED IN DB');

  // 2. Try placing a bid with suspended user's token
  const bidRes = await fetch('http://localhost:5000/api/auctions/3/bids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + userToken },
    body: JSON.stringify({ bid_amount: 50000 })
  });
  console.log('SUSPENDED USER BID STATUS (Expect 403):', bidRes.status);
  console.log('RESPONSE:', await bidRes.json());

  // 3. Reactivate user 7
  await pool.query("UPDATE users SET status = 'active' WHERE user_id = 7");
  console.log('USER 7 REACTIVATED IN DB');

  pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
