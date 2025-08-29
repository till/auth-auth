#!/bin/bash
set -e

DB=/app/auth.db

if [ -f "${DB}" ]; then
  echo "Database already exists, skipping restore"
else
  echo "No database found, restoring from replica if exists"
  litestream restore -v -if-replica-exists -o "${DB}" "${REPLICA_URL}"

  if [ -f "${DB}" ]; then
    echo "Database was restored"
  else
    echo "Initialising database"
    npm run db:generate
    npm run db:migrate
    echo "Done"
  fi
fi

exec litestream replicate -exec "npm run start"
