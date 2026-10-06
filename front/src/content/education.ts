import type { Credential } from "./types";

/** Education & training. Source of truth: cv/cv.json. */
export const credentials: Credential[] = [
  {
    id: "upm-genai",
    kind: "certification",
    title: "Fundamentos y herramientas para la IA generativa",
    translation: { en: "Fundamentals and tools for generative AI" },
    issuer: "Universidad Politécnica de Madrid",
    year: "2026",
    description: {
      es: "Formación de empresa. Transformers y atención, entrenamiento de modelos, Hugging Face, LangChain, LangGraph, Langfuse y RAG.",
      en: "In-company training. Transformers and attention, model training, Hugging Face, LangChain, LangGraph, Langfuse and RAG.",
    },
  },
  {
    id: "uva-ml-dl",
    kind: "certification",
    title: "Machine Learning y Deep Learning",
    translation: { en: "Machine Learning and Deep Learning" },
    issuer: "Universidad de Valladolid",
    year: "2025",
    description: {
      es: "Formación de empresa. Fundamentos matemáticos de ML y DL: redes neuronales, backpropagation, embeddings y transformers, con PyTorch, pandas y NumPy.",
      en: "In-company training. Mathematical foundations of ML and DL: neural networks, backpropagation, embeddings and transformers, with PyTorch, pandas and NumPy.",
    },
  },
  {
    id: "udemy-fastapi",
    kind: "certification",
    title: "Aprende FastAPI desde cero",
    translation: { en: "Learn FastAPI from scratch" },
    issuer: "Udemy",
    year: "2025",
    description: {
      es: "Desarrollo de APIs con FastAPI.",
      en: "API development with FastAPI.",
    },
  },
  {
    id: "fp-daw",
    kind: "degree",
    title: "Técnico Superior en Desarrollo de Aplicaciones Web",
    translation: { en: "Higher Vocational Diploma in Web Application Development" },
    issuer: "IES Galileo, Valladolid",
    year: "2021 – 2023",
    description: {
      es: "Formación Profesional de Grado Superior.",
      en: "Two-year higher vocational degree.",
    },
  },
];
