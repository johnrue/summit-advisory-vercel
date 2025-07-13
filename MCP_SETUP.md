# Supabase MCP Integration Setup

## Overview
This project now includes Model Context Protocol (MCP) integration with Supabase, allowing Claude Code to directly interact with your database through natural language commands.

## Required Setup Steps

### 1. Create Supabase Personal Access Token

**IMPORTANT**: You need to create a Personal Access Token (PAT) in your Supabase dashboard:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Settings** → **Access Tokens**
3. Click **Generate new token**
4. Give it a descriptive name: `Claude Code MCP Server`
5. Copy the generated token

### 2. Update MCP Configuration

Replace the placeholder in `.mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=pjinouipduvzwpjwflju"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_ACTUAL_TOKEN_HERE"
      }
    }
  }
}
```

Replace `YOUR_ACTUAL_TOKEN_HERE` with your Personal Access Token.

### 3. Restart Claude Code

After updating the configuration:
1. Save the `.mcp.json` file
2. Restart Claude Code completely
3. The MCP integration should now work

## Testing the Integration

Once configured, you can use MCP commands like:
- `mcp__supabase__list_tables` - List all database tables
- `mcp__supabase__query_table` - Query table data
- `mcp__supabase__get_table_schema` - Get table structure

## Security Notes

- **Read-only mode**: The configuration uses `--read-only` for safety
- **Project-scoped**: Limited to the `pjinouipduvzwpjwflju` project
- **Token security**: Keep your Personal Access Token secure and don't commit it to version control

## Difference from Client Integration

This MCP setup is **separate** from the existing Supabase client code in:
- `lib/supabase.ts` - Uses `SUPABASE_ANON_KEY` for client operations
- `.mcp.json` - Uses `SUPABASE_ACCESS_TOKEN` for MCP server operations

Both integrations can coexist and serve different purposes:
- **Client code**: For application features (contact forms, etc.)
- **MCP server**: For AI-assisted database management and queries