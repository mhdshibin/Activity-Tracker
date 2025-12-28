#!/usr/bin/env bash
set -euo pipefail

# Adjust if your migrations are elsewhere
MIGRATIONS_DIR="supabase/migrations"

# Remote DB connection string; set this or export SUPABASE_DB_URL before running.
# Example: export SUPABASE_DB_URL="postgres://postgres:password@db.host:5432/postgres"
DB_URL="${SUPABASE_DB_URL:-}"

# If you want the script to execute the INSERTs automatically set EXECUTE=true
# Otherwise it will print the SQL to stdout for manual review.
EXECUTE=${EXECUTE:-false}

# 1) Collect local migration versions (filenames without extension)
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

# Find files (non-recursive). Adjust glob if you use nested folders.
mapfile -t files < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -printf "%f\n" | sort)

if [ ${#files[@]} -eq 0 ]; then
  echo "No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

versions=()
for f in "${files[@]}"; do
  # remove extension(s) - handles .sql or .up.sql etc.
  name="${f%%.*}"
  versions+=("$name")
done

# 2) Prepare SQL: only insert versions not already present
# We'll generate INSERT ... SELECT ... WHERE NOT EXISTS for safety.
sql_statements=()
for v in "${versions[@]}"; do
  # Escape single quotes if present
  esc_v="${v//\'/''}"
  sql_statements+=("INSERT INTO supabase_migrations.schema_migrations (version) SELECT '${esc_v}' WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '${esc_v}');")
done

# Combine into one SQL script
sql_script="$(printf "%s\n" "${sql_statements[@]}")"

if [ "$EXECUTE" = "true" ]; then
  if [ -z "$DB_URL" ]; then
    echo "DB_URL is empty. Please set SUPABASE_DB_URL environment variable or set DB_URL in the script."
    exit 1
  fi

  echo "Executing SQL to mark ${#versions[@]} migrations as applied..."
  # Use psql to execute; require libpq (psql) installed locally.
  PGPASSWORD="${DB_URL#*:*@}" # not used — we rely on full URL via psql connection param
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -c "$sql_script"
  echo "Done. Remote supabase_migrations.schema_migrations updated."
else
  echo "--- Generated SQL (review before executing) ---"
  echo "$sql_script"
  echo
  echo "To execute these statements automatically:"
  echo "  export SUPABASE_DB_URL=\"postgres://user:pass@host:port/dbname\""
  echo "  EXECUTE=true ./mark_migrations.sh"
fi