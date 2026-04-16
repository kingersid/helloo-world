# Deploy MCP Server to Vercel

## Quick Deployment

### Option 1: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
cd /home/kinge/development/hello-world
vercel link

# Deploy to production
vercel --prod
```

### Option 2: Using GitHub Integration

1. Push your code to GitHub:
```bash
git add .
git commit -m "Add MCP server for database access"
git push origin main
```

2. Import the project on [vercel.com](https://vercel.com) from your GitHub repository

3. Vercel will automatically detect the `vercel.json` configuration

## Environment Variables

After deployment, set your database URL:

```bash
# Using Vercel CLI
vercel env add DATABASE_URL

# Or through the Vercel Dashboard
# Settings → Environment Variables
```

Enter your PostgreSQL connection string (e.g., `postgresql://user:pass@host:port/db`)

## How It Works

The `vercel.json` configuration:
- Uses `@vercel/node` as the build system
- Routes all requests to `mcp-server.js`
- Sets NODE_ENV to production
- Includes necessary files for the MCP server

## Access Your MCP Server

After deployment, your MCP server will be available at:
```
https://your-project-name.vercel.app
```

## API Endpoints

All requests are routed to the MCP server:

- `POST /` - MCP server endpoint
- `POST /customers/search` - Search customers
- `POST /customers/get` - Get customer details
- `POST /customers/transactions` - Get transactions
- `POST /customers/transactions/april` - Get April transactions
- `POST /customers/statistics` - Get statistics
- `POST /ping` - Health check

## Important Notes

### 1. Database Connection
Vercel serverless functions have connection limits. Use connection pooling:
- The MCP server uses a connection pool (Pool from 'pg')
- Connections are reused across requests
- Set appropriate pool size in `mcp-server.js` if needed

### 2. Timeout Limits
- Vercel HTTP functions: 10 seconds timeout
- If your queries take longer, consider:
  - Optimizing queries
  - Using Vercel's Edge Functions
  - Setting up a separate worker service

### 3. File Size
Vercel has deployment size limits. The MCP server (~5.6KB) is well within limits.

### 4. Testing Locally
Test before deploying:
```bash
node mcp-server.js
# Test with curl
curl -X POST http://localhost:8080 -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "method": "customers/transactions/april",
  "params": {},
  "id": 1
}'
```

### 5. SSL/TLS
Vercel provides automatic HTTPS. Your database connection should also use SSL:
```
DATABASE_URL=postgresql://user:pass@host:port/db?ssl=true
```

## Troubleshooting

### Build Failures
- Ensure `mcp-server.js` exists in the root
- Check that `node_modules` is in `.gitignore` (dependencies will be installed by Vercel)
- Verify `package.json` has correct dependencies

### Runtime Errors
- Check Vercel logs: Dashboard → your project → Logs
- Verify DATABASE_URL is set correctly
- Test the query manually first

### Connection Issues
- Use Vercel's internal PostgreSQL add-on if available
- Configure database firewall to allow Vercel IPs
- Consider using a connection proxy like pgbouncer

## Alternative: Deploy as Standalone Service

If Vercel serverless limits are restrictive:

1. Deploy to Railway (already configured in your project)
2. Use a VPS (DigitalOcean, Linode)
3. Use AWS Lambda with API Gateway
4. Use Docker container on any cloud provider

## Next Steps

1. Deploy to Vercel using the steps above
2. Test the April transactions endpoint
3. Connect your AI agent to the deployed MCP server
4. Monitor performance and adjust as needed