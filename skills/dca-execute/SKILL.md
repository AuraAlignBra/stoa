---
name: dca-execute
agent: executor
schedule: null
triggers:
  - on: mesh
    from: analyst
    type: dca-signal
model: claude-sonnet-4-20250514
---

# DCA Execute

Execute dollar-cost-averaging trades by splitting large orders into smaller chunks.

## Instructions

1. Read incoming `dca-signal` message from inbox for:
   - Token to buy
   - Total amount (USD)
   - Number of chunks
   - Interval between chunks (minutes)
2. Calculate per-chunk amount: total / chunks
3. Verify wallet balance is sufficient (read `memory/wallet-balance.json`)
4. For each chunk (execute first chunk only in this run, schedule rest via mesh):
   - Build Jupiter swap quote:
     ```
     curl -s "https://api.jup.ag/quote/v1?inputMint=So11111111111111111111111111111111111111112&outputMint={token_mint}&amount={lamports}&slippageBps=${slippage_bps}"
     ```
   - Verify slippage is within bounds
   - Execute swap (simulation first):
     ```bash
     # Simulation
     curl -s "https://api.jup.ag/swap/v1" -X POST -H "Content-Type: application/json" -d '{"quoteResponse":...,"simulateTransaction":true}'
     ```
   - If simulation passes, execute real swap
5. Record execution in `memory/tx-log.json`
6. Post execution report:
   ```json
   {"from":"executor","to":["analyst","guardian"],"type":"execution-report","data":{"action":"dca-buy","token":"...","chunk":1,"of":5,"amount_usd":20,"tx":"...","remaining_chunks":4}}
   ```
7. If more chunks remain, post self-reminder to inbox with delay

## Anti-Patterns
- NEVER execute without simulation first
- If simulation fails, abort ALL remaining chunks and report
- Do NOT exceed max_position_usd even across all chunks combined

## Commit Message
`executor: dca-execute chunk {N}/{total} @ <timestamp>`
