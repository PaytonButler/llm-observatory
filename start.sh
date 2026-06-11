#!/bin/bash
echo "Current directory: $(pwd)"
echo "Files here:"
ls -la
echo "Backend contents:"
ls -la backend/ 2>/dev/null || echo "No backend folder found"
uvicorn main:app --host 0.0.0.0 --port 10000