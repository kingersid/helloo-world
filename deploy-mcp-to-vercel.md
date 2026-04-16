# Deploying MCP Server to Vercel

## Prerequisites

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

## Deployment Steps

### 1. Link Project to Vercel
```bash
cd /home/kinge/development/hello-world
vercel link
```

### 2. Deploy to Vercel
```bash
vercel --prod
```

### 3. Set Environment Variables
After deployment, set your database URL:
```bash
vercel env add DATABASE_URL
```

Enter your PostgreSQL connection string when prompted.

## Configuration

The `vercel.json` is configured to:
- Use `@vercel/node` as the build system
- Route all requests to `mcp-server.js`
- Include necessary documentation files

## Access Your MCP Server

After deployment, your MCP server will be available at:
```
https://your-project-name.vercel.app
```

## Example API Calls

### Query April Transactions
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

### Search Customers
```bash
curl -X POST https://your-project-name.vercel.app/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "customers/search",
    "params": {"query": "John"}
  }'
```

## Notes

- The MCP server runs as a single process on Vercel
- Vercel's serverless functions have timeout limits (10 seconds for HTTP functions)
- For long-running queries, consider using Vercel's Edge Functions or setting up a separate worker
- Database connections should be pooled to avoid connection limits
- The existing `server.js` billing API will continue to work alongside the MCP server