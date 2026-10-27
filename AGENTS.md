# Public edition

- This repository is a deliberately separated public snapshot, not a fork of the private operational repository.
- Never copy private Git history, real account lists, OAuth credentials, tokens, messages, calendar data or workstation configuration here.
- Keep demo mode and read-only tools as defaults. Use synthetic fixtures in tests; do not authenticate or contact real accounts for CI.
- Real configuration is an ignored JSON outside this repository. Never change the operational MCP server or user Codex configuration from setup scripts.
- Before committing run `npm run check:public`, `npm run check`, `npm test`, and `npm run build`.
- Do not publish npm packages, change visibility, overwrite user settings or rewrite history without user authorization.
