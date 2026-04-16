#!/bin/bash
# Start MCP Server for Billing System
# This script starts the MCP server for AI agent database access

set -e

echo "🚀 Starting MCP Server for Billing System..."

# Navigate to project directory
cd "$(dirname "$0")"

# Check if node_modules exists, install if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "⚠️  Installing dependencies..."
    npm install
fi

# Start the MCP server
echo "📡 MCP Server starting on port 8080..."
echo "📋 Available endpoints:"
echo "   - customers/search"
echo "   - customers/get"
echo "   - customers/transactions"
echo "   - customers/transactions/april"
echo "   - customers/statistics"
echo "   - ping"
echo ""
echo "💡 To connect with Claude Code:"
echo "   claude mcp connect --path ./mcp-server.js"
echo ""

node mcp-server.js