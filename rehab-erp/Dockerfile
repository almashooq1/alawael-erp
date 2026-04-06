FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit
COPY vite.config.js tailwind.config.js ./
COPY resources/ resources/
RUN npm run build

FROM composer:2.8 AS composer-builder
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer update --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
RUN composer dump-autoload --optimize --no-dev

FROM php:8.4-fpm-alpine
RUN apk add --no-cache nginx sqlite sqlite-dev supervisor curl \
    && docker-php-ext-install pdo_sqlite bcmath
RUN echo "upload_max_filesize=64M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size=64M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit=256M" >> /usr/local/etc/php/conf.d/uploads.ini
WORKDIR /var/www/html
COPY --from=composer-builder /app /var/www/html
COPY --from=frontend-builder /app/public/build public/build
RUN mkdir -p database storage/app/public storage/framework/cache/data \
    storage/framework/sessions storage/framework/testing \
    storage/framework/views storage/logs bootstrap/cache \
    && touch database/database.sqlite \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache database
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost/ || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
