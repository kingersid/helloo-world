# Claude MCP Server Setup Guide

## Quick Start (3 Steps)

### Step 1: Deploy to Vercel
```bash
cd /home/kinge/development/hello-world
vercel login
vercel link
vercel --prod
vercel env add DATABASE_URL
```

### Step 2: Connect Claude Code
```bash
cd /home/kinge/development/hello-world
claude mcp connect --path ./mcp-server.js
```

### Step 3: Use in Conversations
```
User: Analyze April sales
Assistant: Running query...
const result = await mcp.call('customers/transactions/april', {});
```

## Connection Methods

### Method 1: Claude Code (Recommended)
```bash
claude mcp connect --path ./mcp-server.js
```

### Method 2: Direct API
```javascript
fetch('https://your-project.vercel.app', {
  method: 'POST',
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'customers/transactions/april',
    params: {},
    id: 1
  })
})
```

## Available Methods

- `customers/search` - Search customers
- `customers/get` - Get customer details  
- `customers/transactions` - Get all transactions
- `customers/transactions/april` ⭐ - April transactions
- `customers/statistics` - Customer statistics
- `ping` - Health check

## Test Endpoint
```bash
curl -X POST https://your-project.vercel.app -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "method": "customers/transactions/april",
  "params": {},
  "id": 1
}'
```
