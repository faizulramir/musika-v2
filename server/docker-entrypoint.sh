#!/bin/sh
set -e

# Wait until the configured MySQL is reachable (works for external VPS MySQL
# or the optional in-compose db container).
echo "[entrypoint] waiting for MySQL..."
i=0
until node -e '
const m=require("mysql2/promise");
const u=process.env.DATABASE_URL;
const r=u.match(/^mysql:\/\/(?:([^:@/]*)(?::([^@/]*))?@)?([^:/]+)(?::(\d+))?(\/[^/?#]*)?/);
if(!r) process.exit(1);
m.createConnection({host:r[3]||"localhost",port:r[4]?+r[4]:3306,user:r[1]||"root",password:r[2]||""})
  .then(c=>c.end()).catch(()=>process.exit(1));
'; do
  i=$((i+1))
  if [ "$i" -ge 60 ]; then echo "[entrypoint] MySQL not reachable after 60s, giving up"; exit 1; fi
  sleep 2
done
echo "[entrypoint] MySQL reachable. Ensuring db + schema + seed..."
node dist/scripts/create-db.js
npx prisma db push
node dist/prisma/seed.js
mkdir -p media/parts media/tmp
echo "[entrypoint] starting server (empty library, add songs via /admin)..."
exec node dist/src/index.js
