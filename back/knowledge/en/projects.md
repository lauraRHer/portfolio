---
title: Projects
section: projects
---

## Laura's projects at CARTIF (overview)
At CARTIF, Laura has worked on the applications of several projects: Spandam, RethinkAction, Nevermore, Build Space, Rehouse, Smarteestory, Hydro4u (frontend) and Climres (backend), plus an internal tools catalogue (full-stack) and a receipt and invoice extraction API with local AI. She has also helped colleagues and finished other people's applications, mostly on the frontend.

## Spandam
Spandam is a tool to apply measures in rural areas: users choose input parameters and see the results on maps (Leaflet) and charts (ECharts, Plotly.js). Laura built the Angular frontend with ng-zorro, starting from the Figma designs but proposing redesigns to make the interface more attractive, and supported decisions on logic, database and API structure. It handles asynchronous jobs with Celery queues and Keycloak sessions, is available in Spanish and English, has Cypress tests and is deployed with CI/CD.

## RethinkAction
RethinkAction is a larger application with the same approach as Spandam: Leaflet maps, charts, asynchronous queues, Keycloak and Cypress tests, English only. Laura built the Angular frontend with ng-zorro, closely following the Figma designs and working hand in hand with the backend. Nevermore is another similar project where Laura also built the frontend.

## Smarteestory
In Smarteestory (in progress), Laura builds the frontend of a digital twin: it shows an IFC model of the building with the That Open library, connects to sensors through an external API and includes a full file manager (read, write, upload, create folders, edit and delete).

## Hydro4u, Rehouse and Build Space
Hydro4u (in progress): Laura builds the frontend with Leaflet maps, charts and API integration, and contributes to Figma redesigns, the prediction model logic and the input/output data structure of the endpoints. Rehouse (in progress, Clarity library): shows data and files, creates renovation packages and projects with invited collaborators, and will have a digital twin. Build Space (PrimeNG): Laura built the frontend, mainly the Leaflet map.

## Climres
In Climres (in progress), Laura works on the backend: she designs and manages a PostgreSQL database with PostGIS to store and query GeoJSON data, builds the API with FastAPI, uses DBeaver and writes Python migration scripts to load the CSV and JSON data sent by other departments. Environments are managed with Poetry.

## Internal tools catalogue
In an internal CARTIF tools catalogue application (in progress, not public yet), Laura owns the whole flow: PostgreSQL database with PostGIS, FastAPI backend with uv, Angular frontend with GSAP, ng-zorro and Leaflet from Figma designs, and Keycloak set up and managed by her with two-factor authentication. She embeds through an iframe another CARTIF application she built with a colleague, manages permissions between both applications, adapts and modifies the embedded application and decides the database structure, logic and architecture, plus the data migrations.

## Laura's personal projects
Laura has two personal projects: this portfolio, built with Next.js, React Three Fiber and FastAPI, with a RAG assistant (LangGraph, hybrid search, local models with Ollama and a provider-agnostic architecture) developed using Claude Code as a coding agent; and an educational chatbot with a custom RAG built with LlamaIndex (in progress), running on local models and ready to use cloud models via API in production.
