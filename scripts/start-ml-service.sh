#!/bin/bash
echo "Starting ML Service..."
cd "$(dirname "$0")/../ml"
pip install -r requirements.txt
python service.py














