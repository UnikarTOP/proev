#!/bin/bash
certbot --nginx \
  -d proev.ru -d www.proev.ru \
  -d api.proev.ru \
  -d deploy.proev.ru \
  --non-interactive --agree-tos \
  --email hello@proev.ru
systemctl enable certbot.timer
echo "SSL готов!"
