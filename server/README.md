# Server

- https://us-east-1.console.aws.amazon.com/route53/v2/hostedzones?region=eu-central-1#ListRecordSets/Z02855932RMUC6D36HX9V
- https://eu-central-1.console.aws.amazon.com/ec2/home?region=eu-central-1#LoadBalancer:loadBalancerArn=arn:aws:elasticloadbalancing:eu-central-1:311141523602:loadbalancer/app/utils/97f5c494c97c4c97;tab=security
- https://eu-central-1.console.aws.amazon.com/acm/home?region=eu-central-1#/certificates/51849783-60b7-4df9-8606-38d89d7d6cc2
- https://web.solidarity-world.de/smartphone

```shell
ng build
docker build --file server/Dockerfile -t solidarity-world-extensions-server .
docker image save --output server.docker.tar solidarity-world-extensions-server
rsync -avP server.docker.tar aws-solidarity-world:.
ssh aws-solidarity-world docker load --input server.docker.tar
ssh aws-solidarity-world docker run --publish 4200:80 --restart always --detach --name solidarity-world-extensions-server solidarity-world-extensions-server
ssh aws-solidarity-world docker restart solidarity-world-extensions-server
```

- https://stackademic.com/blog/how-to-serve-an-angular-application-with-nginx
