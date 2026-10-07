"""Ping every model of LLM_CHAIN / CLASSIFIER_CHAIN on its own (no fallback).

    uv run --extra openai python -m evals.check_llms

Checks keys and model ids before deploying, and shows which free models are
exhausted right now. Each model gets one short request.
"""

import asyncio
import time

from app.core.config import get_settings
from app.domain.models import Message
from app.providers.llm.factory import build_model
from app.providers.llm.fallback import CooldownPolicy, classify_failure

PROMPT = [Message("user", "Reply with just the word: OK")]


async def main() -> None:
    settings = get_settings()
    specs = {s.name: s for s in settings.answer_models + settings.classifier_models}
    policy = CooldownPolicy()
    failed = 0
    for spec in specs.values():
        t0 = time.perf_counter()
        try:
            llm = build_model(settings, spec, max_tokens=50, temperature=0.0, max_retries=0)
            reply = await asyncio.wait_for(llm.complete(PROMPT), settings.llm_timeout_seconds)
            status = f"ok     {reply.strip()[:40]!r}" if reply.strip() else "EMPTY"
            failed += not reply.strip()
        except Exception as e:
            reason, _ = classify_failure(e, policy)
            status = f"FAIL   {reason}: {str(e).splitlines()[0][:120]}"
            failed += 1
        print(f"{spec.name:<60} {time.perf_counter() - t0:5.1f}s  {status}")
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    asyncio.run(main())
