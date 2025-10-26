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

<p align="center">
	<img alt="logo" width="196" src="https://raw.githubusercontent.com/yukihirop/kirox/main/docs/public/npx-kirox.png">
</p>

<p align="center">
	<img alt="kirox demo" width="800" src="https://raw.githubusercontent.com/yukihirop/kirox/main/demo/kirox-demo.gif">
</p>

### Key Features

- **Fetch files from remote repositories**: Automatically fetch files from `.kiro/specs/` and `.kiro/steering/` directories
- **Overwrite protection**: Confirmation prompt for existing files
- **Branch specification**: Specify branches using `owner/repo#branch` format
- **Subdirectory support**: Fetch from subdirectories within repositories
- **Shell completion**: Support for bash, zsh, fish, and PowerShell

For more details, see the [Guide](/guide/).
