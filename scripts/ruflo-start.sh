#!/usr/bin/env zsh
# LiveTry Ruflo Swarm — Quick Start Script
# Usage: ./scripts/ruflo-start.sh [frontend|backend|harvey|all|status|stop|dev-workflow]

set -euo pipefail

SCOPE="${1:-status}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ruflo() { npx --yes ruflo@latest "$@"; }

echo "🟢 LiveTry × Ruflo — scope: $SCOPE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Helper: init swarm then start with objective (auto-confirm)
_swarm_run() {
  local objective="$1"
  local strategy="${2:-development}"
  local agents="${3:-4}"

  echo "▶ Initializing swarm (topology: mesh, max-agents: $agents)..."
  ruflo swarm init \
    --topology mesh \
    --max-agents "$agents" \
    --strategy "$strategy"

  echo "▶ Starting swarm..."
  echo "y" | ruflo swarm start \
    --objective "$objective" \
    --strategy "$strategy" \
    --parallel \
    --monitor
}

case "$SCOPE" in
  frontend)
    _swarm_run \
      "Audit LiveTry frontend: (1) apps/demo-site/src — DESIGN.md compliance: Cormorant Garamond + Hanken Grotesk fonts, border-radius 0, no CSS gradients, no glassmorphism, no purple/blue. (2) VTON prompt safety in pdp.ts — no face/body substitution, must include identity-preservation phrases. (3) Product routing — each product card links to its own PDP with correct garmentImage. Report all violations with file + line number." \
      "analysis" \
      3
    ;;

  backend)
    _swarm_run \
      "Audit LiveTry backend: (1) packages/local-vton-server — ephemeral token pattern (no token persistence to DB), no camera frame writes to disk, session TTL enforcement. (2) harvey/harvey — verify_email_deliverability() called before every send/stage in sender.py, daily cap <=50 and hourly cap <=10 configured, 7-day dedup window. Report all issues with file + line number." \
      "analysis" \
      2
    ;;

  harvey)
    _swarm_run \
      "Audit Harvey outreach system in harvey/: (1) email_verifier.py — MX record DNS lookup present, burner domain blocklist present, RFC 5322 validation. (2) sender.py — verify_email_deliverability() called before staging/sending. (3) prospects.csv — flag obviously invalid emails. (4) Rate limits — daily cap 50, hourly cap 10 enforced. Suggest exact code fix for each issue." \
      "analysis" \
      2
    ;;

  all)
    _swarm_run \
      "Full audit of LiveTry repository. FRONTEND (apps/demo-site, packages/widget): DESIGN.md compliance (flat colors, Cormorant Garamond + Hanken Grotesk, border-radius 0, no gradients, no glassmorphism, no purple/blue), VTON prompt safety (no face/body substitution, identity-preservation phrases required), correct product-to-garment routing. BACKEND (packages/local-vton-server): ephemeral tokens, no frame storage, session TTL. HARVEY (harvey/): mandatory email deliverability verification, rate limiting, 7-day dedup. Report all violations with file + line number." \
      "development" \
      6
    ;;

  dev-workflow)
    _swarm_run \
      "LiveTry dev workflow: (1) audit frontend (apps/demo-site, packages/widget) and backend (packages/local-vton-server, harvey/) in parallel, (2) verify shared-types parity between packages/shared-types and all consumers, (3) check TypeScript compilation succeeds, (4) verify all product routes and try-on integrations are wired correctly." \
      "development" \
      4
    ;;

  status)
    echo "▶ Checking swarm status..."
    ruflo swarm status 2>/dev/null || echo "ℹ️  No active swarm session."
    ;;

  stop)
    echo "▶ Stopping swarm..."
    ruflo swarm stop 2>/dev/null || echo "ℹ️  No active swarm to stop."
    ;;

  *)
    echo "Usage: $0 [frontend|backend|harvey|all|dev-workflow|status|stop]"
    echo ""
    echo "  frontend     — audit demo-site + widget (DESIGN.md + VTON safety)"
    echo "  backend      — audit vton-server + harvey (privacy + email gate)"
    echo "  harvey       — harvey audit only (email verifier, rate limits)"
    echo "  all          — full repo audit (6 agents)"
    echo "  dev-workflow — full dev workflow (parallel audit + type-check)"
    echo "  status       — show active swarm status"
    echo "  stop         — stop active swarm"
    exit 1
    ;;
esac

echo ""
echo "✅ Done. Run './scripts/ruflo-start.sh status' to monitor."
