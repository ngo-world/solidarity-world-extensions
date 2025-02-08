# use the latest version of the official nginx image as the base image
FROM nginx:latest
# copy the custom nginx configuration file to the container in the
# default location
COPY server/nginx_solidarity_world_web.conf /etc/nginx/conf.d/default.conf
# copy the built Angular app files to the default nginx html directory
COPY dist/solidarity-world-web/browser /app

#USER nginx

HEALTHCHECK --interval=1s --timeout=1s --retries=1 CMD curl --fail http://localhost:80/smartphone

# the paths are relative from the Docker file