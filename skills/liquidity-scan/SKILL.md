---
name: liquidity-scan
agent: scout
schedule: "0 */2 * * *"
model: claude-haiku-3-5-20241022
---

# Liquidity Scan

Scan DEX pools for significant liquidity changes on Solana.

## Instructions

1. For each token in watch_tokens list, query pool data:
   ```
   curl -s "https://api.dexscreener.com/tokens/v1/solana/{mint_address}"
   ```
2. Extract from each pool:
   - Current liquidity (USD)
   - 24h liquidity change (%)
   - Pool age
   - Number of transactions (24h)
3. Compare to previous scan (`memory/liquidity-state.json`):
   - Flag pools where liquidity dropped >20% in 24h (potential rug signal)
   - Flag pools where liquidity increased >50% (new interest signal)
   - Flag new pools (age < 24h) with >$50k liquidity
4. Write updated state to `memory/liquidity-state.json`
5. If any significant changes detected, post to analyst:
   ```json
   {"from":"scout","to":"analyst","type":"signal","data":{"signal_type":"liquidity_change","token":"...","change_pct":-35,"direction":"decrease","pool":"..."}}
   ```

## Anti-Patterns
- Do NOT scan more than 10 tokens per run (rate limits)
- Do NOT flag normal daily fluctuations (<10%) as significant

## Commit Message
`scout: liquidity-scan @ <timestamp>`
