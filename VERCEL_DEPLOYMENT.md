# Deploying MCP Server to Vercel

## Overview
Deploy your MCP server to Vercel for easy access by AI agents. This guide covers the complete deployment process.

## Quick Deployment

### Step 1: Prepare Your Project

Ensure your project has:
- `mcp-server.js` - The MCP server (already created)
- `mcp-server-package.json` - Package configuration
- `vercel.json` - Vercel configuration (already created)

### Step 2: Deploy with Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project to Vercel
cd /home/kinge/development/hello-world
vercel link

# Deploy to production
vercel --prod
```

### Step 3: Set Database Environment Variable

After deployment, add your database URL:

```bash
# Interactive prompt
vercel env add DATABASE_URL

# Or set directly (replace with your actual connection string)
vercel env add DATABASE_URL --value "postgresql://user:password@host:port/database"
```

## Vercel Configuration

The `vercel.json` file configures:
- **Build System**: Uses `@vercel/node` for Node.js applications
- **Routing**: All requests route to `mcp-server.js`
- **Environment**: Sets NODE_ENV to production
- **File Inclusion**: Includes necessary server and package files

## How to Access Your MCP Server

After successful deployment, your MCP server will be available at:
```
https://your-project-name.vercel.app
```

All routes are handled by the MCP server:
- `POST /` - Main MCP endpoint
- `POST /customers/search` - Search customers
- `POST /customers/get` - Get customer details
- `POST /customers/transactions` - Get customer transactions
- `POST /customers/transactions/april` - Get April transactions
- `POST /customers/statistics` - Get statistics
- `POST /ping` - Health check

## Making API Calls

### Example: Query April Transactions

```bash
curl -X POST https://your-project-name.vercel.app/customers/transactions/april \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "customers/transactions/april",
    "params": {},
    "id": 1
  }'
```

### Example: Search Customers

```bash
curl -X POST https://your-project-name.vercel.app/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "customers/search",
    "params": {"query": "John", "limit": 10}
  }'
```

### Example: Get Customer Details

```bash
curl -X POST https://your-project-name.vercel.app/customers/get \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "customers/get",
    "params": {"id": 1}
  }'
```

## Important Considerations for Vercel

### 1. Database Connection Pooling

Vercel serverless functions have connection limits. The MCP server uses connection pooling to handle this:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Adjust based on your needs
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Best Practices:**
- Keep pool size reasonable (10-20 connections)
- Reuse connections across requests
- Close connections properly after use

### 2. Timeout Limits

Vercel has a 10-second timeout for HTTP functions:
- If queries take longer, optimize them
- Consider using database indexes
- For long-running operations, use a different deployment platform

### 3. Environment Variables

Store sensitive data as environment variables:
```bash
# Never commit credentials to git
DATABASE_URL=postgresql://user:password@host:port/db
```

### 4. SSL Connections

Use SSL for database connections in production:
```
DATABASE_URL=postgresql://user:pass@host:port/db?ssl=true
```

## Alternative Deployment Options

If Vercel doesn't meet your needs:

### Option 1: Railway (Already Configured)
Your project already has Railway setup:
```bash
railway up
```

### Option 2: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["node", "mcp-server.js"]
```

### Option 3: AWS Lambda
Use with API Gateway for serverless deployment.

## Monitoring & Maintenance

### Check Logs
```bash
# Vercel logs
vercel logs

# View deployment logs
vercel deployments --list
```

### Health Check
```bash
curl https://your-project-name.vercel.app/ping
```

## Troubleshooting

### Issue: Build Failures
**Solution:**
- Ensure `mcp-server.js` exists in root
- Check `mcp-server-package.json` is valid
- Verify Node.js version compatibility

### Issue: Database Connection Errors
**Solution:**
- Verify DATABASE_URL is set correctly
- Check database firewall rules
- Ensure connection pooling is configured

### Issue: Timeout Errors
**Solution:**
- Optimize slow queries
- Increase Vercel timeout (upgrade plan)
- Consider alternative deployment platform

### Issue: File Not Found
**Solution:**
- Ensure all files are committed to git
- Redeploy with `vercel --prod`
- Check file paths in configuration

## Next Steps

1. ✅ Deploy to Vercel using the steps above
2. ✅ Test the April transactions endpoint
3. ✅ Connect your AI agent to the deployed MCP server
4. ✅ Monitor performance and optimize as needed
5. ✅ Add authentication/authorization if needed for production use

## Security Notes

- Use HTTPS (automatic with Vercel)
- Store database credentials as environment variables
- Add authentication layer for production use
- Rate limit API calls if needed
- Monitor for unauthorized access attempts