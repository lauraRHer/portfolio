---
title: Case study — receipts and invoices with local AI
section: case-study
---

## What Laura's receipt and invoice extraction API is
At CARTIF, Laura built, together with a colleague, an API that takes a photo of a document and decides whether it is a receipt, an invoice or neither. If it is neither or can't be read, it returns an error; otherwise it returns a structured object with the category (from a given list), the amount, the currency and other relevant fields.

## How the receipt and invoice API works
The API is built with FastAPI and managed with uv. It sends the image to a vision model running locally on Ollama and turns its answer into structured data. Because the model is local, document images are not sent to external services. It is an internal CARTIF project, so the code can't be shown.
