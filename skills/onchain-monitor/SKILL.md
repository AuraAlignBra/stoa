---
name: onchain-monitor
agent: scout
schedule: "*/30 * * * *"
model: claude-haiku-3-5-20241022
---

# Onchain Monitor

Monitor Solana DEX protocols for unusual activity patterns.

## Instructions

1. Query Jupiter stats for volume anomalies:
   ```
   curl -s "https://api.jup.ag/stats/v1"
   ```
2. Query DexScreener for top gainers/losers on Solana:
   ```
   curl -s "https://api.dexscreener.com/token-profiles/latest/v1"
   ```
3. Detect anomalies by comparing to `memory/onchain-baseline.json`:
   - Volume spike: current volume > 2x 7-day average for any watched token
   - New listing: token appearing for first time with >$100k liquidity
   - Price deviation: >20% move in 1 hour for watched tokens
4. Update `memory/onchain-baseline.json` with current values (rolling 7-day average)
5. For each detected anomaly, post signal to analyst with context:
   ```json
   {"from":"scout","to":"analyst","type":"signal","data":{"signal_type":"volume_spike","token":"...","multiplier":3.2,"timeframe":"1h"}}
   ```

## Anti-Patterns
- Do NOT alert on stablecoin volume changes
- Do NOT use more than 3 API calls per run

## Commit Message
`scout: onchain-monitor @ <timestamp>`
