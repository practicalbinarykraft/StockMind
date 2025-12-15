---
name: Cloudflare Tunnel SSL
overview: Настройка Cloudflare Tunnel для получения HTTPS доступа к приложению без необходимости покупать домен или настраивать SSL-сертификаты вручную.
todos:
  - id: install-cloudflared
    content: Установить cloudflared на сервер
    status: in_progress
  - id: create-tunnel
    content: Создать и запустить Cloudflare Tunnel
    status: pending
  - id: update-env
    content: Добавить USE_HTTPS=true в .env
    status: pending
  - id: restart-app
    content: Перезапустить приложение через PM2
    status: pending
---

# Настройка Cloudflare Tunnel для HTTPS

## Что такое Cloudflare Tunnel

Cloudflare Tunnel создает защищенное соединение между вашим сервером и сетью Cloudflare. Трафик идет:

```
Браузер --HTTPS--> Cloudflare --Tunnel--> Ваш сервер (localhost:5000)
```

**Преимущества:**

- Бесплатный SSL-сертификат
- Бесплатный subdomain (`xxx.trycloudflare.com`) или свой домен
- Не нужно открывать порты на файрволе
- DDoS защита от Cloudflare

---

## Шаги установки

### 1. Установить cloudflared на сервер

**Linux (Ubuntu/Debian):**

```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

**Windows:**

```powershell
winget install cloudflare.cloudflared
```

### 2. Быстрый запуск (без аккаунта Cloudflare)

Самый простой способ - получить временный subdomain:

```bash
cloudflared tunnel --url http://localhost:5000
```

Выведет URL вида: `https://random-name.trycloudflare.com`

### 3. Постоянный туннель (с аккаунтом Cloudflare)

Для постоянного subdomain:

```bash
# Авторизация
cloudflared tunnel login

# Создание туннеля
cloudflared tunnel create stockmind

# Запуск
cloudflared tunnel run --url http://localhost:5000 stockmind
```

### 4. Обновить код приложения

После настройки туннеля, в [server/lib/cookie-auth.ts](server/lib/cookie-auth.ts) установить:

```typescript
const useSecure = isProduction && process.env.USE_HTTPS === 'true';
```

И добавить в `.env`:

```
USE_HTTPS=true
```

### 5. Запуск как сервис (опционально)

Для автозапуска при перезагрузке сервера:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Результат

После настройки:

- Сайт доступен по HTTPS: `https://your-tunnel.trycloudflare.com`
- Cookie работает с `secure: true`
- Соединение защищено SSL