---
name: portfolio-rebalance
agent: analyst
schedule: "0 9 * * *"
model: claude-sonnet-4-20250514
---

# Portfolio Rebalance

Analyze current portfolio allocation vs targets and recommend rebalancing.

## Instructions

1. Read `memory/positions.json` for current holdings
2. Read `memory/portfolio-state.json` for total value
3. Get current prices for all held tokens via Jupiter Price API:
   ```
   curl -s "https://api.jup.ag/price/v2?ids={comma_separated_mints}"
   ```
4. Calculate current allocation percentages per token
5. Compare to target allocation (default: no single position > 30% of portfolio)
6. If any position exceeds threshold:
   - Calculate rebalance amounts needed
   - Score urgency (how far over threshold)
7. Write to `memory/rebalance-analysis.json`:
   ```json
   {"timestamp":"ISO","allocations":{"SOL":45,"JUP":30,"JTO":25},"overweight":["SOL"],"recommendations":[{"action":"reduce","token":"SOL","amount_pct":15,"urgency":"medium"}]}
   ```
8. If urgent rebalance needed (any position > 50%), post trade-signal:
   ```json
   {"from":"analyst","to":"executor","type":"trade-signal","data":{"action":"sell","token":"...","reason":"rebalance: position exceeds 50%","confidence":0.9,"amount_pct":20}}
   ```

## Anti-Patterns
- Do NOT trigger rebalance for positions < $10 (gas costs exceed benefit)
- Rebalance max once per day

## Commit Message
`analyst: portfolio-rebalance @ <timestamp>`
