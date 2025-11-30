export interface TreeItem {
  path: string;
  type: 'blob' | 'tree';
  mode: string;
  sha: string;
  url: string;
  size?: number;
}

export interface ParsedTreeItem extends TreeItem {
  projectName: string;
  subdir: string;
}

export function parseTreeResponse(treeItems: TreeItem[]): ParsedTreeItem[] {
  const pattern = /^(?:(.+?)\/)?\.kiro\/specs\/([^/]+)$/;

  return treeItems
    .filter(item => item.path.includes('.kiro/specs/'))
    .filter(item => item.type === 'tree')
    .map(item => {
      const match = item.path.match(pattern);

      if (!match) {
        return null;
      }

      const subdir = match[1] || '';
      const projectName = match[2];

      return {
        ...item,
        projectName,
        subdir,
      };
    })
    .filter((item): item is ParsedTreeItem => item !== null);
}
