import { join } from "node:path";

import {
  AI_FLOW_HOME_DIRNAME,
  DEFAULT_DESKTOP_DIR,
  DEFAULT_HOME_DIR
} from "../constants.js";

function padSequence(sequence: number): string {
  return String(sequence).padStart(3, "0");
}

export function slugifyProjectName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export function getAiFlowRootPaths(
  homeDir = DEFAULT_HOME_DIR,
  desktopDir = DEFAULT_DESKTOP_DIR
) {
  const aiFlowHome = join(homeDir, AI_FLOW_HOME_DIRNAME);

  return {
    homeDir,
    desktopDir,
    aiFlowHome,
    configFile: join(aiFlowHome, "config.json"),
    projectsDir: join(aiFlowHome, "projects"),
    stateDir: join(aiFlowHome, "state"),
    datasetDir: join(aiFlowHome, "dataset"),
    rawDir: join(aiFlowHome, "raw"),
    errorsLogFile: join(aiFlowHome, "state", "last-errors.log")
  };
}

export function getProjectPaths(projectRoot: string, projectSlug: string) {
  const promptDir = join(projectRoot, "prompt");
  const projectMetaDir = join(promptDir, "_project");

  return {
    projectRoot,
    projectSlug,
    promptDir,
    projectMetaDir,
    projectStatusFile: join(projectMetaDir, "project-status.md"),
    timelineFile: join(projectMetaDir, "timeline.md"),
    reusablePatternsFile: join(projectMetaDir, "reusable-patterns.md"),
    skillBacklogFile: join(projectMetaDir, "skill-backlog.md"),
    automationBacklogFile: join(projectMetaDir, "automation-backlog.md"),
    taskDir(taskSlug: string) {
      return join(promptDir, taskSlug);
    },
    taskPromptFile(taskSlug: string, sequence: number) {
      return join(promptDir, taskSlug, `prompt-${padSequence(sequence)}.md`);
    },
    taskPlanFile(taskSlug: string, sequence: number) {
      return join(promptDir, taskSlug, `plan-${padSequence(sequence)}.md`);
    },
    taskPlanDocumentFile(taskSlug: string) {
      return join(promptDir, taskSlug, "plan.md");
    },
    setupGuideFile(taskSlug: string, guideSlug: string) {
      return join(promptDir, taskSlug, `setup-guide-${guideSlug}.md`);
    }
  };
}

