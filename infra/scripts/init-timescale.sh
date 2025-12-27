#!/bin/bash
# Script to initialize TimescaleDB extension

set -e

# Wait for PostgreSQL to be ready
until psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - creating TimescaleDB extension"

# Create TimescaleDB extension
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS timescaledb;
EOSQL

>&2 echo "TimescaleDB extension created successfully"
