import type { ParsedTreeItem } from './tree-response-parser.js';

export interface ProjectLocation extends ParsedTreeItem {
  name: string;
  displayName: string;
}

export function buildProjectLocations(parsedItems: ParsedTreeItem[]): ProjectLocation[] {
  return parsedItems.map((item) => {
    const displayName = item.subdir ? `${item.subdir}/${item.projectName}` : item.projectName;

    return {
      ...item,
      name: item.projectName,
      displayName,
    };
  });
}
