#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and update your credentials."
    echo "cp .env.example .env"
    exit 1
fi

echo "Starting local development server..."
npm run dev
