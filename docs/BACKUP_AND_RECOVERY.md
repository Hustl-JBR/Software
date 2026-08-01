# Backup and recovery

## Current staging limitation

The minimal staging milestone relies on the managed PostgreSQL volume, but no independent scheduled backup, point-in-time recovery guarantee, restore drill, or off-platform encrypted copy has been configured. Railway plan/retention capabilities must be confirmed in the dashboard before treating this staging data as recoverable. Only synthetic data is permitted while this limitation remains.

## Recovery priorities

1. Restore authentication users/accounts/sessions as appropriate.
2. Restore organizations, memberships, and roles.
3. Restore shipment requests/revisions, quotes, loads/stops, candidates/assignments, tracking, communications, tasks, and audit events.
4. Apply all checked-in migrations with `corepack pnpm db:deploy`.
5. Verify tenant isolation, audit immutability, two-user visibility, and `/api/health`.

## Backup procedure to add before real data

Use a Railway-supported private backup or a temporary, tightly controlled in-project job that runs `pg_dump` over private networking and writes an encrypted artifact to an approved private destination. Do not make PostgreSQL public merely to back it up. Record checksum, schema commit, timestamp, retention, and restore-test result.

## Restore drill

Restore into a new isolated non-production database, run migrations, exercise the synthetic persistent workflow, and compare row counts/audit timelines. Never overwrite staging until the restored copy is verified. Document recovery point and recovery time from the drill rather than estimating them.
