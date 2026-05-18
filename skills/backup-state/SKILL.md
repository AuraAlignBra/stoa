---
name: backup-state
agent: guardian
schedule: "0 0 * * *"
model: claude-haiku-3-5-20241022
---

# Backup State

Create daily backup of critical state files for disaster recovery.

## Instructions

1. Read the following critical files:
   - `memory/positions.json`
   - `memory/portfolio-state.json`
   - `memory/wallet-balance.json`
   - `memory/cron-state.json`
   - `memory/tx-log.json` (last 50 entries only)
2. Create backup directory: `memory/backups/` (if not exists)
3. Write consolidated backup:
   ```
   memory/backups/{YYYY-MM-DD}.json
   ```
   Format:
   ```json
   {"backup_date":"ISO","positions":[...],"portfolio":{...},"wallet":{...},"cron_state":{...},"recent_transactions":[...]}
   ```
4. Prune old backups: keep only last 7 days of backups
   - Read directory listing
   - Delete files older than 7 days
5. Verify backup integrity:
   - Re-read the backup file
   - Confirm JSON parses correctly
   - Confirm position count matches source

## Anti-Patterns
- Do NOT backup mesh inboxes (they're ephemeral by design)
- Do NOT include any private keys or secrets in backups
- Keep backups under 100KB (trim tx-log if needed)

## Commit Message
`guardian: backup-state @ <timestamp>`
