"""Adapter: any LangChain chat model → our `LLMProvider` port."""

from collections.abc import AsyncIterator, Sequence

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from app.domain.models import Message

_ROLE_TO_LC = {"system": SystemMessage, "user": HumanMessage, "assistant": AIMessage}


def to_langchain(messages: Sequence[Message]) -> list[BaseMessage]:
    return [_ROLE_TO_LC[m.role](content=m.content) for m in messages]


def _text(content: object) -> str:
    """LangChain content can be a str or a list of content blocks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in content)
    return str(content)


class LangChainLLM:
    def __init__(self, model: BaseChatModel, name: str) -> None:
        self._model = model
        self.name = name

    async def complete(self, messages: Sequence[Message]) -> str:
        # Output length is configured on the model itself (see factory), because
        # providers name it differently (num_predict, max_tokens, …).
        result = await self._model.ainvoke(to_langchain(messages))
        return _text(result.content)

    async def stream(self, messages: Sequence[Message]) -> AsyncIterator[str]:
        async for chunk in self._model.astream(to_langchain(messages)):
            text = _text(chunk.content)
            if text:
                yield text
