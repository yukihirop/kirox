---
layout: home

hero:
  name: Kirox
  text: Recycle .kiro CLI
  tagline: CLI tool to fetch Kiro specification and steering files from remote GitHub repositories
  image:
    src: /logo.png
    alt: kirox
  actions:
    - theme: brand
      text: Getting Started
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/yukihirop/kirox

features:
  - icon: 📦
    title: Fetch Files from Remote Repositories
    details: Automatically fetch all files from .kiro/specs/<project> and .kiro/steering/ directories in specified GitHub repositories
  - icon: ⚡
    title: Instant Execution with npx
    details: No global installation required, run immediately with npx kirox command
  - icon: 🛡️
    title: Overwrite Protection
    details: Confirmation prompt to prevent unintended overwriting of existing local files
  - icon: 📊
    title: Progress Visualization
    details: Real-time display of file fetching progress with summary of successes and failures upon completion
  - icon: 🎯
    title: Flexible Configuration
    details: Customize behavior with configuration file (.kiroxrc.json) and support for multiple options (--force, --dry-run, --verbose)
  - icon: 🔄
    title: Update Tracking
    details: Track changes in remote repositories and detect differences with local files
---

## Quick Start

### Installation

You can run instantly using npx:

```bash
npx kirox

✔ 📦 Enter GitHub repository (owner/repo or owner/repo#branch) yukihirop/eg-kanban

Fetching branches...
? 🌿 Select branch (type to filter, enter to confirm): (Search: "test")
❯◉ main (default)
 ◯ develop
 ◯ test
 ◯ feature/new-ui
(Press space to select, enter to proceed)

✔ Selected branch: test

Scanning repository for projects...
Found 4 projects across 3 subdirectories

? 📋 Select projects (type to filter, space to select, enter to confirm): (Search: "lib/a")
❯◉ lib/a/simple-kanban-board-a
 ◉ lib/a/simple-kanban-board-b
(Press space to select, enter to proceed)

✔ 📂 Enter output directory .

Configuration:
  Repository: yukihirop/eg-kanban#test
  Project: simple-kanban-board-a, simple-kanban-board-b
  Output: .
  Subdirectory: lib/a

✔ 🚀 Execute with this configuration? Yes
Fetching files from yukihirop/eg-kanban#test/lib/a/.kiro
Fetching 2 projects: simple-kanban-board-a, simple-kanban-board-b
Source: yukihirop/eg-kanban (branch: test)
[INFO] 2025-10-09T14:13:11 Fetching directory listings from GitHub {"repository":"yukihirop/eg-kanban#test","project":"simple-kanban-board-a","branch":"test"}
[INFO] 2025-10-09T14:13:12 Fetching file contents {"count":8}
[simple-kanban-board-a] [1/8] 📥 Fetching .kiro/specs/simple-kanban-board-a/design.md...
✓ Saved: .kiro/specs/simple-kanban-board-a/design.md
[simple-kanban-board-a] [2/8] 📥 Fetching .kiro/steering/product.md...
✓ Saved: .kiro/steering/product.md
[simple-kanban-board-a] [3/8] 📥 Fetching .kiro/specs/simple-kanban-board-a/tasks.md...
✓ Saved: .kiro/specs/simple-kanban-board-a/tasks.md
[simple-kanban-board-a] [4/8] 📥 Fetching .kiro/specs/simple-kanban-board-a/spec.json...
✓ Saved: .kiro/specs/simple-kanban-board-a/spec.json
[simple-kanban-board-a] [5/8] 📥 Fetching .kiro/specs/simple-kanban-board-a/requirements.md...
✓ Saved: .kiro/specs/simple-kanban-board-a/requirements.md
[simple-kanban-board-a] [6/8] 📥 Fetching .kiro/steering/tech.md...
✓ Saved: .kiro/steering/tech.md
[simple-kanban-board-a] [7/8] 📥 Fetching .kiro/steering/testing.md...
✓ Saved: .kiro/steering/testing.md
[simple-kanban-board-a] [8/8] 📥 Fetching .kiro/steering/structure.md...
✓ Saved: .kiro/steering/structure.md
✓ Saved metadata: .kiro/.kirox-meta.json
[simple-kanban-board-a] Completed: 8 files succeeded, 0 files failed
[INFO] 2025-10-09T14:13:13 Fetching directory listings from GitHub {"repository":"yukihirop/eg-kanban#test","project":"simple-kanban-board-b","branch":"test"}
[INFO] 2025-10-09T14:13:13 Fetching file contents {"count":4}
[simple-kanban-board-b] [1/4] 📥 Fetching .kiro/specs/simple-kanban-board-b/spec.json...
✓ Saved: .kiro/specs/simple-kanban-board-b/spec.json
[simple-kanban-board-b] [2/4] 📥 Fetching .kiro/specs/simple-kanban-board-b/requirements.md...
✓ Saved: .kiro/specs/simple-kanban-board-b/requirements.md
[simple-kanban-board-b] [3/4] 📥Fetching .kiro/specs/simple-kanban-board-b/design.md...
✓ Saved: .kiro/specs/simple-kanban-board-b/design.md
[simple-kanban-board-b] [4/4] 📥 Fetching .kiro/specs/simple-kanban-board-b/tasks.md...
✓ Saved: .kiro/specs/simple-kanban-board-b/tasks.md
✓ Saved metadata: .kiro/.kirox-meta.json
[simple-kanban-board-b] Completed: 4 files succeeded, 0 files failed

Summary:
  Fetched from: lib/a
  Source: (branch: test)
  12 files succeeded
  0 files failed

=== Overall Summary ===
Projects: 2
Total files: 12
Succeeded: 12 files
Failed: 0 files
[INFO] 2025-10-09T14:13:13 Execution completed {"filesDownloaded":12,"filesFailed":0,"total":12}
```

### Key Features

- **Fetch files from remote repositories**: Automatically fetch files from `.kiro/specs/` and `.kiro/steering/` directories
- **Overwrite protection**: Confirmation prompt for existing files
- **Branch specification**: Specify branches using `owner/repo#branch` format
- **Subdirectory support**: Fetch from subdirectories within repositories
- **Shell completion**: Support for bash, zsh, fish, and PowerShell

For more details, see the [Guide](/guide/).
