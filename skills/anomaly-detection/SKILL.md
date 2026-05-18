---
name: anomaly-detection
agent: guardian
schedule: "*/30 * * * *"
model: claude-haiku-3-5-20241022
---

# Anomaly Detection

Detect anomalies in swarm behavior and external market conditions.

## Instructions

1. **Swarm behavior anomalies**:
   - Read `memory/cron-state.json` — any agent not running for 2x its interval?
   - Read `memory/mesh/` — any inbox growing without processing (>20 unack messages)?
   - Read `memory/tx-log.json` — any failed transactions in last hour?
   - Read `memory/skill-health/` — any skill score drop >2 points in last 5 runs?

2. **Market condition anomalies**:
   - Read `memory/positions.json` — get current prices for all positions
   - Check for: flash crashes (>30% drop in 1h), extreme volume (>10x normal), spreads widening
   ```
   curl -s "https://api.jup.ag/price/v2?ids={position_mints}"
   ```

3. **Score anomaly severity** (1-5):
   - 1-2: Log only, no action
   - 3: Post warning to analyst
   - 4: Post warning to all agents
   - 5: Initiate halt

4. Write to `memory/anomaly-log.json`:
   ```json
   [{"timestamp":"ISO","type":"market","severity":3,"description":"JUP dropped 25% in 1h","action_taken":"warning posted"}]
   ```

5. Take action based on severity:
   - Severity 3+: Post feedback to relevant agent
   - Severity 5: Post halt to all agents with cooldown

## Anti-Patterns
- Do NOT trigger halt for single-token volatility unless it's >50% of portfolio
- Normal agent failures (1-2 per day) are expected — only alert on patterns

## Commit Message
`guardian: anomaly-detection @ <timestamp>`
