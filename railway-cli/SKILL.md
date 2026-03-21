---
name: railway-cli
description: Manage Railway deployments, service configurations, and environment variables. Use when you need to deploy, debug, or configure services on Railway using the command line interface.
---

# Railway CLI

## Overview

This skill provides specialized workflows and technical guidance for managing Railway services, deployments, and databases. It ensures consistent deployment patterns and helps avoid common configuration errors like incorrect port mapping or SSL mismatches.

## Workflow Decision Tree

### 1. I need to deploy a service
- Is the service already linked? Run `railway status`.
- If not linked, run `railway service link`.
- Ready to deploy? Run `railway up`.
- Need to target a specific service? Run `railway up --service <name>`.

### 2. My app is failing to start or connect
- Check logs: `railway logs --lines 100`.
- Verify environment variables: `railway variables --json`.
- Test locally with remote variables: `railway run npm start`.
- See [guide.md](references/guide.md) for **Troubleshooting Connection Errors**.

### 3. I need to manage databases
- Test SQL connection: `railway connect <database-name>`.
- Audit connection strings: `railway variables --json`.
- See [guide.md](references/guide.md) for **Database Connectivity** specs.

## Quick Start

### Verification Command
Run this before any major deployment to ensure your local environment is correctly mapped:
```bash
railway status && railway variables --json
```

### Deployment Pattern
Always specify the service name if working in a multi-service project to avoid accidental overwrites:
```bash
railway up --service my-web-app
```

## Resources

Detailed technical specifications, port configurations, and SSL settings are located in [guide.md](references/guide.md).
