---
name: news-sentiment
agent: scout
schedule: "0 */4 * * *"
model: claude-sonnet-4-20250514
---

# News Sentiment

Aggregate and score crypto market sentiment from public sources.

## Instructions

1. Query CoinGecko trending:
   ```
   curl -s "https://api.coingecko.com/api/v3/search/trending"
   ```
2. Query DexScreener boosted tokens:
   ```
   curl -s "https://api.dexscreener.com/token-boosts/latest/v1"
   ```
3. For each trending token that overlaps with our watch_tokens:
   - Record trending rank/score
   - Note sentiment indicators (price direction + social volume proxy)
4. Score overall market sentiment from -1.0 (extreme fear) to +1.0 (extreme greed):
   - Number of Solana tokens trending (more = greed)
   - Average 24h price change of top tokens
   - New token launch rate (high = speculation)
5. Write to `memory/sentiment-state.json`:
   ```json
   {"timestamp":"ISO","overall_score":0.3,"trending_tokens":[...],"narrative":"AI tokens dominating trends"}
   ```
6. If sentiment shifted significantly from last scan (>0.3 delta), post signal:
   ```json
   {"from":"scout","to":"analyst","type":"signal","data":{"signal_type":"sentiment_shift","score":0.65,"previous":0.2,"narrative":"..."}}
   ```

## Anti-Patterns
- CoinGecko free tier has aggressive rate limits — ONE call per skill run
- Do NOT interpret trending as bullish — it can indicate panic selling too

## Commit Message
`scout: news-sentiment @ <timestamp>`
