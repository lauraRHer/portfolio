---
title: "Hybrid search: why BM25 still rescues embeddings"
excerpt: "My portfolio assistant couldn't find where I studied. The model wasn't the problem; retrieval was."
assistantSummary: >
  Laura explains why the RAG assistant on her portfolio combines keyword search
  (BM25) with embedding search, merged with Reciprocal Rank Fusion. With a small
  embedding model, Spanish questions failed, and cosine similarity couldn't tell
  on-topic from off-topic questions, so an LLM router decides the scope. She
  describes how she measured it with her own evaluation set and how, if
  embeddings fail in production, the assistant keeps answering with BM25 alone.
---

## The symptom

I asked my own assistant "Where did she study?" and it couldn't answer. The information was in the knowledge base, in a chunk about education, but it never reached the model. The model wasn't the problem: it had never seen that chunk.

In development I was using `nomic-embed-text`, a small embedding model trained mostly on English. With short questions in Spanish, the question vector and the right chunk's vector weren't close enough.

## Why moving a threshold wasn't enough

My first attempt was tuning the similarity threshold. That's where I hit the second problem: on-topic and off-topic questions scored about the same, between 0.55 and 0.68. Any threshold either dropped good questions or let through ones that had nothing to do with me.

So similarity couldn't be the only filter, neither for retrieval nor for deciding whether a question made sense.

## BM25, the veteran

BM25 is classic keyword search: it scores a chunk by how often the question's terms appear in it and how rare they are overall. It doesn't understand synonyms, but it doesn't miss proper nouns, technologies or companies, which is exactly what people ask about in a portfolio.

The knowledge base is small, so the index lives in memory and is plain Python. Before comparing, every text goes through three steps:

- strip accents and lowercase;
- remove Spanish and English stop words;
- cut every word to its first 5 letters, a very basic stemming that makes "estudió" and "estudios" match.

## Merging two rankings with RRF

The two retrievers return scores on scales that can't be compared. Instead of normalising them, I use Reciprocal Rank Fusion: each chunk adds `1 / (60 + rank)` for every ranking it appears in. Position matters, not the score.

```python
for rank, hit in enumerate(vector_hits):
    fused[hit.id] = fused.get(hit.id, 0) + 1 / (60 + rank)
for rank, hit in enumerate(keyword_hits):
    fused[hit.id] = fused.get(hit.id, 0) + 1 / (60 + rank)
```

A chunk counts as relevant if either retriever passes its own threshold. To decide whether a question is in scope, an LLM router at temperature 0 answers in parallel with retrieval, and similarity becomes a secondary signal.

## Measuring it to believe it

I didn't want to trust four questions tried by hand, so I built an evaluation set with on-topic and off-topic questions. With hybrid search and the router, the original set reached 100% scope accuracy and 100% source recall.

In production the embeddings come from Gemini, calibrated separately: 100% router accuracy and 95% recall. And BM25 adds one more thing: if the embedding service fails or runs out of quota, the assistant keeps answering with keywords alone instead of going silent.

## What I take away

Semantic search doesn't replace keyword search; they complement each other. With few documents, BM25 costs nothing in infrastructure. If there were ever thousands, I'd move that part into the search engine instead of keeping it in memory.
