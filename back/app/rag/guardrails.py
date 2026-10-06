"""Cheap, deterministic guardrails that run before any model call."""

import re
import unicodedata

from app.domain.models import AnswerKind, Language

# Common prompt-injection / jailbreak phrasings (ES + EN). Not exhaustive:
# the system prompt and the scope classifier are the other two layers.
_INJECTION = re.compile(
    r"(ignore|disregard|forget)\s+(all\s+|any\s+|the\s+)?(previous|prior|above|your)\s+(instructions|rules|prompt)"
    r"|(olvida|ignora)\s+(todas\s+)?(las\s+|tus\s+)?(instrucciones|reglas)(\s+anteriores)?"
    r"|system\s*prompt|prompt\s+del\s+sistema"
    r"|you\s+are\s+now|ahora\s+eres|act\s+as\s+(?!a\s+recruiter)|act[uú]a\s+como"
    r"|jailbreak|developer\s+mode|\bDAN\b",
    re.IGNORECASE,
)

_ES_HINTS = re.compile(
    r"[¿¡ñáéíóú]|\b(qu[eé]|c[oó]mo|d[oó]nde|cu[aá]l|cu[aá]nt[oa]s?|tiene|es|est[aá]|sabe|hola|gracias|"
    r"ella|sobre|experiencia|trabaja|puede|proyectos?|para|con|de|la|el|los|las|y)\b",
    re.IGNORECASE,
)
_EN_HINTS = re.compile(
    r"\b(what|how|where|which|does|is|has|have|she|her|hello|hi|thanks|about|experience|works?|"
    r"can|projects?|for|with|the|and|of|tell|me)\b",
    re.IGNORECASE,
)


_GREETING = re.compile(
    r"^(hola|buenas( tardes| noches| d[ií]as)?|buenos d[ií]as|hey|hi|hello"
    r"|good (morning|afternoon|evening)|gracias|muchas gracias|thanks|thank you|adi[oó]s|bye)"
    r"[\s!.,¡¿?😊🙂👋]*$",
    re.IGNORECASE,
)


# Skill questions that can only be about Laura, even when the small scope
# classifier says otherwise: an explicit subject ("¿Laura sabe LangGraph?",
# "Does she know Docker?") or a Spanish third-person question with no subject
# ("¿Sabe Docker?"). Second person ("¿Sabes…?", "¿Puedes programar…?", "Can you…")
# is deliberately excluded: it may be addressed to the bot ("¿Puedes programar
# una función…?"), so it is left to the classifier. Naming Laura is not enough.
_ES_SKILL_VERB = (
    r"(sabe|conoce|usa|utiliza|maneja|domina|ha\s+(usado|trabajado|hecho)"
    r"|tiene\s+experiencia|puede\s+(trabajar|programar))\b"
)
_ABOUT_LAURA_EXPLICIT = re.compile(
    rf"^[¿\s]*(laura|ella)\s+{_ES_SKILL_VERB}"
    r"|^\s*(does|has|can|is)\s+(laura|she)\b"
    r"|^\s*(laura|she)\s+(knows|uses|has\s+(used|worked)|can)\b",
    re.IGNORECASE,
)
_ABOUT_LAURA_IMPLICIT = re.compile(rf"^[¿\s]*{_ES_SKILL_VERB}", re.IGNORECASE)

# Requests to speak as Laura or say what she "would" say: the model must never
# put words in her mouth, whatever the topic ("Describe París como lo haría Laura").
_ROLEPLAY = re.compile(
    r"como\s+(lo\s+|la\s+)?(har[ií]a|dir[ií]a|explicar[ií]a|describir[ií]a|contar[ií]a"
    r"|escribir[ií]a|responder[ií]a|ver[ií]a)\s+(ella|laura)"
    r"|como\s+si\s+(fueras|fueses|fuera|fuese)\s+(ella|laura)"
    r"|(hazte\s+pasar|haz\s+de|finge\s+ser|act[uú]a\s+de|habla\s+como)\s+(por\s+)?laura"
    r"|\beres\s+laura\b|en\s+nombre\s+de\s+laura|en\s+primera\s+persona"
    r"|(as|like)\s+laura\s+would|how\s+would\s+(laura|she)\s+(explain|describe|say|answer|write)"
    r"|pretend\s+(to\s+be|you\s+are)|you\s+are\s+laura|speak\s+as\s+laura"
    r"|in\s+laura'?s\s+(words|voice)|in\s+(the\s+)?first\s+person",
    re.IGNORECASE,
)


def looks_like_roleplay(text: str) -> bool:
    return bool(_ROLEPLAY.search(text))


def is_about_laura(text: str) -> bool:
    """Deterministic in-scope hint; `decide` still needs relevant chunks to answer."""
    if _ABOUT_LAURA_EXPLICIT.search(text):
        return True
    # Without a subject, "Usa Python para…" is an imperative; "¿Usa Python?" a question.
    return "?" in text and bool(_ABOUT_LAURA_IMPLICIT.search(text))


def is_plain_greeting(text: str) -> bool:
    """Short greetings/thanks are answered without calling any model."""
    return bool(_GREETING.match(text.strip()))


def sanitize(text: str, max_chars: int) -> str:
    """Strip control characters, collapse whitespace and cap the length."""
    text = "".join(ch for ch in text if unicodedata.category(ch)[0] != "C" or ch in "\n\t")
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


def looks_like_injection(text: str) -> bool:
    return bool(_INJECTION.search(text))


def detect_language(text: str, fallback: Language = "es") -> Language:
    """Tiny heuristic: good enough to pick ES/EN for short chat questions."""
    es = len(_ES_HINTS.findall(text))
    en = len(_EN_HINTS.findall(text))
    if es == en:
        return fallback
    return "es" if es > en else "en"


def canned_reply(kind: AnswerKind, language: Language, email: str) -> str:
    """Fixed texts for answers that must never depend on the model."""
    replies: dict[AnswerKind, dict[str, str]] = {
        AnswerKind.REFUSAL: {
            "es": "Solo puedo responder preguntas sobre Laura: su experiencia, proyectos, "
            "habilidades o cómo contactarla. ¿Te cuento algo de eso?",
            "en": "I can only answer questions about Laura — her experience, projects, skills "
            "or how to reach her. Want to hear about any of those?",
        },
        AnswerKind.NO_INFO: {
            "es": f"No tengo ese dato. Lo mejor es preguntárselo directamente a Laura: {email}",
            "en": f"I don't have that information. Best to ask Laura directly: {email}",
        },
        AnswerKind.BUSY: {
            "es": "Ahora mismo estoy atendiendo otras preguntas. Prueba de nuevo en unos "
            f"segundos o escribe a Laura: {email}",
            "en": "I'm busy answering other questions right now. Please try again in a few "
            f"seconds or email Laura: {email}",
        },
        AnswerKind.GREETING: {
            "es": "¡Hola! Soy el asistente de Laura. Puedo contarte sobre su experiencia, "
            "sus proyectos, su stack o cómo contactarla. ¿Qué te gustaría saber?",
            "en": "Hi! I'm Laura's assistant. I can tell you about her experience, projects, "
            "stack or how to get in touch. What would you like to know?",
        },
    }
    return replies[kind][language]
