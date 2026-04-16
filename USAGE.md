# MCP Server Usage Guide

## Quick Start

### 1. Start the MCP Server
```bash
cd /home/kinge/development/hello-world
node mcp-server.js
```

The server will start on port 8080 and display available methods.

### 2. Connect with Your AI Agent

**For Claude Code:**
```bash
claude mcp connect --path ./mcp-server.js
```

**For other MCP clients:**
Connect to the server using stdio protocol on port 8080.

## Querying April Transactions (Your Main Requirement)

To pull customers who have transacted in April:

### Method 1: Direct API Call
```bash
# Use curl to call the MCP method
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "customers/transactions/april",
    "params": {},
    "id": 1
  }'
```

### Method 2: Via MCP Client
```javascript
const aprilTransactions = await mcp.call('customers/transactions/april');
console.log(`Found ${aprilTransactions.result.length} April transactions`);

// Process the results
aprilTransactions.result.forEach(tx => {
  console.log(`Customer: ${tx.customer_name}`);
  console.log(`Bill #: ${tx.bill_no}`);
  console.log(`Amount: ₹${tx.grand_total}`);
  console.log(`Date: ${tx.bill_date}`);
  console.log('---');
});
```

## Available Methods

### Search Customers
```javascript
// Search by name or mobile
const results = await mcp.call('customers/search', {
  query: 'John',
  limit: 10
});
```

### Get Customer Details
```javascript
const customer = await mcp.call('customers/get', {
  id: 123
});
```

### Get Customer Transactions
```javascript
const transactions = await mcp.call('customers/transactions', {
  customerId: 123
});
```

### Get Customer Statistics
```javascript
const stats = await mcp.call('customers/statistics', {});
// Returns top 10 customers by spending
```

### Health Check
```javascript
const status = await mcp.call('ping', {});
```

## Response Format

All methods return JSON-RPC 2.0 responses:

```json
{
  "jsonrpc": "2.0",
  "result": [...],
  "id": 1
}
```

## Error Handling

Errors are returned with proper JSON-RPC error codes:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found"
  },
  "id": 1
}
```

## Integration Examples

### Node.js Application
```javascript
const { Pool } = require('pg');

// Call MCP server methods
async function getAprilCustomers() {
  const response = await fetch('http://localhost:8080', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'customers/transactions/april',
      params: {},
      id: 1
    })
  });
  
  const data = await response.json();
  return data.result;
}
```

### Python Application
```python
import requests

response = requests.post('http://localhost:8080', 
    json={
        'jsonrpc': '2.0',
        'method': 'customers/transactions/april',
        'params': {},
        'id': 1
    })

data = response.json()
april_customers = data['result']
```

## Database Schema Reference

### customers table
- `id` (SERIAL PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `mobile` (TEXT)

### bills table
- `id` (SERIAL PRIMARY KEY)
- `transaction_id` (UUID)
- `bill_no` (TEXT)
- `customer_id` (INTEGER REFERENCES customers)
- `article_name` (TEXT NOT NULL)
- `pieces` (INTEGER NOT NULL)
- `amount_per_piece` (DECIMAL)
- `total` (DECIMAL)
- `grand_total` (DECIMAL)
- `bill_date` (TIMESTAMP)

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL is set in .env
- Check that port 8080 is not in use
- Ensure PostgreSQL is running

### Query Errors
- All queries use parameterized statements (SQL injection safe)
- Check database schema matches expected structure
- Review server logs for detailed error messages

### Performance
- Connection pooling is enabled
- Each method call opens/closes connections efficiently
- Suitable for production use

## Security Notes

1. **Database Credentials**: Stored in .env file
2. **SQL Injection Protection**: All queries are parameterized
3. **Production SSL**: Automatically configured
4. **Access Control**: Add authentication layer as needed for your use case

## Next Steps

1. Start the server: `node mcp-server.js`
2. Test the April transactions method
3. Integrate with your AI agent
4. Add custom methods as needed