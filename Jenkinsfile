pipeline {

    agent any

    environment {
        IMAGE_NAME     = 'deepakrajv/meettomanage'
        CONTAINER_NAME = 'meettomanageUi'
        GITHUB_REPO    = 'https://github.com/DeepakVijayasarathi/meettomanage.git'
    }

    triggers {
        githubPush()
    }

    stages {

        stage('Checkout') {
            steps {
                git(
                    url: "${GITHUB_REPO}",
                    branch: 'main',
                    credentialsId: 'github'
                )
            }
        }

        stage('Remove Old Container') {
            steps {
                sh '''
                    echo "Stopping old container..."

                    docker stop ${CONTAINER_NAME} || true
                    docker rm ${CONTAINER_NAME} || true

                    echo "Old container removed"
                '''
            }
        }

        stage('Remove Old Image') {
            steps {
                sh '''
                    echo "Removing old image..."

                    docker rmi ${IMAGE_NAME}:latest || true

                    echo "Old image removed"
                '''
            }
        }

        stage('Clear Docker Cache') {
            steps {
                sh '''
                    echo "Clearing Docker cache..."

                    docker builder prune -af || true
                    docker image prune -af || true

                    echo "Docker cache cleared"
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    echo "Building Docker image..."

                    docker build \
                    --no-cache \
                    --pull \
                    -t ${IMAGE_NAME}:latest \
                    -f Dockerfile .

                    echo "Docker image build completed"
                '''
            }
        }

        stage('Run Container') {
            steps {
                sh '''
                    echo "Starting new container..."

                    docker run -d \
                    --restart unless-stopped \
                    --name ${CONTAINER_NAME} \
                    -p 2100:80 \
                    ${IMAGE_NAME}:latest

                    echo "Container started"
                '''
            }
        }

        stage('Verify Container') {
            steps {
                sh '''
                    echo "Checking container status..."

                    docker ps | grep ${CONTAINER_NAME}

                    echo "Deployment verified"
                '''
            }
        }
    }

    post {

        success {
            echo "✅ Deployment Successful"
        }

        failure {
            echo "❌ Build or Deployment Failed"

            sh '''
                echo "Docker container logs:"
                docker logs ${CONTAINER_NAME} || true
            '''
        }

        always {
            cleanWs()
        }
    }
}