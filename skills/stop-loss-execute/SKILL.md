---
name: stop-loss-execute
agent: executor
schedule: null
triggers:
  - on: mesh
    from: guardian
    type: stop-loss-trigger
model: claude-sonnet-4-20250514
---

# Stop-Loss Execute

Execute stop-loss sells when triggered by Guardian.

## Instructions

1. Read `stop-loss-trigger` message from inbox:
   - Token to sell
   - Position details (amount, entry_price)
   - Current price (from Guardian)
   - Reason (stop-loss hit / drawdown limit / guardian override)
2. Verify the position exists in `memory/positions.json`
3. Get Jupiter quote for selling the full position:
   ```
   curl -s "https://api.jup.ag/quote/v1?inputMint={token_mint}&outputMint=So11111111111111111111111111111111111111112&amount={token_amount}&slippageBps=100"
   ```
   Note: use higher slippage (100bps) for stop-loss — execution speed > price optimization
4. Simulate the transaction first
5. If simulation passes, execute the swap
6. Remove position from `memory/positions.json`
7. Update `memory/portfolio-state.json` with new totals
8. Record in `memory/tx-log.json` with reason
9. Post execution report:
   ```json
   {"from":"executor","to":["analyst","guardian"],"type":"execution-report","data":{"action":"stop-loss-sell","token":"...","amount":"...","exit_price":0.045,"pnl_pct":-8.5,"reason":"stop-loss hit","tx":"..."}}
   ```

## Anti-Patterns
- Stop-losses are URGENT — do not add delays or confirmations
- Use wider slippage than normal trades (speed matters)
- If execution fails, retry ONCE then report failure to Guardian immediately

## Commit Message
`executor: stop-loss ${token} @ <timestamp>`
