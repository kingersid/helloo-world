# Claude.ai Integration with MCP Server

## Overview
Learn how to connect Claude.ai (or Claude Code) to your MCP server running on Vercel.

## Prerequisites

1. **MCP Server Deployed** - Your MCP server must be deployed and accessible via HTTPS
2. **Database Connection** - Set `DATABASE_URL` environment variable in Vercel
3. **Claude.ai Access** - You need access to Claude.ai or Claude Code

## Connection Methods

### Method 1: Using Claude Code (Recommended)

Claude Code is the easiest way to integrate with your MCP server.

#### Step 1: Start Local Connection
```bash
# Navigate to your project
cd /home/kinge/development/hello-world

# Connect Claude Code to your MCP server
claude mcp connect --path ./mcp-server.js
```

#### Step 2: Query Your Database
```javascript
// In your conversation with Claude

User: Show me all customers who transacted in April
Assistant: Let me query that for you...

// Claude will automatically call the MCP server
const aprilCustomers = await mcp.call('customers/transactions/april');

console.log(`Found ${aprilCustomers.result.length} transactions`);
aprilCustomers.result.forEach(tx => {
  console.log(`${tx.customer_name}: ₹${tx.grand_total}`);
});
```

### Method 2: Direct API Integration

If you're building a custom Claude integration or using Claude's API directly:

#### Step 1: Get Your Server URL
After Vercel deployment, your server is at:
```
https://your-project-name.vercel.app
```

#### Step 2: Make API Calls

```javascript
// Using fetch (Node.js or browser)
async function callMcpServer(method, params) {
  const response = await fetch('https://your-project-name.vercel.app', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: Date.now()
    })
  });
  
  const data = await response.json();
  return data.result;
}

// Query April transactions
const aprilTransactions = await callMcpServer('customers/transactions/april', {});
console.log(aprilTransactions);

// Search customers
const customers = await callMcpServer('customers/search', {
  query: 'John',
  limit: 10
});
console.log(customers);
```

#### Step 3: Use with Claude's API

```javascript
// If using Claude's REST API
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Include MCP server info in your prompts
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  messages: [
    {
      role: 'user',
      content: `I need customer data from our billing system.
      
      You have access to our MCP server at https://your-project.vercel.app
      which provides these methods:
      - customers/search: Search customers
      - customers/transactions/april: Get April transactions
      - customers/statistics: Get statistics
      
      Please help me analyze our April sales.`
    }
  ]
});
```

## Claude Code Features

When connected via Claude Code, you get:

### 1. Automatic Method Discovery
Claude automatically knows available methods from your MCP server documentation.

### 2. Smart Parameter Completion
```javascript
// Start typing...
const result = await mcp.call('customers/', {
  // Claude suggests: query, limit
});
```

### 3. Error Handling
Claude helps debug connection issues and suggests fixes.

### 4. Context Management
Claude remembers your MCP server connection across conversations.

## Integration Examples

### Example 1: April Sales Report
```javascript
// Claude Code conversation
User: Generate April sales report
Assistant: Running April transactions query...

const result = await mcp.call('customers/transactions/april', {});

// Process results
const report = {
  totalTransactions: result.length,
  totalRevenue: result.reduce((sum, tx) => sum + parseFloat(tx.grand_total), 0),
  uniqueCustomers: [...new Set(result.map(tx => tx.customer_name))].length,
  topCustomers: [...new Set(result.map(tx => tx.customer_name))]
    .map(name => ({
      name,
      count: result.filter(tx => tx.customer_name === name).length
    }))
    .sort((a, b) => b.count - a.count)
};

console.log('April Sales Report:', report);
```

### Example 2: Customer Analysis
```javascript
// Multiple MCP calls in sequence
const searchResults = await mcp.call('customers/search', {
  query: 'Premium',
  limit: 5
});

const customerIds = searchResults.result.map(c => c.id);
const transactions = [];

for (const id of customerIds) {
  const tx = await mcp.call('customers/transactions', {
    customerId: id
  });
  transactions.push(...tx.result);
}
```

### Example 3: Statistics Dashboard
```javascript
// Get statistics
const stats = await mcp.call('customers/statistics', {});

// Get April data
const april = await mcp.call('customers/transactions/april', {});

console.log('Dashboard:');
console.log('Top Customer:', stats.result[0].name);
console.log('April Revenue:', april.reduce((s, tx) => s + parseFloat(tx.grand_total), 0));
```

## Authentication

### Option 1: Environment Variables (Recommended)
```bash
# In your Vercel dashboard
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Option 2: Connection String in Code
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

## Troubleshooting

### Connection Issues
```bash
# Test locally first
node mcp-server.js

# Then connect
claude mcp connect --path ./mcp-server.js
```

### Test Your Connection
```javascript
// Simple ping test
const result = await mcp.call('ping', {});
console.log(result.result); // Should return { status: 'ok', timestamp: '...' }
```

## Best Practices

1. **Test Locally First**: Run `node mcp-server.js` and test with curl before deploying
2. **Use Environment Variables**: Never hardcode database credentials
3. **Error Handling**: Always wrap MCP calls in try-catch
4. **Rate Limiting**: Implement client-side rate limiting if needed
5. **Logging**: Add logging to both server and client code

## Claude Code Commands

When connected, use these commands in your conversation:

```
# List available methods
@mcp list methods

# Get method details
@mcp describe customers/search

# Execute method with parameters
@mcp call customers/search {"query": "John", "limit": 10}

# View server logs
@mcp logs
```

## Integration Checklist

- [ ] Deploy MCP server to Vercel
- [ ] Set DATABASE_URL in Vercel dashboard
- [ ] Test locally with `node mcp-server.js`
- [ ] Deploy with `vercel --prod`
- [ ] Connect Claude Code with `claude mcp connect`
- [ ] Test API calls
- [ ] Add error handling
- [ ] Monitor logs