// Deploys the frontend SPA container. Unlike the backend, the build takes no runtime
// secrets — VITE_* config is baked in at build time from .env.production, which is
// committed to the repo (see that file's own comments for why).
pipeline {
    agent any

    environment {
        IMAGE_NAME         = 'deepakrajv/readernestfrontend'
        CONTAINER_NAME     = 'readernestfrontend'
        GITHUB_REPO        = 'https://github.com/Deepan45/the-reader-nest-frontend.git'

        DOCKER_NETWORK     = 'reader-network'
    }

    triggers {
        githubPush()
    }

    stages {

        stage('Checkout') {
            steps {
                git(
                    branch: 'main',
                    url: "${GITHUB_REPO}",
                    credentialsId: 'github'
                )
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build \
                      -t ${IMAGE_NAME}:latest \
                      -f Dockerfile .
                """
            }
        }

        stage('Create Docker Network') {
            steps {
                sh """
                    docker network inspect ${DOCKER_NETWORK} >/dev/null 2>&1 || \
                    docker network create ${DOCKER_NETWORK}
                """
            }
        }

        stage('Remove Old Container') {
            steps {
                sh """
                    docker stop ${CONTAINER_NAME} || true
                    docker rm ${CONTAINER_NAME} || true
                """
            }
        }

        stage('Run Container') {
            steps {
                sh """
                    docker run -d \
                      --name ${CONTAINER_NAME} \
                      --network ${DOCKER_NETWORK} \
                      -p 1001:80 \
                      --restart unless-stopped \
                      ${IMAGE_NAME}:latest
                """
            }
        }

        stage('Verify Deployment') {
            steps {
                sh """
                    sleep 10
                    docker ps | grep ${CONTAINER_NAME}
                    docker logs --tail 50 ${CONTAINER_NAME}
                """
            }
        }
    }

    post {
        success {
            echo '✅ ReaderNest Frontend deployed successfully on port 1001'
        }

        failure {
            echo '❌ Deployment failed. Check Jenkins console logs.'
        }

        always {
            cleanWs()
        }
    }
}

// ---------------------------------------------------------------------------------------
// Jenkins setup required (one-time, before the first run of this pipeline):
// Just a GitHub webhook/credential like the backend uses — no secret text credentials
// needed here since there are no runtime secrets baked into this build.
// ---------------------------------------------------------------------------------------
