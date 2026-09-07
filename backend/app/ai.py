from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings

_chat_model = None
_embeddings = None


def _require_token() -> None:
    if not settings.huggingfacehub_api_token:
        raise RuntimeError(
            "HUGGINGFACEHUB_API_TOKEN (or HF_TOKEN) is not set — cannot call Hugging Face models"
        )


def chat_model():
    """Lazily builds the ChatHuggingFace wrapper, mirroring Startupvalidatior's _chat() helper."""
    global _chat_model
    if _chat_model is None:
        _require_token()
        from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint

        endpoint = HuggingFaceEndpoint(
            repo_id=settings.chat_model,
            task="text-generation",
            provider=settings.hf_provider,
            huggingfacehub_api_token=settings.huggingfacehub_api_token,
            max_new_tokens=1024,
            temperature=0.2,
        )
        _chat_model = ChatHuggingFace(llm=endpoint, model_id=settings.chat_model)
    return _chat_model


def embeddings():
    global _embeddings
    if _embeddings is None:
        _require_token()
        from langchain_huggingface import HuggingFaceEndpointEmbeddings

        _embeddings = HuggingFaceEndpointEmbeddings(
            model=settings.embedding_model,
            huggingfacehub_api_token=settings.huggingfacehub_api_token,
        )
    return _embeddings


def embed(text: str) -> list[float]:
    return embeddings().embed_query(text[:8000])


SYSTEM_PROMPT = """You are "Why This", an assistant that explains why engineering decisions were made.
You are given raw context: git commits, pull requests, Slack messages, and Jira tickets.
Answer the user's question ONLY using the provided context. If the context does not contain
a clear answer, say so plainly instead of guessing.

Respond with:
1. A short direct answer (1-3 sentences).
2. A "Timeline / Evidence" section citing each source you used, with its date, author, and a
   one-line excerpt, using the [n] markers matching the numbered context items given to you.
3. If relevant, who approved/discussed it and any related ticket or incident mentioned.

Be concise and concrete. Never invent sources, dates, or names that are not in the context."""


def synthesize_answer(question: str, contexts: list[dict]) -> str:
    if not contexts:
        return (
            "I couldn't find any indexed commits, PRs, Slack messages, or Jira tickets "
            "related to this. Try indexing the relevant repo/channel/project first."
        )

    numbered = []
    for i, c in enumerate(contexts, start=1):
        numbered.append(
            f"[{i}] source={c['source_type']} author={c.get('author') or 'unknown'} "
            f"date={c.get('occurred_at') or 'unknown'} url={c.get('url') or 'n/a'}\n"
            f"{c['content'][:1500]}"
        )
    context_block = "\n\n".join(numbered)

    response = chat_model().invoke(
        [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Question: {question}\n\nContext:\n{context_block}"),
        ]
    )
    return response.content
