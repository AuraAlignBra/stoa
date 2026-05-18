# stoa MCP Server

Exposes the stoa swarm as callable tools via the [Model Context Protocol](https://modelcontextprotocol.io).

## Tools (13)

| Tool | Description |
|------|-------------|
| `stoa_status` | Swarm status, portfolio, positions, wallet |
| `stoa_health` | Skill quality scores and health reports |
| `stoa_dispatch` | Trigger the cron dispatcher |
| `stoa_execute` | Run a specific agent/skill |
| `stoa_mesh_read` | Read an agent's inbox |
| `stoa_mesh_post` | Post a message to an agent |
| `stoa_positions` | Open trading positions |
| `stoa_cost` | Token usage and cost summary |
| `stoa_chain` | Execute a skill chain |
| `stoa_halt` | Emergency halt the swarm |
| `stoa_resume` | Resume from halt |
| `stoa_validate` | Validate config and skills |
| `stoa_gateway` | LLM provider availability |

## Setup

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "stoa": {
      "command": "npx",
      "args": ["tsx", "/path/to/stoa/mcp-server/src/index.ts"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add stoa -- npx tsx ./mcp-server/src/index.ts
```
