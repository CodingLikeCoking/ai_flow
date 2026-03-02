# Notion Setup

1. Open `https://www.notion.so/profile/integrations`.
2. Click `New integration`.
3. Copy the internal integration token.
4. Create or choose the destination database and copy its database ID.
5. Set `NOTION_TOKEN` and `NOTION_DATABASE_ID` in your shell or launchd environment.
6. Run `ai-flow doctor`.

This enables Notion mirroring without changing filesystem-first storage.
