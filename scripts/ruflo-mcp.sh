#!/usr/bin/env zsh
# LiveTry × Antigravity — Ruflo MCP Integration
# This script starts/stops the Ruflo MCP server so Antigravity IDE
# can connect to it via .mcp.json and use Ruflo coordination tools
# (memory_store, hooks_pre-edit, swarm_init, etc.) directly.
#
# Usage: ./scripts/ruflo-mcp.sh [start|stop|status|test]

set -euo pipefail

ACTION="${1:-status}"
MCP_PORT=3001
PID_FILE=".claude-flow/ruflo-mcp.pid"
LOG_FILE=".claude-flow/logs/mcp-server.log"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p .claude-flow/logs

case "$ACTION" in
  start)
    echo "🔌 Starting Ruflo MCP server for Antigravity..."
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "ℹ️  MCP server already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi
    npx --yes ruflo@latest mcp start \
      --transport http \
      --port "$MCP_PORT" \
      >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2
    echo "✅ MCP server started on port $MCP_PORT (PID $(cat "$PID_FILE"))"
    echo "   Antigravity can now call Ruflo tools via MCP."
    echo "   Logs: $LOG_FILE"
    echo ""
    echo "🔧 Available tool groups:"
    echo "   memory_store / memory_retrieve / memory_search"
    echo "   swarm_init / swarm_status / swarm_health"
    echo "   hooks_pre-edit (design token + VTON prompt validation)"
    echo "   agent_spawn / agent_execute / agent_status"
    ;;

  stop)
    echo "🛑 Stopping Ruflo MCP server..."
    if [[ -f "$PID_FILE" ]]; then
      PID=$(cat "$PID_FILE")
      kill "$PID" 2>/dev/null && echo "✅ Stopped (PID $PID)" || echo "ℹ️  Process already stopped"
      rm -f "$PID_FILE"
    else
      npx --yes ruflo@latest mcp stop 2>/dev/null || echo "ℹ️  No MCP server running"
    fi
    ;;

  status)
    echo "📊 Ruflo MCP server status..."
    npx --yes ruflo@latest mcp status 2>/dev/null || echo "ℹ️  MCP server not running. Start with: ./scripts/ruflo-mcp.sh start"
    ;;

  test)
    echo "🧪 Testing Ruflo MCP tools (stdio transport)..."
    echo "Testing memory_store..."
    npx --yes ruflo@latest mcp exec memory_store \
      --params '{"key":"livetry-test","value":"antigravity-mcp-ok","namespace":"livetry"}' \
      2>&1 | tail -5
    echo ""
    echo "Testing memory_retrieve..."
    npx --yes ruflo@latest mcp exec memory_retrieve \
      --params '{"key":"livetry-test","namespace":"livetry"}' \
      2>&1 | tail -5
    echo ""
    echo "✅ MCP tools working. Antigravity can use these in-conversation."
    ;;

  tools)
    echo "🔧 Listing all available Ruflo MCP tools..."
    npx --yes ruflo@latest mcp tools 2>&1 | grep -v "npm warn"
    ;;

  *)
    echo "Usage: $0 [start|stop|status|test|tools]"
    echo ""
    echo "  start  — start MCP server (HTTP on port $MCP_PORT)"
    echo "  stop   — stop MCP server"
    echo "  status — show server status"
    echo "  test   — run a quick memory store/retrieve test"
    echo "  tools  — list all available MCP tools"
    exit 1
    ;;
esac
