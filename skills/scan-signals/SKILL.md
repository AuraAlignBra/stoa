---
agent: scout
skill: scan-signals
description: Scan for market signals (price, volume, news, social sentiment)
---

Analyze the current market data and identify significant signals. Look for:
- Price movements (24h change, volatility)
- Volume spikes
- News sentiment (positive/negative)
- Social media trends (Twitter, Discord)
- On-chain metrics (if available)

Return a concise summary of key observations and signal strength. Do NOT use execution language like "opened a position" or "trade executed" — scout only observes and reports, it never executes trades. Phrase insights as recommendations, e.g. "consider" or "signal suggests".

