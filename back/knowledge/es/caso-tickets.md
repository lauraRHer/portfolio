---
title: Caso de estudio — tickets y facturas con IA local
section: case-study
---

## Qué es la API de extracción de tickets y facturas de Laura
En CARTIF, Laura desarrolló junto a un compañero una API que recibe la foto de un documento y decide si es un ticket, una factura o ninguno de los dos. Si no lo es o no se puede leer, devuelve un error; si lo es, devuelve un objeto estructurado con la categoría (de una lista dada), el importe, la moneda y otros datos de interés.

## Cómo funciona la API de tickets y facturas
La API está hecha con FastAPI y gestionada con uv. Envía la imagen a un modelo de visión que se ejecuta en local con Ollama y convierte su respuesta en datos estructurados. Como el modelo es local, las imágenes de los documentos no se envían a servicios externos. Es un proyecto interno de CARTIF, así que no se puede mostrar el código.
