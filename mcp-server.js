#!/usr/bin/env node
/**
 * MCP Server for Hello World Billing System
 * Provides database access capabilities for AI agents to query customer data
 */

const { Server } = require('net');
const { parse } = require('path');
const { Pool } = require('pg');

// Read environment variables
require('dotenv').config();

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

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
        case 'customers/search':
          return {
            jsonrpc: '2.0',
            result: await this.searchCustomers(params),
            id
          };
        case 'customers/get':
          return {
            jsonrpc: '2.0',
            result: await this.getCustomer(params),
            id
          };
        case 'customers/transactions':
          return {
            jsonrpc: '2.0',
            result: await this.getCustomerTransactions(params),
            id
          };
        case 'customers/transactions/april':
          return {
            jsonrpc: '2.0',
            result: await this.getAprilTransactions(),
            id
          };
        case 'customers/statistics':
          return {
            jsonrpc: '2.0',
            result: await this.getCustomerStatistics(),
            id
          };
        case 'ping':
          return {
            jsonrpc: '2.0',
            result: { status: 'ok', timestamp: new Date().toISOString() },
            id
          };
        case 'bills/count':
          return {
            jsonrpc: '2.0',
            result: await this.getBillCount(),
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

  async searchCustomers(params) {
    const { query, limit = 10 } = params;
    const result = await pool.query(
      `SELECT id, name, mobile FROM customers
       WHERE name ILIKE $1 OR mobile ILIKE $1
       ORDER BY name ASC
       LIMIT $2`,
      [`%${query}%`, limit]
    );
    return result.rows;
  }

  async getCustomer(params) {
    const { id } = params;
    const result = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error(`Customer with id ${id} not found`);
    }

    return result.rows[0];
  }

  async getCustomerTransactions(params) {
    const { customerId } = params;
    const result = await pool.query(
      `SELECT b.*, c.name as customer_name
       FROM bills b
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE b.customer_id = $1
       ORDER BY b.bill_date DESC`,
      [customerId]
    );
    return result.rows;
  }

  async getAprilTransactions() {
    const result = await pool.query(
      `SELECT b.*, c.name as customer_name
       FROM bills b
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE EXTRACT(MONTH FROM b.bill_date) = 4
       ORDER BY b.bill_date DESC`
    );
    return result.rows;
  }

  async getBillCount() {
    const result = await pool.query('SELECT COUNT(*) as total_bills FROM bills');
    return { total_bills: parseInt(result.rows[0].total_bills) };
  }

  async getAllBills() {
    const result = await pool.query(`
      SELECT b.transaction_id::TEXT as transaction_id, b.bill_no, b.bill_date, b.grand_total,
             COALESCE(c.name, 'Walk-in') as customer_name, c.mobile,
             SUM(b.pieces) as total_pieces
      FROM bills b
      LEFT JOIN customers c ON b.customer_id = c.id
      GROUP BY b.transaction_id, b.bill_no, b.bill_date, b.grand_total, c.name, c.mobile
      ORDER BY CASE WHEN b.bill_no ~ '^[0-9]+$' THEN CAST(b.bill_no AS INTEGER) ELSE 0 END DESC
    `);
    return result.rows;
  }

  async getCustomerStatistics() {
    const result = await pool.query(`
      WITH customer_stats AS (
        SELECT
          c.id,
          c.name,
          c.mobile,
          COUNT(DISTINCT b.transaction_id) as total_transactions,
          COALESCE(SUM(b.grand_total), 0) as total_spent,
          MAX(b.bill_date) as last_transaction_date
        FROM customers c
        LEFT JOIN bills b ON c.id = b.customer_id
        GROUP BY c.id, c.name, c.mobile
      )
      SELECT
        cs.*,
        (cs.total_spent / NULLIF(cs.total_transactions, 0)) as avg_transaction_value
      FROM customer_stats cs
      ORDER BY cs.total_spent DESC
      LIMIT 10
    `);
    return result.rows;
  }

  start(port = 8080) {
    this.server.listen(port, () => {
      console.log(`MCP Server listening on port ${port}`);
      console.log('Available methods:');
      console.log('  - customers/search: Search customers by name or mobile');
      console.log('  - customers/get: Get customer details by ID');
      console.log('  - customers/transactions: Get customer transactions');
      console.log('  - customers/transactions/april: Get April transactions');
      console.log('  - customers/statistics: Get customer statistics');
      console.log('  - bills/count: Get total bill count');
      console.log('  - bills/get-all: Get all bills');
      console.log('  - ping: Health check');
    });
  }
}

// Start the server
if (require.main === module) {
  const port = process.env.MCP_PORT || 8080;
  const server = new BillingMCPServer();
  server.start(port);
}

module.exports = BillingMCPServer;