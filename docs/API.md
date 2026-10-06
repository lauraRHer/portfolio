# API del backend

Base: `http://localhost:8000` · OpenAPI interactivo en `/docs` (solo en desarrollo).

## `GET /api/health`

```json
{ "status": "ok", "llm": "ollama:qwen2.5:3b", "embeddings": "ollama:nomic-embed-text", "indexed_chunks": 58 }
```
El front lo usa al abrir el chat: si falla, muestra el estado "no disponible".

## `POST /api/chat`

**Request**
```json
{
  "message": "¿Qué experiencia tiene Laura?",
  "history": [{ "role": "user", "content": "Hola" }, { "role": "assistant", "content": "¡Hola! …" }],
  "locale": "es"
}
```
| Campo | Reglas |
|---|---|
| `message` | 1–2000 caracteres; el servidor lo recorta a `MAX_MESSAGE_CHARS` (500) |
| `history` | máximo 20 turnos; se usan los últimos `MAX_HISTORY_TURNS` (6). Solo cuentan los turnos `user` (recortados a `MAX_MESSAGE_CHARS`): los del asistente se descartan porque el cliente podría falsificarlos |
| `locale` | `es` \| `en`; se usa si no se puede detectar el idioma de la pregunta |

**Response:** `text/event-stream`

```
event: meta
data: {"kind": "answer", "sources": [{"id": "experiencia", "title": "Experiencia", "section": "experience"}]}

event: token
data: {"text": "Laura "}

event: token
data: {"text": "trabaja en CARTIF…"}

event: done
data: {}
```

| Evento | Cuándo | Datos |
|---|---|---|
| `meta` | siempre, el primero | `kind`: `answer` \| `greeting` \| `refusal` \| `no_info` \| `busy` (demasiados chats a la vez); `sources`: secciones de la web usadas |
| `token` | uno o más | `text`: fragmento de la respuesta (en `greeting`, `refusal`, `no_info` y `busy` llega el texto fijo completo en un único token) |
| `done` | fin correcto | `{}` |
| `error` | fallo del pipeline o del LLM a mitad del stream | `message`: `pipeline_error` \| `llm_error` |

**Códigos HTTP:** `200` (stream), `422` (validación), `429` (rate limit: `RATE_LIMIT_REQUESTS` peticiones por IP en `RATE_LIMIT_WINDOW_SECONDS`).

El tipo TypeScript equivalente está en `front/src/lib/chat/types.ts`. **Si cambias el contrato, cambia ambos.**
