/**
 * Creates the `musika` database in MySQL if it doesn't exist.
 * Connects using the credentials from DATABASE_URL (host/port/user/pass)
 * WITHOUT the database, then issues CREATE DATABASE IF NOT EXISTS.
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

function parseDbUrl(url: string) {
  // mysql://user:pass@host:port/dbname
  const m = url.match(/^mysql:\/\/(?:([^:@/]*)(?::([^@/]*))?@)?([^:/]+)(?::(\d+))?(\/([^/?#]*))?/);
  if (!m) throw new Error('Invalid DATABASE_URL: ' + url);
  return {
    user: m[1] || 'root',
    password: m[2] || '',
    host: m[3] || 'localhost',
    port: m[4] ? Number(m[4]) : 3306,
    database: m[6] || 'musika',
  };
}

async function main() {
  const url = process.env.DATABASE_URL || 'mysql://root@localhost:3306/musika';
  const cfg = parseDbUrl(url);
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true,
  });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await conn.end();
  console.log(`Database ready: ${cfg.database} @ ${cfg.host}:${cfg.port}`);
}

main().catch((e) => {
  console.error('create-db failed:', e.message);
  process.exit(1);
});
