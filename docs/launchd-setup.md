# launchd Setup

1. Run `npm run build`.
2. Run `npm link` so `ai-flow` is available as a command.
3. Copy `examples/launchd/com.owen.ai-flow.tick.plist` to `~/Library/LaunchAgents/`.
4. Replace `REPLACE_WITH_NODE_PATH` with the absolute path from `command -v node`.
5. Replace `REPLACE_WITH_AI_FLOW_SCRIPT_PATH` with the installed script path, such as `/opt/homebrew/lib/node_modules/ai-flow/dist/src/bin/ai-flow.js`.
6. Load it with `launchctl load ~/Library/LaunchAgents/com.owen.ai-flow.tick.plist`.
7. Verify it is loaded with `launchctl list | rg ai-flow`.

This runs `ai-flow scan` every 60 seconds.
