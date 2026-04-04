FROM php:8.3-fpm-alpine AS builder

RUN apk add --no-cache \
    git curl libpng-dev libjpeg-turbo-dev libwebp-dev \
    libzip-dev zip unzip oniguruma-dev icu-dev \
    nodejs npm supervisor nginx

RUN docker-php-ext-install \
    pdo_mysql mbstring exif pcntl bcmath \
    gd zip intl opcache

RUN pecl install redis && docker-php-ext-enable redis

COPY docker/production/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

COPY . .
RUN composer run-script post-autoload-dump || true

COPY package.json package-lock.json ./
RUN npm ci && npm run build && rm -rf node_modules

# ────────────────────────────────────────────────────
FROM php:8.3-fpm-alpine AS production

COPY --from=builder /var/www/html /var/www/html
COPY --from=builder /usr/local/lib/php/extensions /usr/local/lib/php/extensions
COPY --from=builder /usr/local/etc/php/conf.d /usr/local/etc/php/conf.d

RUN apk add --no-cache supervisor nginx curl

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

COPY docker/production/nginx.conf /etc/nginx/nginx.conf
COPY docker/production/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

WORKDIR /var/www/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
