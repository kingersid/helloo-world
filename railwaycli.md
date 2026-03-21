# Railway CLI Deployment Checklist

Follow this checklist to ensure smooth deployments and avoid common pitfalls like service overwriting and connection timeouts.

## 1. Service Identification & Linking
- [ ] Run `railway status` to verify which service is currently linked to your local directory.
- [ ] Use `railway service link <service-id>` if you have multiple services (e.g., App and Database).
- [ ] Confirm your code is **NOT** being uploaded to a database service (check the service name in the `railway up` output).

## 2. Port & Environment Configuration
- [ ] Ensure your application listens on `process.env.PORT || 3000`.
- [ ] Verify that your web service is **NOT** using port `5432` (reserved for Postgres).
- [ ] In the Railway Dashboard, check that the `Public Domain` target port matches your app's internal port.

## 3. Database Connectivity
- [ ] **Internal Traffic:** Use the internal `DATABASE_URL` (e.g., `postgres.railway.internal`).
- [ ] **External/Local:** Use `DATABASE_PUBLIC_URL` only for local debugging or `psql` queries.
- [ ] **SSL Settings:** 
    - Internal: Disable SSL if connection errors occur.
    - External: Use `ssl: { rejectUnauthorized: false }` for secure handshakes.
- [ ] **Dynamic Linking:** Use the `${{Service.VARIABLE}}` syntax in the dashboard to sync variables between services automatically.

## 4. Local Development & Debugging
- [ ] Use `railway run npm start` to run your app locally using production environment variables.
- [ ] Use `railway variables --json` to quickly audit active connection strings.
- [ ] Use `railway logs --service <name> --lines 100` to isolate errors between the app and the database.
- [ ] Use `railway connect <database-name>` to test SQL queries directly in the CLI.

## 5. Deployment Commands
- [ ] `railway up`: Deploy current directory to the linked service.
- [ ] `railway up --service <name>`: Explicitly target a service for deployment.
- [ ] `railway redeploy --service <name> --yes`: Restart a service without uploading new code.
