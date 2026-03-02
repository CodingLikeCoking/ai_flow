# Notion Setup

1. Open `https://www.notion.so/profile/integrations`.
2. Click `+ New integration`.
3. Enter the integration name, for example `ai-flow`.
4. Select the workspace that should own the integration.
5. Click `Submit`.
6. In the integration page, click `Configure integration settings`.
7. Under `Capabilities`, enable read and insert/update access for content.
8. Copy the `Internal Integration Token`.
9. In Notion, create or open the database you want `ai-flow` to mirror into.
10. In the database page, click `...` in the top right, then click `Connections`.
11. Search for the integration you created and connect it.
12. Copy the database ID from the page URL.
13. Put the token into `NOTION_TOKEN`.
14. Put the database ID into `NOTION_DATABASE_ID`.
15. Save the same values in both the repo `.env` and `~/.ai-flow/.env` if you want the CLI, MCP server, and launchd job to all see them.
16. Run `ai-flow doctor`.
17. Run `ai-flow sync notion`.

This enables Notion mirroring without changing filesystem-first storage.
