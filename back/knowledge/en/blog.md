---
title: Logbook (blog)
section: blog
---

<!-- Generado por front/scripts/export-blog-knowledge.mjs. No editar a mano. -->

## Post on Laura's blog: "Hybrid search: why BM25 still rescues embeddings"
Laura published this post on her logbook (blog) on November 12, 2026. It can be read at /en/blog/busqueda-hibrida. Laura explains why the RAG assistant on her portfolio combines keyword search (BM25) with embedding search, merged with Reciprocal Rank Fusion. With a small embedding model, Spanish questions failed, and cosine similarity couldn't tell on-topic from off-topic questions, so an LLM router decides the scope. She describes how she measured it with her own evaluation set and how, if embeddings fail in production, the assistant keeps answering with BM25 alone.

## Post on Laura's blog: "A free chatbot that never goes silent: a fallback chain across models"
Laura published this post on her logbook (blog) on October 28, 2026. It can be read at /en/blog/fallback-modelos-gratuitos. Laura explains how she keeps her portfolio assistant running on free LLM tiers only (Groq, Google AI Studio, OpenRouter). She designed her own fallback chain as a decorator of the LLMProvider port: it walks an ordered list of models and puts each failing model on a cooldown that depends on the cause (per-minute limit, daily quota, retired model, error). When streaming it only switches model before the first token. She explains why she ruled out LangChain's with_fallbacks and LiteLLM, and which limitations she accepts.
