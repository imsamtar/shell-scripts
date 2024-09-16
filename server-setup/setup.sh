#!/bin/bash

sudo apt-get install -y -qq unzip
curl -fsSL https://bun.sh/install | bash
curl -fsSL -o server-setup.ts https://raw.githubusercontent.com/imsamtar/shell-scripts/main/server-setup/setup.ts

echo
echo RUN "$HOME/.bun/bin/bun ./server-setup.ts"
echo
