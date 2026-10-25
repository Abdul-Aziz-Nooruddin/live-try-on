# Ruflo — Claude Code Configuration

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER add a `Co-Authored-By` trailer to user commits unless this project's `.claude/settings.json` has `attribution.commit` set (#2078). The Claude Code Bash tool may suggest one in its default commit-message template — ignore it. `Co-Authored-By` is semantic authorship attribution under git/GitHub convention; the tool is the facilitator, not a co-author.
- Keep files under 500 lines
- Validate input at system boundaries

## Ruflo Capability Brain & Implementation Loop

Ruflo is the coordination ledger and policy decision point. Claude Code is the
executor: after a Ruflo coordination call, continue implementing the task.

When it is registered, call
`guidance_brain({ mode: "recommend", task: "..." })` before complex Ruflo
work. Use its live registry instead of guessing tool names. Treat
`registered`, `configured`, `reachable`, `healthy`, and `authorized`
as separate facts. If the brain is unavailable, continue with the compatible
`guidance_recommend` tool, CLI discovery, and repository instructions.

Follow the returned loop:

1. Recall memory and ADR constraints.
2. Inspect source, runtime, dependencies, policy, and health.
3. Route to the smallest capable topology, agents, skills, and tools.
4. Plan acceptance criteria, safety envelope, ownership, and validation.
5. Execute in isolated scopes; the coding agent performs the work.
6. Test focused, regression, and failure paths.
7. Validate types, security, policy, compatibility, and artifacts.
8. Benchmark a source-bound candidate against a source-bound baseline.
9. Optimize measured bottlenecks without weakening safety.
10. Bind claims and evidence to exact source/build receipts.
11. Reconcile concurrent handoffs and disclose limitations.
12. Publish only through a separately authorized release gate.

### Concurrency and authority

- Never allow two writers in one worktree; give each writing agent an isolated
  worktree and explicit file ownership.
- Read-only research may run concurrently and report findings to the owner.
- Only the integration owner edits shared manifests and lockfiles or reconciles
  overlapping changes.
- A child may drop capabilities but cannot add tools, network, secrets, spend,
  concurrency, namespaces, or delegation depth.
- A lease or claim coordinates ownership; it does not authorize a side effect.
- Darwin, Flywheel, MetaHarness, memory, and neural systems may propose or
  evaluate candidates but cannot self-promote or expand their SafetyEnvelope.
- Bind tests, benchmarks, policy decisions, and release evidence to an exact
  commit or immutable dirty-worktree snapshot.

## Agent Comms (SendMessage-First Coordination)

Named agents coordinate via `SendMessage`, not polling or shared state.

```
Lead (you) ←→ architect ←→ developer ←→ tester ←→ reviewer
              (named agents message each other directly)
```

### Spawning a Coordinated Team

```javascript
// ALL agents in ONE message, each knows WHO to message next
Agent({ prompt: "Research the codebase. SendMessage findings to 'architect'.",
  subagent_type: "researcher", name: "researcher", run_in_background: true })
Agent({ prompt: "Wait for 'researcher'. Design solution. SendMessage to 'coder'.",
  subagent_type: "system-architect", name: "architect", run_in_background: true })
Agent({ prompt: "Wait for 'architect'. Implement it. SendMessage to 'tester'.",
  subagent_type: "coder", name: "coder", run_in_background: true })
Agent({ prompt: "Wait for 'coder'. Write tests. SendMessage results to 'reviewer'.",
  subagent_type: "tester", name: "tester", run_in_background: true })
Agent({ prompt: "Wait for 'tester'. Review code quality and security.",
  subagent_type: "reviewer", name: "reviewer", run_in_background: true })

// Kick off the pipeline
SendMessage({ to: "researcher", summary: "Start", message: "[task context]" })
```

### Patterns

| Pattern | Flow | Use When |
|---------|------|----------|
| **Pipeline** | A → B → C → D | Sequential dependencies (feature dev) |
| **Fan-out** | Lead → A, B, C → Lead | Independent parallel work (research) |
| **Supervisor** | Lead ↔ workers | Ongoing coordination (complex refactor) |

### Rules

- ALWAYS name agents — `name: "role"` makes them addressable
- ALWAYS include comms instructions in prompts — who to message, what to send
- Spawn ALL agents in ONE message with `run_in_background: true`
- After spawning, continue independent local work; wait only when a dependency
  genuinely blocks progress
- Do not poll repeatedly — agents message back or complete automatically
- Give every writing agent an isolated worktree and a non-overlapping file scope

## Swarm & Routing

### Config
- **Topology**: mesh (anti-drift)
- **Max Agents**: 5
- **Memory**: memory
- **HNSW**: Disabled
- **Neural**: Disabled

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

### Agent Routing

| Task | Agents | Topology |
|------|--------|----------|
| Bug Fix | researcher, coder, tester | hierarchical |
| Feature | architect, coder, tester, reviewer | hierarchical |
| Refactor | architect, coder, reviewer | hierarchical |
| Performance | perf-engineer, coder | hierarchical |
| Security | security-architect, auditor | hierarchical |

### When to Swarm
- **YES**: 3+ files, new features, cross-module refactoring, API changes, security, performance
- **NO**: single file edits, 1-2 line fixes, docs updates, config changes, questions

### 3-Tier Model Routing

| Tier | Handler | Use Cases |
|------|---------|-----------|
| 1 | Agent Booster (WASM) | Simple transforms — skip LLM, use Edit directly |
| 2 | Haiku | Simple tasks, low complexity |
| 3 | Sonnet/Opus | Architecture, security, complex reasoning |

## Build & Test

- ALWAYS run tests after code changes
- ALWAYS verify build succeeds before committing

```bash
npm run build && npm test
```

## CLI Quick Reference

```bash
npx @claude-flow/cli@latest init --wizard           # Setup
npx @claude-flow/cli@latest swarm init --v3-mode     # Start swarm
npx @claude-flow/cli@latest memory search --query "" # Vector search
npx @claude-flow/cli@latest hooks route --task ""    # Route to agent
npx @claude-flow/cli@latest doctor --fix             # Diagnostics
npx @claude-flow/cli@latest security scan            # Security scan
npx @claude-flow/cli@latest performance benchmark    # Benchmarks
```

26 commands, 140+ subcommands. Use `--help` on any command for details.

## Setup

```bash
claude mcp add claude-flow -- npx -y ruflo@latest mcp start
npx ruflo@latest doctor --fix
```

> The background `daemon` is optional. It runs interval workers that each spawn
> a headless `claude` session, so it consumes tokens continuously. Start it only
> if you want those sweeps: `npx ruflo@latest daemon start` (self-stops after 12h
> by default; `--ttl 0` to disable, `daemon status --all` to audit running daemons).

**Agent tool** handles execution (agents, files, code, git). **MCP tools** handle coordination (swarm, memory, hooks). **CLI** is the same via Bash.

---

## LiveTry × Antigravity — Ruflo Integration

LiveTry uses **Ruflo as a coordination layer for Antigravity** (not Claude Code).
Antigravity is the AI executor. Ruflo provides: persistent memory, quality-gate hooks,
and swarm coordination metadata via MCP.

### How it works

```
Antigravity IDE (you're here)
  ↓  calls
Ruflo MCP server (.mcp.json → npx ruflo mcp start)
  ↓  provides
  - memory_store / memory_retrieve / memory_search (384-dim vector, SQLite)
  - hooks_pre-edit (design token + VTON prompt validation)
  - swarm_init / swarm_status (coordination metadata)
  - agent_spawn / agent_execute (task slots)
```

### Seeded Memory (queryable via `memory_search`)

| Key | Namespace | Content |
|-----|-----------|---------|
| `livetry-design-rules` | `livetry-frontend` | DESIGN.md: fonts, radius, no-gradients, no-glassmorphism |
| `livetry-vton-rules` | `livetry-frontend` | VTON prompt safety: preserve face/skin/hair |
| `livetry-performance-targets` | `livetry-frontend` | <150ms WebRTC, <80KB widget, 15-30 FPS |
| `harvey-email-rules` | `livetry-backend` | MX verify, daily/hourly caps, 7-day dedup |
| `livetry-privacy-rules` | `livetry-backend` | Ephemeral tokens, zero frame retention |

### Scripts

```bash
# MCP server management (Antigravity connects via .mcp.json)
./scripts/ruflo-mcp.sh start   # start HTTP MCP server on :3001
./scripts/ruflo-mcp.sh stop    # stop
./scripts/ruflo-mcp.sh status  # health check
./scripts/ruflo-mcp.sh tools   # list all 60+ MCP tools

# Swarm coordination metadata (creates task slots)
./scripts/ruflo-start.sh all          # 6-agent full audit swarm
./scripts/ruflo-start.sh frontend     # 3-agent frontend audit
./scripts/ruflo-start.sh backend      # 2-agent backend audit
./scripts/ruflo-start.sh harvey       # 2-agent harvey audit
./scripts/ruflo-start.sh status       # swarm status

# Direct MCP tool calls
npx ruflo@latest mcp exec -t memory_search -p '{"query":"design rules","namespace":"livetry-frontend"}'
npx ruflo@latest mcp exec -t memory_retrieve -p '{"key":"livetry-design-rules","namespace":"livetry-frontend"}'
```

### Agent Map

| Agent | Role | Scope |
|-------|------|-------|
| `frontend-lead` | Coordinator | `apps/`, `packages/widget`, `packages/tryon-core` |
| `backend-lead` | Coordinator | `packages/local-vton-server`, `harvey/` |
| `demo-site-agent` | Specialist | `apps/demo-site/src` |
| `widget-agent` | Specialist | `packages/widget/src`, `packages/tryon-core/src` |
| `vton-server-agent` | Specialist | `packages/local-vton-server` |
| `harvey-agent` | Specialist | `harvey/harvey` |

### Quality Standards (enforced by agents + hooks)

- **Design**: Cormorant Garamond + Hanken Grotesk only, `border-radius: 0`, no gradients, no glassmorphism
- **Privacy**: Zero camera frame retention, ephemeral tokens, 30-min session TTL
- **Performance**: WebRTC <150ms latency, 15–30 FPS, widget <80KB gzipped
- **Outreach**: MX-verified emails only, 50/day cap, 10/hour cap, 7-day dedup window


### Agent Map

| Agent | Role | Scope |
|-------|------|-------|
| `frontend-lead` | Coordinator | `apps/`, `packages/widget`, `packages/tryon-core` |
| `backend-lead` | Coordinator | `packages/local-vton-server`, `harvey/` |
| `demo-site-agent` | Specialist | `apps/demo-site/src` |
| `widget-agent` | Specialist | `packages/widget/src`, `packages/tryon-core/src` |
| `vton-server-agent` | Specialist | `packages/local-vton-server` |
| `harvey-agent` | Specialist | `harvey/harvey` |

### Quick Start

```bash
# All agents
./scripts/ruflo-start.sh all

# Frontend only
./scripts/ruflo-start.sh frontend

# Backend only
./scripts/ruflo-start.sh backend

# Harvey outreach pipeline (dry-run by default)
./scripts/ruflo-start.sh harvey

# Full-stack dev workflow
./scripts/ruflo-start.sh dev-workflow

# Monitor
npx ruflo@latest status
npx ruflo@latest logs --tail
```

### Active Hooks (auto-enforced)

| Hook | Trigger | Action |
|------|---------|--------|
| `validate-design-tokens` | Pre-edit on any `.css` | Blocks gradients, glassmorphism, non-zero radius, purple/blue |
| `vton-prompt-safety` | Pre-edit on `pdp.ts`, widget | Blocks face/body substitution prompts; requires identity preservation phrases |
| `harvey-email-gate` | Pre-command `harvey send/stage` | Blocks sends missing `verify_email_deliverability()` call |

### Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `livetry-dev` | Manual / branch push | Parallel frontend+backend dev → shared-types sync → quality gates |
| `harvey-pipeline` | Cron 8 AM weekdays | Scrape → verify → stage → send → audit-bounces |

### Quality Standards (enforced by agents)

- **Design**: Cormorant Garamond + Hanken Grotesk only, `border-radius: 0`, no gradients, no glassmorphism
- **Privacy**: Zero camera frame retention, ephemeral tokens, 30-min session TTL
- **Performance**: WebRTC <150ms latency, 15–30 FPS, widget <80KB gzipped
- **Outreach**: MX-verified emails only, 50/day cap, 10/hour cap, 7-day dedup window
