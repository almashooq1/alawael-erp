#!/bin/bash
# Start development with optimized settings for Windows
export FAST_REFRESH=true
export SKIP_PREFLIGHT_CHECK=true
export CI=false
export DANGEROUSLY_DISABLE_HOST_CHECK=true
export GENERATE_SOURCEMAP=false

# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

npm start
