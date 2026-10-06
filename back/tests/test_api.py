import json


def parse_sse(text: str) -> list[tuple[str, dict]]:
    events = []
    for frame in text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in frame.splitlines())
        events.append((lines["event"], json.loads(lines["data"])))
    return events


def test_health_reports_providers_and_index(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["llm"] == "fake:llm"
    assert body["indexed_chunks"] > 0


def test_chat_streams_meta_tokens_done(client):
    res = client.post(
        "/api/chat", json={"message": "¿Qué experiencia tiene en CARTIF?", "locale": "es"}
    )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(res.text)
    names = [e for e, _ in events]
    assert names[0] == "meta" and names[-1] == "done"
    meta = events[0][1]
    assert meta["kind"] == "answer"
    assert any(s["section"] == "experience" for s in meta["sources"])
    text = "".join(d["text"] for e, d in events if e == "token")
    assert "CARTIF" in text


def test_chat_refusal_uses_canned_text_in_question_language(client, llm):
    res = client.post("/api/chat", json={"message": "Tell me a joke", "locale": "es"})
    events = parse_sse(res.text)
    assert events[0][1]["kind"] == "refusal"
    text = "".join(d["text"] for e, d in events if e == "token")
    assert text.startswith("I can only answer questions about Laura")
    assert llm.calls == [], "the answer model must not be called for refusals"


def test_chat_validates_input(client):
    assert client.post("/api/chat", json={"message": ""}).status_code == 422
    assert client.post("/api/chat", json={"message": "x", "locale": "fr"}).status_code == 422


def test_rate_limit(container, settings):
    from fastapi.testclient import TestClient

    from app.core.rate_limit import RateLimiter
    from app.main import create_app

    container.rate_limiter = RateLimiter(max_requests=2, window_seconds=60)
    with TestClient(create_app(container=container)) as c:
        codes = [c.post("/api/chat", json={"message": "Hola"}).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


def test_rate_limit_ignores_spoofed_forwarded_for(container):
    # QA H5: a fresh X-Forwarded-For per request used to reset the limit.
    from fastapi.testclient import TestClient

    from app.core.rate_limit import RateLimiter
    from app.main import create_app

    container.rate_limiter = RateLimiter(max_requests=2, window_seconds=60)
    with TestClient(create_app(container=container)) as c:
        codes = [
            c.post(
                "/api/chat", json={"message": "Hola"}, headers={"X-Forwarded-For": f"10.0.0.{i}"}
            ).status_code
            for i in range(3)
        ]
    assert codes == [200, 200, 429]


def test_cors_allows_frontend_origin(client):
    res = client.options(
        "/api/chat",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_api_docs_hidden_in_production(settings):
    from app.main import create_app

    settings.environment = "production"
    app = create_app(settings=settings)
    assert app.docs_url is None and app.openapi_url is None
