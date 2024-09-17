#!/bin/bash

sudo apt-get install -y -qq unzip > /dev/null 2>&1
curl -fsSL https://bun.sh/install | bash > /dev/null 2>&1
curl -fsSL -o server-setup.ts https://raw.githubusercontent.com/imsamtar/shell-scripts/main/server-setup/setup.ts > /dev/null 2>&1

echo
echo RUN "$HOME/.bun/bin/bun ./server-setup.ts"
echo
