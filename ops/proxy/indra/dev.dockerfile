FROM alpine:3.10

RUN apk add --update --no-cache bash certbot curl iputils nginx openssl && \
    openssl dhparam -out /etc/ssl/dhparam.pem 2048 && \
    ln -fs /dev/stdout /var/log/nginx/access.log && \
    ln -fs /dev/stdout /var/log/nginx/error.log

# https://github.com/moby/moby/issues/37965#issuecomment-426853382
COPY ops/wait-for.sh /root/wait-for.sh
RUN true
COPY ops/proxy/indra/dev.conf /etc/nginx/nginx.conf
RUN true
COPY ops/proxy/indra/entry.sh /root/entry.sh

ENTRYPOINT ["bash", "/root/entry.sh"]
