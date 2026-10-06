---
title: Proyectos
section: projects
---

## Proyectos de Laura en CARTIF (resumen)
En CARTIF, Laura ha trabajado en las aplicaciones de varios proyectos: Spandam, RethinkAction, Nevermore, Build Space, Rehouse, Smarteestory, Hydro4u (frontend) y Climres (backend), además de un catálogo interno de herramientas (full-stack) y una API de extracción de tickets y facturas con IA local. También ha ayudado a compañeros y terminado aplicaciones de otros, sobre todo en frontend.

## Spandam
Spandam es una herramienta para aplicar medidas en zonas rurales: permite elegir parámetros de entrada y ver los resultados en mapas (Leaflet) y gráficas (ECharts, Plotly.js). Laura hizo el frontend en Angular con ng-zorro, partiendo de los diseños de Figma pero proponiendo rediseños para hacer la interfaz más atractiva, y apoyó las decisiones de lógica, base de datos y estructura de la API. Gestiona tareas asíncronas con colas de Celery y sesiones con Keycloak, está en español e inglés, tiene tests con Cypress y se despliega con CI/CD.

## RethinkAction
RethinkAction es una aplicación más extensa con el mismo enfoque que Spandam: mapas con Leaflet, gráficas, colas asíncronas, Keycloak y tests con Cypress, solo en inglés. Laura hizo el frontend en Angular con ng-zorro, siguiendo fielmente los diseños de Figma y en estrecha colaboración con el backend. Nevermore es otro proyecto similar en el que Laura también hizo el frontend.

## Smarteestory
En Smarteestory (en desarrollo), Laura hace el frontend de un gemelo digital: muestra un modelo IFC del edificio con la librería That Open, se conecta a los sensores a través de una API externa e incluye un gestor de archivos completo (leer, escribir, subir, crear carpetas, editar y borrar).

## Hydro4u, Rehouse y Build Space
Hydro4u (en desarrollo): Laura hace el frontend con mapas Leaflet, gráficas y consumo de la API, colabora en rediseños sobre Figma, en la lógica del modelo de predicción y en la estructura de datos de entrada y salida de los endpoints. Rehouse (en desarrollo, librería Clarity): muestra datos y ficheros, crea paquetes de renovación y proyectos con colaboradores invitados, y tendrá un gemelo digital. Build Space (PrimeNG): Laura hizo el frontend, sobre todo el mapa con Leaflet.

## Climres
En Climres (en desarrollo), Laura trabaja en el backend: diseña y gestiona una base de datos PostgreSQL con PostGIS para almacenar y consultar datos GeoJSON, desarrolla la API con FastAPI, usa DBeaver y escribe scripts de migración en Python para cargar los CSV y JSON que envían otros departamentos. Los entornos se gestionan con Poetry.

## Catálogo interno de herramientas
En una aplicación interna de catálogo de herramientas de CARTIF (en desarrollo, todavía no pública), Laura se encarga del flujo completo: base de datos PostgreSQL con PostGIS, backend con FastAPI y uv, frontend con Angular, GSAP, ng-zorro y Leaflet a partir de diseños de Figma, y Keycloak creado y gestionado por ella con doble factor de autenticación. Integra mediante un iframe otra aplicación de CARTIF que desarrolló junto a un compañero, gestiona los permisos entre ambas aplicaciones, adapta y modifica la aplicación integrada y decide la estructura de la base de datos, la lógica y la arquitectura, además de las migraciones de datos.

## Proyectos personales de Laura
Laura tiene dos proyectos personales: este portfolio, hecho con Next.js, React Three Fiber y FastAPI, con un asistente RAG (LangGraph, búsqueda híbrida, modelos locales con Ollama y arquitectura agnóstica de proveedor) desarrollado usando Claude Code como agente de codificación; y un chatbot educativo con un RAG propio construido con LlamaIndex (en desarrollo), con modelos locales y preparado para usar modelos en la nube vía API en producción.
