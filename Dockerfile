FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY public/ /usr/share/nginx/html/
