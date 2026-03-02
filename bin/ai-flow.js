#!/usr/bin/env node

import { buildAiFlowProgram } from "../dist/src/bin/ai-flow.js";

await buildAiFlowProgram().parseAsync(process.argv);
