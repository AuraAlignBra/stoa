---
name: narrative-tracker
agent: analyst
schedule: "0 8 * * *"
model: claude-sonnet-4-20250514
---

# Narrative Tracker

Track evolving market narratives and score their momentum.

## Instructions

1. Read `memory/social-state.json` and `memory/sentiment-state.json` for current signals
2. Read `memory/narrative-state.json` for historical narrative tracking
3. Define narrative categories: AI, meme, DePIN, RWA, gaming, L2, liquid-staking
4. For each narrative:
   - Count tokens in that category that are trending or have positive signals
   - Compare to previous period (narrative gaining or losing momentum)
   - Score momentum 0-1
5. Identify narrative rotation patterns:
   - Which narrative is fading? (was hot, now cooling)
   - Which narrative is emerging? (was cold, now warming)
6. Write to `memory/narrative-state.json`:
   ```json
   {"timestamp":"ISO","narratives":{"AI":{"score":0.8,"trend":"rising","top_tokens":["RENDER","FET"]},"meme":{"score":0.3,"trend":"falling"}},"rotation":"AI replacing meme as dominant narrative"}
   ```
7. If a strong narrative rotation is detected (emerging narrative > 0.7), post signal:
   ```json
   {"from":"analyst","to":"analyst","type":"signal","data":{"signal_type":"narrative_rotation","emerging":"AI","fading":"meme","confidence":0.75}}
   ```

## Anti-Patterns
- Narratives move slowly — don't over-react to single-day changes
- Run only once daily to avoid noise

## Commit Message
`analyst: narrative-tracker @ <timestamp>`
