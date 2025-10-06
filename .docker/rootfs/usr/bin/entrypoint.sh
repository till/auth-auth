#!/bin/bash
set -e

if [ -z "${DATABASE_URL}" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

# run restore, unless the database is present
litestream restore \
  -config /etc/litestream.yml \
  -if-db-not-exists \
  -if-replica-exists \
  "${DATABASE_URL}"

if [ -f "${DATABASE_URL}" ]; then
  echo "Database is available"
else
  echo "Initialising the database in ${DATABASE_URL}"
  npm run db:generate
  npm run db:migrate
  echo "Done"
fi

exec litestream replicate \
  -config /etc/litestream.yml \
  -exec "npm run start"
