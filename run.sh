#!/usr/bin/env bash
set -e

echo "Starting VidyutSetu AMI Interoperability Testing Workbench..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000
