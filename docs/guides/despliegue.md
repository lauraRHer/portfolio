# Despliegue

## Opción recomendada
| Parte | Dónde | Notas |
|---|---|---|
| Front | **Vercel** (o cualquier hosting Node / contenedor) | Variables: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` |
| Back | **Railway / Fly.io / Render / VPS** con Docker | Modelos alojados: un VPS sin GPU es demasiado lento para LLMs locales. Con planes gratuitos, usa una [cadena de fallback](cambiar-proveedor-llm.md#producción-con-modelos-gratuitos-cadena-de-fallback) (`LLM_CHAIN`) |

## Back en Render
[`render.yaml`](../../render.yaml) describe el servicio (plan gratuito, Frankfurt, Dockerfile de `back/`, cadena de modelos gratuitos). En Render: *New → Blueprint* sobre el repositorio; pide los valores marcados con `sync: false` (las claves y `CORS_ORIGINS`), que no se guardan en el repo.

- El plan gratuito se duerme tras 15 minutos sin tráfico y tarda alrededor de un minuto en despertar. La web llama a `/api/health` al cargar para que ese arranque ocurra mientras el visitante navega.
- No necesita disco: al arrancar, el back vuelve a indexar `knowledge/` (unos segundos con Gemini).

## Back con Docker
```bash
cd back
docker build -t portfolio-api --build-arg UV_EXTRAS="--extra openai" .
docker run -p 8000:8000 --env-file .env -v portfolio-data:/app/data portfolio-api
```
- Monta `/app/data` como volumen: es el índice de Chroma.
- `CORS_ORIGINS=["https://tu-dominio.com"]`.
- Detrás de un proxy, el rate limit usa la IP que resuelve uvicorn (`--proxy-headers`). Solo se fía de `X-Forwarded-For` si la petición viene de una IP de `FORWARDED_ALLOW_IPS` (por defecto `127.0.0.1`): ponla a la IP del proxy, o `*` si el contenedor solo es accesible a través de él.
- Concurrencia: `MAX_CONCURRENT_CHATS` (2) respuestas a la vez; el resto espera `CHAT_QUEUE_SECONDS` (10) y recibe un aviso de «ocupado». `LLM_TIMEOUT_SECONDS` (120) limita cada llamada al modelo. Los valores por defecto están pensados para un modelo local; con modelos alojados, `MAX_CONCURRENT_CHATS` puede subir (p. ej. 6) y `LLM_TIMEOUT_SECONDS` bajar (p. ej. 45). Ten en cuenta que el límite por minuto de cada plan gratuito es por clave, no por visitante.
- Antes de desplegar, comprueba claves y modelos con `uv run --extra openai python -m evals.check_llms`.
- En nginx, desactiva el buffering para SSE (`proxy_buffering off;`). La API ya envía `X-Accel-Buffering: no`.

## Todo en local con Docker Compose
```bash
docker compose up --build    # web :3000 · api :8000
```
Ollama corre en el host. Para que el contenedor llegue a él:
```bash
sudo systemctl edit ollama   # añade:
# [Service]
# Environment="OLLAMA_HOST=0.0.0.0"
sudo systemctl restart ollama
```

## Front
```bash
cd front
npm run build && npm start      # o el Dockerfile (output standalone)
```
Las variables `NEXT_PUBLIC_*` se incrustan en el build: cámbialas y vuelve a construir.
