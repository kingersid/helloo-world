#!/bin/bash
# Fetch connection variables from the Postgres service
echo "Fetching Railway environment variables..."
VARS=$(railway variables --service Postgres-kGpr --json)

# Extract the public URL using node (robust across environments)
DB_URL=$(echo "$VARS" | node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync(0)); console.log(data.DATABASE_PUBLIC_URL || data.DATABASE_URL)")

if [ -z "$DB_URL" ] || [ "$DB_URL" == "undefined" ]; then
    echo "Error: Could not retrieve connection URL from Railway."
    exit 1
fi

export DATABASE_URL="$DB_URL"
export PORT=3000

echo "Starting local dev server on port $PORT..."
echo "Connecting to DB: ${DATABASE_URL:0:30}..."

# Start the server
node server.js
