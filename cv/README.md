# CV

- `cv.json`: **única fuente de verdad** del CV, en español e inglés. Cada texto es `{"es": …, "en": …}` o una cadena común a los dos idiomas.
- `build.py`: genera `dist/cv-es.pdf` y `dist/cv-en.pdf` (A4, 2 páginas) con Chrome sin ventana. No necesita dependencias de Python.

```bash
python3 cv/build.py            # genera los PDF en cv/dist/ para revisarlos
python3 cv/build.py --publish  # además los copia a front/public/cv/ (los que descarga la web)
```

Si cambias la experiencia o los proyectos, actualiza también la web (`front/src/content/`, `front/messages/`) y la base de conocimiento del chatbot (`back/knowledge/`) para que todo cuente lo mismo.
