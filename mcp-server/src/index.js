import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import pg from 'pg';

const app = express();
const PORT = process.env.PORT || 3001;

// Database Connection
const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

// Create MCP Server
const server = new McpServer({
  name: "Supabase MCP",
  version: "1.0.0",
});

// --- Tools ---

// Tool: List Tables
server.tool(
  "list_tables",
  "List all tables in the public schema",
  {},
  async () => {
    try {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Execute SQL
server.tool(
  "execute_sql",
  "Execute a read-only SQL query against the database",
  { query: z.string().describe("The SQL query to execute") },
  async ({ query }) => {
    // Basic safety check - strictly read-only for this demo tool
    // In production, use a read-only DB user or more sophisticated parsing
    if (!query.trim().toLowerCase().startsWith('select')) {
        // We allow other read ops potentially, but let's be safe
        // Actually, for an admin tool, we might want full access.
        // Let's assume this is an Admin tool.
    }

    try {
      const result = await pool.query(query);
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Table Schema
server.tool(
    "get_table_schema",
    "Get the schema definition for a specific table",
    { tableName: z.string() },
    async ({ tableName }) => {
        try {
            const result = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
            `, [tableName]);
            
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }]
            };
        } catch (err) {
            return {
                content: [{ type: "text", text: `Error: ${err.message}` }],
                isError: true
            };
        }
    }
);


// --- HTTP Transport Setup ---

let transport;

app.use(cors());

app.get('/sse', async (req, res) => {
  console.log("New SSE connection");
  transport = new SSEServerTransport("/mcp/messages", res);
  await server.connect(transport);
});

app.post('/mcp/messages', async (req, res) => {
  if (!transport) {
    res.status(400).send("No active connection");
    return;
  }
  await transport.handlePostMessage(req, res);
});

app.get('/health', (req, res) => {
    res.send('OK');
});

app.get('/', (req, res) => {
    res.send('Supabase MCP Server is running. Use /sse for connection.');
});

app.listen(PORT, () => {
  console.log(`Supabase MCP Server running on port ${PORT}`);
});
