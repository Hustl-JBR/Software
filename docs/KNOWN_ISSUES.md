# Known issues

- Active demo operations are browser-session state and are not durable or multi-user.
- Synthetic contacts and compliance evidence are design fixtures, not verified official records.
- Some demo buttons intentionally log or draft locally; they never send messages, call people, upload documents, select production carriers, or transfer money.
- The environment runs Node 24 although the repository targets Node 22 LTS; commands emit an engine warning.
- Real PostgreSQL integration tests and migrations have not been rerun in the current Windows environment.
- Driver profiles, facility appointment mutations, task-drawer workflows, and Settings/Document persistence still use static or component-local demo state and are the next typed shared-state task.
