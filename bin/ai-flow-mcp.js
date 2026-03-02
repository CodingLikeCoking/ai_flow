#!/usr/bin/env node

import { buildAiFlowMcpProgram } from "../dist/src/bin/ai-flow-mcp.js";

await buildAiFlowMcpProgram().parseAsync(process.argv);
