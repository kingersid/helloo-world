# Railway CLI Deployment & Configuration Guide

This guide provides technical specifications and workflows for using the Railway CLI.

## Core Commands

### Service Management
- `railway status`: Shows the current linked project and service.
- `railway service link`: Interactively links a service to the current directory.
- `railway link`: Links a project to the current directory.

### Environment & Variables
- `railway variables`: Lists environment variables for the current service.
- `railway variables --json`: Returns variables in JSON format (ideal for parsing).
- `railway run <command>`: Executes a command locally using the service's environment variables.
  - Example: `railway run npm start`

### Deployment
- `railway up`: Deploys the current directory to the linked service.
- `railway up --service <name>`: Deploys to a specific service.
- `railway redeploy --service <name> --yes`: Restarts a service without a new build.

### Debugging & Logs
- `railway logs`: Streams logs for the linked service.
- `railway logs --service <name> --lines <number>`: Fetches a specific number of historical logs.
- `railway connect <database-name>`: Opens an interactive shell for the specified database service.

## Critical Configuration

### Networking
- Applications must listen on `process.env.PORT`.
- Avoid port `5432` for web services (reserved for Postgres).
- Check `Public Domain` settings in the dashboard to ensure the target port matches the internal port.

### Database Connectivity
- **Internal:** Use `DATABASE_URL` (e.g., `postgres.railway.internal`). Disable SSL if needed.
- **External/Local:** Use `DATABASE_PUBLIC_URL` for local development. Use `ssl: { rejectUnauthorized: false }`.
- **Linking:** Prefer `${{Service.VARIABLE}}` syntax for dynamic variable syncing between services.

## Common Workflows

### 1. Verification Before Deployment
Before running `railway up`, verify:
1. `railway status` confirms the correct service is linked.
2. `railway variables` contains all required keys.
3. No database-specific ports (like 5432) are hardcoded for web traffic.

### 2. Troubleshooting Connection Errors
1. Check `railway logs` for `ECONNREFUSED` or timeout errors.
2. Confirm if the app is using Internal vs Public URLs correctly based on its environment.
3. Verify SSL settings match the connection type (Internal = No SSL/Self-signed, Public = Required).
