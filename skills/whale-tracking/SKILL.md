---
name: whale-tracking
agent: scout
schedule: "*/30 * * * *"
model: claude-haiku-3-5-20241022
---

# Whale Tracking

Monitor known whale wallets for large movements on Solana.

## Instructions

1. Read `memory/whale-wallets.json` for tracked addresses. If empty, seed with top Solana wallets from public data.
2. For each tracked wallet, query recent transactions:
   ```
   curl -s "https://api.helius.xyz/v0/addresses/{address}/transactions?api-key=${HELIUS_API_KEY}&limit=10"
   ```
   If HELIUS_API_KEY unavailable, use:
   ```
   curl -s -X POST "${SOLANA_RPC_URL}" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getSignaturesForAddress","params":["{address}",{"limit":5}]}'
   ```
3. Filter for transactions with value > ${whale_threshold_usd} (from agent vars).
4. For qualifying transactions, determine:
   - Direction: buy/sell/transfer
   - Token involved
   - Amount in USD (use Jupiter price API)
   - Destination (DEX swap vs wallet transfer)
5. Write findings to `memory/whale-activity.json`:
   ```json
   [{"wallet":"...","action":"buy","token":"JUP","amount_usd":85000,"tx":"...","timestamp":"ISO"}]
   ```
6. If a whale buys > $50k of a token in our watch list, post to analyst:
   ```json
   {"from":"scout","to":"analyst","type":"signal","data":{"signal_type":"whale_buy","token":"...","amount_usd":85000,"wallet":"...","confidence_boost":0.15}}
   ```

## Anti-Patterns
- Do NOT track more than 20 wallets (rate limits)
- Do NOT expose full wallet addresses in logs
- If API fails, report failure — do not fabricate whale data

## Commit Message
`scout: whale-tracking @ <timestamp>`
