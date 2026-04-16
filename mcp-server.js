#!/usr/bin/env node
/**
 * MCP Server for Hello World Billing System
 * Removed MCP server functionality - keeping only billing API
 */

const { Server } = require('net');
const { parse } = require('path');
const { Pool } = require('pg');

// Read environment variables
require('dotenv').config();

let pool;

// Database connection pool - only create when needed
const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
};

// MCP Server implementation using stdio protocol
class BillingMCPServer {
  constructor() {
    this.server = new Server();
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.on('connection', (socket) => {
      console.log('MCP client connected');

      socket.on('data', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          const response = await this.handleRequest(message);
          socket.write(JSON.stringify(response) + '\n');
        } catch (error) {
          socket.write(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error',
              data: error.message
            },
            id: null
          }) + '\n');
        }
      });

      socket.on('error', (err) => {
        console.error('Socket error:', err);
      });
    });
  }

  async handleRequest(request) {
    const { jsonrpc, method, params, id } = request;

    console.log(`MCP Request: ${method}`, params);

    try {
      switch (method) {
        case 'ping':
          return {
            jsonrpc: '2.0',
            result: { status: 'ok', timestamp: new Date().toISOString() },
            id
          };
        default:
          throw new Error(`Method not found: ${method}`);
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: error.message,
          data: error.stack
        },
        id
      };
    }
  }

  start(port = 8080) {
    this.server.listen(port, () => {
      console.log(`MCP Server listening on port ${port}`);
      console.log('Available methods:');
      console.log('  - ping: Health check');
    });
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  if (pool) {
    pool.end();
  }
});

// Start the server
if (require.main === module) {
  const port = process.env.MCP_PORT || 8080;
  const server = new BillingMCPServer();
  server.start(port);
}

module.exports = BillingMCPServer;