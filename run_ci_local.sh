#!/bin/bash
set -e

# Run the Python Quality Gate runner with pass-through arguments ($@)
python3 run_checks.py "$@"
