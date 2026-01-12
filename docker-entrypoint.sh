#!/bin/sh
set -e

echo "Starting Planning Poker application..."

# Start Node.js server in the background
echo "Starting Node.js server on port 3001..."
cd /app/server
node dist/index.js &
NODE_PID=$!

echo "Node.js server started with PID: $NODE_PID"

# Wait a moment for the server to start
sleep 2

# Start Nginx in the foreground
echo "Starting Nginx on port 80..."
nginx -g 'daemon off;' &
NGINX_PID=$!

echo "Nginx started with PID: $NGINX_PID"
echo "Planning Poker is ready!"
echo "Access the application at http://localhost"

# Wait for either process to exit
wait -n $NODE_PID $NGINX_PID

# Exit with status of process that exited first
exit $?
