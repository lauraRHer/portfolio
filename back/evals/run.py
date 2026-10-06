"""Run the decision-graph evaluation set against the configured providers.

    uv run python -m evals.run                       # uses .env settings
    CLASSIFIER_MODEL=qwen2.5:0.5b uv run python -m evals.run

Only the decision graph runs (no answer generation), so it is fast enough
to compare models and tune thresholds (see docs/guides/chatbot-rag.md).
"""

import asyncio
import time
from pathlib import Path

import yaml

from app.core.config import get_settings
from app.core.container import build_container
from app.rag.ingest import ensure_index

CASES = Path(__file__).with_name("cases.yaml")


async def main() -> None:
    settings = get_settings()
    c = build_container(settings)
    await ensure_index(
        knowledge_dir=settings.knowledge_dir,
        store=c.store,
        embeddings=c.embeddings,
        marker=c.index_marker,
    )
    graph = c.chat._graph  # noqa: SLF001 - evaluation needs the raw graph
    cases = yaml.safe_load(CASES.read_text())
    print(f"classifier={c.classifier.name} embeddings={c.embeddings.name}\n")

    ok_kind = ok_section = n_section = 0
    t_start = time.perf_counter()
    for case in cases:
        t0 = time.perf_counter()
        state = await graph.ainvoke(
            {"question": case["q"], "history": [], "locale": "es", "trace": []}
        )
        kind = state["kind"].value
        top = state.get("retrieved") or []
        section = top[0].chunk.section if top else None
        kind_ok = kind == case["kind"]
        ok_kind += kind_ok
        sec_ok = None
        if "section" in case and kind_ok:
            n_section += 1
            sec_ok = case["section"] in {r.chunk.section for r in top}
            ok_section += sec_ok
        mark = "✓" if kind_ok and sec_ok is not False else "✗"
        print(
            f"{mark} {case['q'][:48]:<48} expected={case['kind']:<8} got={kind:<8} "
            f"top={section!s:<11} {time.perf_counter() - t0:4.1f}s  {state.get('trace')}"
        )

    total = len(cases)
    print(f"\nscope accuracy:  {ok_kind}/{total} ({ok_kind / total:.0%})")
    if n_section:
        print(f"source recall:   {ok_section}/{n_section} ({ok_section / n_section:.0%})")
    print(f"total time:      {time.perf_counter() - t_start:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
