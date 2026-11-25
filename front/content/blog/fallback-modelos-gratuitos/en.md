---
title: "A free chatbot that never goes silent: a fallback chain across models"
excerpt: "In production my assistant only uses free tiers. This is how it keeps answering when a provider runs out of quota or retires a model."
assistantSummary: >
  Laura explains how she keeps her portfolio assistant running on free LLM tiers
  only (Groq, Google AI Studio, OpenRouter). She designed her own fallback chain
  as a decorator of the LLMProvider port: it walks an ordered list of models and
  puts each failing model on a cooldown that depends on the cause (per-minute
  limit, daily quota, retired model, error). When streaming it only switches
  model before the first token. She explains why she ruled out LangChain's
  with_fallbacks and LiteLLM, and which limitations she accepts.
---

## The problem with free

I wanted my portfolio assistant to cost zero euros. That means living on free tiers: Groq, Google AI Studio, OpenRouter… Each one limits requests per minute and per day, models change or disappear often, and some providers have dropped their free tier overnight.

With a single model, the chatbot would go silent as soon as the daily quota ran out. On exactly the day someone interesting tries it.

## A list of models and a decorator

The solution is a chain: an ordered list of models in an environment variable, `LLM_CHAIN`, formatted as `provider:model, …`. If the first one fails, the next one is tried.

The backend follows a hexagonal architecture, so the chat talks to a port, `LLMProvider`, not to a specific provider. `FallbackLLM` is a decorator of that port: from outside it looks like one more model, and inside it walks the list. The RAG graph and the chat service don't know it exists.

## Remembering who is exhausted

If a model has used up its quota, calling it again on every question only adds waiting. So every failure puts the model on a cooldown whose length depends on the cause:

- per-minute limit: whatever `Retry-After` says, or 60 seconds;
- daily quota, invalid key or retired model: one hour;
- error or timeout: 30 seconds.

While the cooldown lasts, later requests skip that model without spending a call. The scope router and the generator share these cooldowns, because quotas are per model, not per use.

## The streaming detail

Answers arrive token by token. If a model fails mid-sentence, switching to another would mix two answers. So the rule is simple: only switch models before the first token. An empty answer also counts as a failure.

Inside the chain I also turned off the SDK's retries. Retrying against a rate-limited model only delays moving on to the next one.

## What I ruled out

- **LangChain's `with_fallbacks()`:** it doesn't remember which model is exhausted, so every question would spend a call against a model with no quota, and it can't tell a failure before the first token from one after it.
- **LiteLLM Router:** it does this and more, but it's a heavy dependency for fewer than 200 lines of my own, and the tests would come to depend on it.
- **A single paid provider:** simpler, but the goal was zero cost.

## What I accept

Cooldowns live in memory: with several replicas, each one learns on its own which model is exhausted. Quality also varies depending on which model answers. And if the whole chain runs out, visitors don't see an error: they get a fixed message, with a bit of humour, and my email.
