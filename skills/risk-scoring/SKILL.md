---
name: risk-scoring
agent: analyst
schedule: "0 */4 * * *"
model: claude-haiku-3-5-20241022
---

# Risk Scoring

Score each open position's risk level (1-10) based on multiple factors.

## Instructions

1. Read `memory/positions.json` for all open positions
2. For each position, score risk 1-10 based on:
   - **Liquidity depth** (1-3): Query DexScreener for pool liquidity relative to position size
   - **Volatility** (1-3): Check 24h price range from DexScreener
   - **Time held** (1-2): Longer holds in volatile tokens = more risk
   - **Distance from stop-loss** (1-2): Closer to stop = higher risk
3. Aggregate scores: sum of above factors (max 10)
4. Write to `memory/risk-scores.json`:
   ```json
   [{"token":"JUP","address":"...","risk_score":4,"breakdown":{"liquidity":1,"volatility":2,"time":0,"stop_distance":1},"recommendation":"hold"}]
   ```
5. If any position scores >= 8, post alert to guardian:
   ```json
   {"from":"analyst","to":"guardian","type":"feedback","data":{"alert":"high_risk_position","token":"...","score":9,"recommendation":"consider reducing"}}
   ```

## Anti-Patterns
- Do NOT use risk scores as sell signals directly — that's Guardian's job
- Query max 5 positions per run to respect rate limits

## Commit Message
`analyst: risk-scoring @ <timestamp>`
