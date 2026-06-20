#!/bin/bash
set -e

echo "Starting TaskFlow Deployment on EC2..."

# 1. Update system
echo "Updating system..."
sudo yum update -y || sudo apt update -y

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    if command -v yum &> /dev/null; then
        sudo yum install -y docker
        sudo service docker start
        sudo usermod -a -G docker ec2-user
    elif command -v apt &> /dev/null; then
        sudo apt install -y docker.io
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker ubuntu
    fi
else
    echo "Docker is already installed."
fi

# 3. Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose is already installed."
fi

# 4. Check Environment Variables
if [ ! -f ".env" ]; then
    echo "WARNING: .env file is missing in the root directory!"
    echo "Please copy env.example to .env and configure it before deploying."
    echo "Run: cp env.example .env && nano .env"
    exit 1
fi

if [ ! -f "auth-service/.env" ]; then
    echo "WARNING: auth-service/.env file is missing!"
    echo "Please copy auth-service/.env.example to auth-service/.env and configure it before deploying."
    echo "Run: cp auth-service/.env.example auth-service/.env && nano auth-service/.env"
    exit 1
fi

# 5. Build and Start Services
echo "Building and starting Docker containers..."
sudo docker-compose down
sudo docker-compose up -d --build

# 6. Apply Database Migrations
echo "Waiting for PostgreSQL to be ready..."
sleep 10
echo "Applying database migrations..."
# Assuming Prisma is installed in the workspace locally
# If the container runs migrations, this can be omitted.
# We will use the web container to push the schema
sudo docker-compose exec -T web npx prisma db push

echo "Deployment completed successfully! Your application should be running on port 3000."
