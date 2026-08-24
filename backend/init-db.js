const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function initDB() {
    try {
        console.log('Connecting to PostgreSQL...');
        const timeRes = await pool.query('SELECT NOW()');
        console.log('Connected successfully! Server time:', timeRes.rows[0].now);

        console.log('Applying schema.sql...');
        const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf-8');
        await pool.query(schema);
        console.log('Schema created successfully!');

        console.log('Applying seed.sql...');
        const seed = fs.readFileSync(path.join(__dirname, '../database/seed.sql'), 'utf-8');
        await pool.query(seed);
        console.log('Seed data inserted successfully!');

        const tablesRes = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
        );

        console.log('\nVerification: ' + tablesRes.rows.length + ' tables found in public schema:');
        for (const row of tablesRes.rows) {
            const countRes = await pool.query('SELECT COUNT(*) FROM ' + row.table_name);
            console.log('  ✓ ' + row.table_name.padEnd(22) + ': ' + countRes.rows[0].count + ' rows');
        }
        console.log('\nDatabase initialization complete!');
    } catch (err) {
        console.error('Error during database initialization:', err);
    } finally {
        await pool.end();
    }
}

initDB();

