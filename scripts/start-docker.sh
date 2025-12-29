#!/bin/bash

echo "🐋 Checking Docker status..."

# Function to check if Docker is running
check_docker() {
    docker info > /dev/null 2>&1
    return $?
}

# Check if Docker is already running
if check_docker; then
    echo "✅ Docker is already running!"
    exit 0
fi

echo "⚠️  Docker is not running. Starting Docker Desktop..."

# Start Docker Desktop on Windows
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Try to find Docker Desktop executable
    DOCKER_DESKTOP="/c/Program Files/Docker/Docker/Docker Desktop.exe"

    if [[ -f "$DOCKER_DESKTOP" ]]; then
        echo "Starting Docker Desktop..."
        "$DOCKER_DESKTOP" &

        # Wait for Docker to be ready (max 60 seconds)
        COUNTER=0
        MAX_ATTEMPTS=60

        while ! check_docker; do
            if [ $COUNTER -ge $MAX_ATTEMPTS ]; then
                echo "❌ Docker failed to start within 60 seconds."
                echo "Please start Docker Desktop manually and try again."
                exit 1
            fi

        		echo "Waiting for Docker to be ready..."

            sleep 1
            ((COUNTER++))
        done

        echo ""
        echo "✅ Docker is ready!"
        exit 0
    else
        echo "❌ Docker Desktop not found at: $DOCKER_DESKTOP"
        echo "Please install Docker Desktop or update the path in scripts/start-docker.sh"
        exit 1
    fi
else
    echo "❌ This script is designed for Windows with Git Bash."
    echo "Please start Docker manually."
    exit 1
fi
