#!/bin/bash

curl -fsSL https://bun.sh/install | bash
curl -fsSL -o server-setup.ts https://sveltedev.com/server-setup

$HOME/.bun/bin/bun ./setup.ts
