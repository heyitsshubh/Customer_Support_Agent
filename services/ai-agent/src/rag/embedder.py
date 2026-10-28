"""Vector embedder utility for generating 1536-dimensional embeddings."""
from __future__ import annotations

import math
import numpy as np
from typing import List
from langchain_openai import OpenAIEmbeddings

from src.config import get_settings
from src.observability.logging import get_logger

logger = get_logger("embedder")


class VectorEmbedder:
    """Generates normalized vector embeddings for text chunks and queries."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: OpenAIEmbeddings | None = None

        if self.settings.OPENAI_API_KEY and not self.settings.OPENAI_API_KEY.startswith("sk-placeholder"):
            try:
                self._client = OpenAIEmbeddings(
                    model=self.settings.OPENAI_EMBEDDING_MODEL,
                    openai_api_key=self.settings.OPENAI_API_KEY,
                )
                logger.info("Initialized OpenAIEmbeddings client", model=self.settings.OPENAI_EMBEDDING_MODEL)
            except Exception as e:
                logger.warn("Failed to initialize OpenAIEmbeddings, using fallback", error=str(e))
                self._client = None
        else:
            logger.info("OpenAI API key not configured; using deterministic fallback embedder")

    async def embed_query(self, text: str) -> List[float]:
        """Generate vector embedding for a query string."""
        if self._client:
            try:
                return await self._client.aembed_query(text)
            except Exception as e:
                logger.error("Error during OpenAI embedding generation; falling back", error=str(e))

        return self._generate_deterministic_vector(text)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for a list of document texts."""
        if self._client:
            try:
                return await self._client.aembed_documents(texts)
            except Exception as e:
                logger.error("Error during OpenAI document embeddings; falling back", error=str(e))

        return [self._generate_deterministic_vector(t) for t in texts]

    def _generate_deterministic_vector(self, text: str, dim: int = 1536) -> List[float]:
        """
        Generates a reproducible, unit-normalized 1536-dim vector for testing
        and local development when live OpenAI credentials are not available.
        """
        seed = sum(ord(c) for c in text.strip().lower())
        vec = np.zeros(dim, dtype=np.float32)

        for i in range(dim):
            vec[i] = math.sin((seed + 1) * 1000 + i)

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        return [round(float(v), 6) for v in vec]


_embedder: VectorEmbedder | None = None


def get_embedder() -> VectorEmbedder:
    """Get the singleton VectorEmbedder instance."""
    global _embedder
    if _embedder is None:
        _embedder = VectorEmbedder()
    return _embedder
