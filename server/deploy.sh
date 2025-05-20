#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env

# AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
AWS_REGION="ap-southeast-1"
ECR_REPO_NAME="fintech-server"

# Create ECR repository if it doesn't exist
aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} || \
    aws ecr create-repository --repository-name ${ECR_REPO_NAME}

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build the Docker image
docker build -t ${ECR_REPO_NAME} .

# Tag the image
docker tag ${ECR_REPO_NAME}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest

# Push the image to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest

# Store sensitive environment variables in AWS Systems Manager Parameter Store
aws ssm put-parameter --name "/fintech/MONGODB_URI" --value "${MONGODB_URI}" --type "SecureString" --overwrite
aws ssm put-parameter --name "/fintech/JWT_SECRET" --value "${JWT_SECRET}" --type "SecureString" --overwrite
aws ssm put-parameter --name "/fintech/EMAIL_USER" --value "${EMAIL_USER}" --type "SecureString" --overwrite
aws ssm put-parameter --name "/fintech/EMAIL_PASSWORD" --value "${EMAIL_PASSWORD}" --type "SecureString" --overwrite
aws ssm put-parameter --name "/fintech/FIREBASE_CLIENT_EMAIL" --value "${FIREBASE_CLIENT_EMAIL}" --type "SecureString" --overwrite
aws ssm put-parameter --name "/fintech/FIREBASE_PRIVATE_KEY" --value "${FIREBASE_PRIVATE_KEY}" --type "SecureString" --overwrite

# Register new task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Update the service (create if it doesn't exist)
aws ecs describe-services --cluster fintech-cluster --services fintech-server-service || \
    aws ecs create-service \
        --cluster fintech-cluster \
        --service-name fintech-server-service \
        --task-definition fintech-server \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-083310c181f082386],securityGroups=[sg-041301d796e4fff84],assignPublicIp=ENABLED}"

# Update service with new task definition
aws ecs update-service \
    --cluster fintech-cluster \
    --service-name fintech-server-service \
    --task-definition fintech-server \
    --force-new-deployment 