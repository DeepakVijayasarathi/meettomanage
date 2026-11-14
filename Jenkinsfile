pipeline {

    agent any

    options {
        // Avoid concurrent builds fighting over the candidate and production ports.
        disableConcurrentBuilds(abortPrevious: true)
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

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
                    -t ${IMAGE_NAME}:${RELEASE_VERSION} \
                    -f Dockerfile .

                    echo "Docker image build completed"
                """
                }
            }
        }

        stage('Verify Candidate') {
            steps {
                sh """
                    CANDIDATE=${CONTAINER_NAME}-candidate-${BUILD_NUMBER}
                    docker rm -f \${CANDIDATE} >/dev/null 2>&1 || true
                    docker run -d \
                      --name \${CANDIDATE} \
                      -p 127.0.0.1:2101:80 \
                      ${IMAGE_NAME}:${RELEASE_VERSION}
                    for attempt in \$(seq 1 20); do
                      curl --fail --silent http://127.0.0.1:2101/release.json >/dev/null && break
                      test "\${attempt}" -eq 20 && { docker logs --tail 100 \${CANDIDATE}; exit 1; }
                      sleep 1
                    done
                    RELEASE_JSON=\$(curl --fail --silent --show-error http://127.0.0.1:2101/release.json)
                    echo "\${RELEASE_JSON}" | grep -F '"version":"${RELEASE_VERSION}"'
                    echo "\${RELEASE_JSON}" | grep -F '"commit":"${GIT_COMMIT}"'
                    curl --fail --silent http://127.0.0.1:2101/ | grep -F 'Meet to Manage'
                    curl --fail --silent http://127.0.0.1:2101/pricing | grep -F 'Pricing'
                    curl --fail --silent http://127.0.0.1:2101/signup | grep -F 'Create your Meet to Manage workspace'
                    # Verify the Nginx policy itself, not only the page body. These checks
                    # catch add_header inheritance mistakes before production is replaced.
                    curl --fail --silent --head http://127.0.0.1:2101/ | grep -iF 'content-security-policy:' | grep -F "frame-ancestors 'self'"
                    curl --fail --silent --head http://127.0.0.1:2101/login | grep -iF 'x-robots-tag: noindex, follow'
                    curl --fail --silent --head http://127.0.0.1:2101/release.json | grep -iF 'cache-control: no-store'
                    docker rm -f \${CANDIDATE}
                """
            }
        }

        stage('Deploy') {
            steps {
                sh """
                    # Preserve the exact running image for automatic recovery. Build and
                    # candidate verification happen before this point, so normal failures
                    # never interrupt production.
                    OLD_IMAGE=\$(docker inspect --format='{{.Image}}' ${CONTAINER_NAME} 2>/dev/null || true)
                    test -z "\${OLD_IMAGE}" || docker tag "\${OLD_IMAGE}" ${IMAGE_NAME}:rollback
                    docker rm -f ${CONTAINER_NAME} >/dev/null 2>&1 || true
                    docker run -d --restart unless-stopped --name ${CONTAINER_NAME} -p 2100:80 ${IMAGE_NAME}:${RELEASE_VERSION}
                    for attempt in \$(seq 1 20); do
                      curl --fail --silent http://127.0.0.1:2100/release.json >/dev/null && break
                      if test "\${attempt}" -eq 20; then
                        docker logs --tail 100 ${CONTAINER_NAME} || true
                        docker rm -f ${CONTAINER_NAME} || true
                        if docker image inspect ${IMAGE_NAME}:rollback >/dev/null 2>&1; then
                          docker run -d --restart unless-stopped --name ${CONTAINER_NAME} -p 2100:80 ${IMAGE_NAME}:rollback
                        fi
                        exit 1
                      fi
                      sleep 1
                    done
                    RELEASE_JSON=\$(curl --fail --silent --show-error http://127.0.0.1:2100/release.json)
                    echo "\${RELEASE_JSON}"
                    echo "\${RELEASE_JSON}" | grep -F '"version":"${RELEASE_VERSION}"'
                    echo "\${RELEASE_JSON}" | grep -F '"commit":"${GIT_COMMIT}"'
                    docker tag ${IMAGE_NAME}:${RELEASE_VERSION} ${IMAGE_NAME}:latest
                    # Keep the current, rollback and recent immutable images; never prune
                    # unrelated products from this shared host.
                    docker image prune -f >/dev/null || true
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
            sh 'docker rm -f ${CONTAINER_NAME}-candidate-${BUILD_NUMBER} >/dev/null 2>&1 || true'
            cleanWs()
        }
    }
}
