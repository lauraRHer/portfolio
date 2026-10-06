"""Tiny BM25 index over the knowledge chunks (pure Python).

Why: small embedding models (e.g. nomic-embed-text) are English-centric and
miss obvious Spanish keyword matches ("¿Dónde estudió?" ↔ "Laura estudió…").
Combining lexical + vector retrieval (hybrid search) fixes that cheaply.
The KB is small (dozens of chunks), so an in-memory index is plenty.
"""

import math
import re
import unicodedata
from collections import Counter
from collections.abc import Sequence

from app.domain.models import Chunk

_WORD = re.compile(r"[a-z0-9]+")
# Very common words that carry no meaning for retrieval (ES + EN).
_STOP = set(
    "de la el los las y o a en que con por para un una es su sus del al se lo como mas "
    "laura ella tiene sobre the a an and or of to in on for with is are she her has have "
    "does do what how which who where when about tell me "
    # question verbs ("¿Sabe X?", "Does she know X?"): only the X matters
    "sabe sabes conoce conoces usa usas utiliza utilizas maneja manejas "
    "know knows use uses used can you could puede puedes podria".split()
)


def _strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def tokenize(text: str) -> list[str]:
    words = _WORD.findall(_strip_accents(text.lower()))
    # Crude stemming: compare by 5-char prefix (estudió/estudios, test/tests…).
    return [w[:5] for w in words if w not in _STOP and len(w) > 1]


class BM25Index:
    def __init__(self, chunks: Sequence[Chunk], k1: float = 1.4, b: float = 0.75) -> None:
        self.chunks = list(chunks)
        self.k1, self.b = k1, b
        self._docs = [Counter(tokenize(c.text)) for c in self.chunks]
        self._lens = [sum(d.values()) for d in self._docs]
        self._avg = (sum(self._lens) / len(self._lens)) if self._lens else 0.0
        df: Counter[str] = Counter()
        for d in self._docs:
            df.update(d.keys())
        n = len(self._docs)
        self._idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def search(self, query: str, k: int) -> list[tuple[Chunk, float]]:
        terms = tokenize(query)
        if not terms or not self._docs:
            return []
        scores = []
        for chunk, doc, length in zip(self.chunks, self._docs, self._lens, strict=True):
            s = 0.0
            for t in terms:
                tf = doc.get(t, 0)
                if tf:
                    norm = tf + self.k1 * (1 - self.b + self.b * length / self._avg)
                    s += self._idf.get(t, 0.0) * tf * (self.k1 + 1) / norm
            if s > 0:
                scores.append((chunk, s))
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:k]
