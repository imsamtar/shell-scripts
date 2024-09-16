#!/bin/bash

curl -fsSL https://bun.sh/install | bash
curl -fsSL -o server-setup.ts https://raw.githubusercontent.com/imsamtar/shell-scripts/main/server-setup/setup.ts

$HOME/.bun/bin/bun ./setup.ts
