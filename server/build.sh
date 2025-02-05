ng build
docker build --file server/Dockerfile -t solidarity-world-extensions-server .
docker image save --output server.docker.tar solidarity-world-extensions-server
rsync -avP server.docker.tar aws-solidarity-world:.

ssh aws-solidarity-world docker load --input server.docker.tar
ssh aws-solidarity-world docker kill solidarity-world-extensions-server
ssh aws-solidarity-world docker rm solidarity-world-extensions-server
ssh aws-solidarity-world docker run --publish 4200:80 --restart always --detach --name solidarity-world-extensions-server solidarity-world-extensions-server