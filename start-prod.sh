#!/bin/bash

export PORT=${PORT:-5000}
export HOSTNAME="0.0.0.0"

echo "Starting production server on port $PORT..."
exec npm run start
