# use the latest version of the official nginx image as the base image
FROM nginx:1.27.3
# copy the custom nginx configuration file to the container in the
# default location
COPY server/nginx.conf /etc/nginx/nginx.conf
# copy the built Angular app files to the default nginx html directory
COPY dist/solidarity-world-smartphone/browser /usr/share/nginx/html

# the paths are relative from the Docker file