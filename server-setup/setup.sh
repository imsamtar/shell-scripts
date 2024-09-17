#!/bin/bash

sudo apt-get install -y -qq unzip >/dev/null 2>/dev/null
curl -fsSL https://bun.sh/install > /dev/null | bash >/dev/null 2>/dev/null
curl -fsSL -o server-setup.ts https://raw.githubusercontent.com/imsamtar/shell-scripts/main/server-setup/setup.ts >/dev/null 2>/dev/null

echo
echo RUN "$HOME/.bun/bin/bun ./server-setup.ts"
echo
