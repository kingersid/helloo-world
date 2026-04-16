# Quick Integration Guide

## With Claude Code (Easiest)

```bash
# Connect to your MCP server
cd /home/kinge/development/hello-world
claude mcp connect --path ./mcp-server.js
```

Then in conversation:
```
User: Show me April transactions
Assistant: Running April transactions query...

const result = await mcp.call('customers/transactions/april', {});
console.log(`Found ${result.result.length} transactions`);
```

## Direct API

```bash
# Deploy to Vercel first
vercel --prod

# Set database URL
vercel env add DATABASE_URL
```

```javascript
const response = await fetch('https://your-project.vercel.app', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'customers/transactions/april',
    params: {},
    id: 1
  })
});
const data = await response.json();
```

## Test First
```bash
node mcp-server.js
# Then test with:
curl -X POST http://localhost:8080 -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "method": "customers/transactions/april",
  "params": {},
  "id": 1
}'
```