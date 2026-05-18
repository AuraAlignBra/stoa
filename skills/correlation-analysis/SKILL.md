---
name: correlation-analysis
agent: analyst
schedule: "0 */12 * * *"
model: claude-sonnet-4-20250514
---

# Correlation Analysis

Analyze price correlations between tracked tokens to identify pairs and divergences.

## Instructions

1. Read `memory/scan-state.json` for historical price data of watched tokens.
2. For each pair of tokens, calculate:
   - Price correlation over available data window
   - Volume correlation
   - Identify pairs that typically move together (correlation > 0.7)
3. Detect divergences: pairs that normally correlate but are currently diverging
   - A divergence = potential mean-reversion opportunity
4. Write analysis to `memory/correlation-matrix.json`:
   ```json
   {"timestamp":"ISO","pairs":[{"a":"SOL","b":"JUP","correlation":0.82,"diverging":false}],"opportunities":[{"type":"mean-reversion","tokens":["X","Y"],"confidence":0.6}]}
   ```
5. If a high-confidence divergence opportunity is found (confidence > min_confidence), post:
   ```json
   {"from":"analyst","to":"analyst","type":"signal","data":{"signal_type":"correlation_divergence","pair":["X","Y"],"expected_reversion":true}}
   ```

## Anti-Patterns
- Do NOT use correlation alone for trade decisions — always combine with volume and liquidity
- Minimum 7 data points needed for meaningful correlation

## Commit Message
`analyst: correlation-analysis @ <timestamp>`
