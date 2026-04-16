# MCP Server for Hello World Billing System

## Overview
This MCP (Model Context Protocol) server provides database access capabilities for AI agents to query the billing system's PostgreSQL database.

## Features
- **Customer Search**: Search customers by name or mobile number
- **Customer Details**: Get detailed information about specific customers
- **Transaction History**: View customer transaction history
- **April Transactions**: Pull out all transactions from April
- **Statistics**: Get customer statistics including top customers and spending patterns
- **Health Check**: Ping endpoint to verify server status

## Setup

### Prerequisites
- Node.js (v14+)
- PostgreSQL database with the billing system schema
- Environment variables configured

### Installation

1. Install dependencies:
```bash
cd /home/kinge/development/hello-world
npm install --prefix mcp-server-package.json
```

Note: The MCP server uses the existing project's node_modules.

## Usage

### Starting the Server

```bash
# Start the MCP server
node mcp-server.js

# Or with custom port
MCP_PORT=8081 node mcp-server.js
```

The server will start on port 8080 by default (configurable via MCP_PORT environment variable).

### Connecting with AI Agents

The MCP server uses stdio protocol. You can connect to it using MCP-compatible clients.

#### Example with Claude Code:

```bash
# Using Claude's MCP client
claude mcp connect --path ./mcp-server.js
```

## Available Methods

### 1. customers/search
Search for customers by name or mobile number.

**Parameters:**
- `query` (string, required): Search query (name or mobile)
- `limit` (number, optional): Maximum results, default 10

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "customers/search",
  "params": {
    "query": "John",
    "limit": 5
  },
  "id": 1
}
```

### 2. customers/get
Get customer details by ID.

**Parameters:**
- `id` (number, required): Customer ID

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "customers/get",
  "params": {
    "id": 123
  },
  "id": 2
}
```

### 3. customers/transactions
Get all transactions for a specific customer.

**Parameters:**
- `customerId` (number, required): Customer ID

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "customers/transactions",
  "params": {
    "customerId": 123
  },
  "id": 3
}
```

### 4. customers/transactions/april
Get all transactions from April (specialized for your requirement).

**Parameters:**
- None

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "customers/transactions/april",
  "params": {},
  "id": 4
}
```

### 5. customers/statistics
Get customer statistics including top spenders.

**Parameters:**
- None

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "customers/statistics",
  "params": {},
  "id": 5
}
```

### 6. ping
Health check endpoint.

**Parameters:**
- None

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "ping",
  "params": {},
  "id": 6
}
```

## Database Schema

The server queries the following tables:

### customers
- `id` (SERIAL PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `mobile` (TEXT)

### bills
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

## Integration Examples

### Using with Claude Code

1. Start the MCP server:
```bash
cd /home/kinge/development/hello-world
node mcp-server.js &
```

2. In your AI agent, call the methods:

```javascript
// Search for customers who transacted in April
const aprilCustomers = await mcp.call('customers/transactions/april');

// Get statistics of top customers
const stats = await mcp.call('customers/statistics');

// Search for a specific customer
const customers = await mcp.call('customers/search', {
  query: 'John Doe',
  limit: 5
});
```

## Security Considerations

- The server uses parameterized queries to prevent SQL injection
- Database credentials are loaded from environment variables
- SSL is automatically configured for production environments
- The server runs in a separate process from your main application

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `MCP_PORT`: Port for MCP server (default: 8080)
- `NODE_ENV`: Environment mode (development/production)

## Error Handling

The server provides detailed error messages with proper JSON-RPC error codes:
- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32000`: Application-specific errors

## Troubleshooting

1. **Connection issues**: Verify DATABASE_URL is set correctly
2. **Port conflicts**: Change MCP_PORT to an available port
3. **SSL errors**: Set NODE_ENV=development for local connections
4. **Query errors**: Check database schema matches the queries

## Next Steps

To integrate this with your existing system:
1. Start the MCP server alongside your main application
2. Configure your AI agent to connect to the MCP server
3. Test the available methods
4. Add additional methods as needed for your use case