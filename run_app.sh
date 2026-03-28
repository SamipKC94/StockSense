#!/bin/bash

# Define styling
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==> Checking your Mac environment...${NC}"

# Check Node
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed! You must install Node to run a MERN project locally.${NC}"
    echo "Please download Node from: https://nodejs.org/"
    exit 1
fi

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    echo -e "${RED}WARNING: MongoDB does not appear to be installed globally on your machine.${NC}"
    echo "The Backend may crash without a database connection."
fi

# Start Backend
echo -e "${GREEN}==> Starting Node Backend...${NC}"
cd server
npm install
npm start &
BACKEND_PID=$!

# Start Frontend
echo -e "${GREEN}==> Starting React Frontend...${NC}"
cd ../client
npm install
npm run dev

# Terminate backend if frontend shuts down
kill $BACKEND_PID
