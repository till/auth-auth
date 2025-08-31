#!/bin/bash
set -e

DB=/app/auth.db

# run restore, unless the database is present
litestream restore -v \
  -if-db-not-exists \
  -if-replica-exists \
  -o "${DB}" \
  "${REPLICA_URL}"

if [ -f "${DB}" ]; then
  echo "Database is available"
else
  echo "Initialising the database in ${DB}"
  npm run db:generate
  npm run db:migrate
  echo "Done"
fi

exec litestream replicate -exec "npm run start"
