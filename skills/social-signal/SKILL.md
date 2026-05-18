---
name: social-signal
agent: scout
schedule: "0 */6 * * *"
model: claude-haiku-3-5-20241022
---

# Social Signal

Track social momentum for Solana tokens using public APIs.

## Instructions

1. Query DexScreener trending (Solana filter):
   ```
   curl -s "https://api.dexscreener.com/token-boosts/top/v1"
   ```
2. Query CoinGecko categories for Solana ecosystem:
   ```
   curl -s "https://api.coingecko.com/api/v3/coins/categories"
   ```
3. For tokens appearing in both trending AND our watch_tokens:
   - Score social momentum 0-1 based on: boost count, trending duration, category performance
4. Track narrative categories gaining momentum (AI, meme, DePIN, RWA, gaming)
5. Write to `memory/social-state.json`:
   ```json
   {"timestamp":"ISO","hot_tokens":[{"token":"JUP","score":0.8,"reason":"top boosted + category up 12%"}],"narratives":{"AI":0.7,"meme":0.4}}
   ```
6. Post signal if any watched token has social score > 0.7:
   ```json
   {"from":"scout","to":"analyst","type":"signal","data":{"signal_type":"social_momentum","token":"...","score":0.85}}
   ```

## Anti-Patterns
- Social signals are noisy — always combine with onchain data before acting
- Do NOT make more than 2 API calls per run

## Commit Message
`scout: social-signal @ <timestamp>`
