pipeline {

    agent any

    environment {
        IMAGE_NAME     = 'deepakrajv/meettomanage'
        CONTAINER_NAME = 'meettomanageUi'
        GITHUB_REPO    = 'https://github.com/DeepakVijayasarathi/meettomanage.git'
    }

    triggers {
        githubPush()
        // Blog posts are published from the API on a schedule. Rebuild shortly after the
        // final daily publishing slot so every new article gets crawler-ready HTML instead
        // of temporarily falling back to the homepage SPA shell.
        cron('TZ=Asia/Kolkata\nH 14 * * *')
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

        stage('Quality Gate') {
            steps {
                sh '''
                    npm ci
                    npm run lint
                    npm test -- --run
                    npm run build
                '''
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
                script {
                env.RELEASE_VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(12)}"
                sh """
                    echo "Building Docker image..."

                    docker build \
                    --no-cache \
                    --pull \
                    --build-arg RELEASE_VERSION=${RELEASE_VERSION} \
                    --build-arg GIT_COMMIT=${GIT_COMMIT} \
                    -t ${IMAGE_NAME}:latest \
                    -f Dockerfile .

                    echo "Docker image build completed"
                """
                }
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
                sh """
                    echo "Checking container status..."

                    docker ps | grep ${CONTAINER_NAME}
                    for attempt in \$(seq 1 20); do
                      curl --fail --silent http://127.0.0.1:2100/release.json >/dev/null && break
                      test "\${attempt}" -eq 20 && { docker logs --tail 100 ${CONTAINER_NAME}; exit 1; }
                      sleep 1
                    done
                    RELEASE_JSON=\$(curl --fail --silent --show-error http://127.0.0.1:2100/release.json)
                    echo "\${RELEASE_JSON}"
                    echo "\${RELEASE_JSON}" | grep -F '"version":"${RELEASE_VERSION}"'
                    echo "\${RELEASE_JSON}" | grep -F '"commit":"${GIT_COMMIT}"'
                    # Conversion-path smoke checks: the new release is not healthy merely
                    # because nginx answers; its critical public routes must render too.
                    curl --fail --silent http://127.0.0.1:2100/ | grep -F 'Meet to Manage'
                    curl --fail --silent http://127.0.0.1:2100/pricing | grep -F 'Pricing'
                    curl --fail --silent http://127.0.0.1:2100/signup | grep -F 'Create your Meet to Manage workspace'

                    echo "Deployment verified"
                """
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
