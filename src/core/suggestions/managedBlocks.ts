import { MANAGED_BLOCK_END, MANAGED_BLOCK_START } from "../constants.js";

export function replaceManagedBlock(
  contents: string,
  newBlockContents: string
): string | null {
  const startIndex = contents.indexOf(MANAGED_BLOCK_START);
  const endIndex = contents.indexOf(MANAGED_BLOCK_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return null;
  }

  const before = contents.slice(0, startIndex + MANAGED_BLOCK_START.length);
  const after = contents.slice(endIndex);

  return `${before}\n${newBlockContents}\n${after}`;
}
