#!/bin/bash

# Exit on error
set -e

# AWS account ID and region
AWS_ACCOUNT_ID=737416203480
AWS_REGION="ap-southeast-1"
ECR_REPO_NAME="fintech-client"

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

# Register new task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Update the service (create if it doesn't exist)
aws ecs describe-services --cluster fintech-cluster --services fintech-client-service || \
    aws ecs create-service \
        --cluster fintech-cluster \
        --service-name fintech-client-service \
        --task-definition fintech-client \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-083310c181f082386],securityGroups=[sg-041301d796e4fff84],assignPublicIp=ENABLED}"

# Update service with new task definition
aws ecs update-service \
    --cluster fintech-cluster \
    --service-name fintech-client-service \
    --task-definition fintech-client \
    --force-new-deployment 