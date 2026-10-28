"""pgvector retriever for querying knowledge base documents with cosine similarity."""
from __future__ import annotations

import time
from typing import Any, Dict, List, Optional
from sqlalchemy import text

from src.infrastructure.database import async_engine
from src.observability.logging import get_logger
from src.observability.metrics import MetricsRegistry
from src.rag.embedder import get_embedder

logger = get_logger("retriever")


class DocumentRetriever:
    """Retrieves relevant policy and SOP documents from PostgreSQL using pgvector."""

    def __init__(self) -> None:
        self.embedder = get_embedder()

    async def search(
        self,
        query: str,
        top_k: int = 3,
        category: Optional[str] = None,
        min_similarity: float = 0.5,
    ) -> List[Dict[str, Any]]:
        """
        Embeds the input query and executes a vector cosine distance query (<=>) in PostgreSQL.
        Returns top_k matching documents with their similarity score.
        """
        start_time = time.time()
        logger.info("Starting document vector search", query=query, category=category, top_k=top_k)

        # 1. Embed query
        query_vector = await self.embedder.embed_query(query)
        vector_str = f"[{','.join(str(v) for v in query_vector)}]"

        # 2. Query pgvector
        where_clauses = ["embedding IS NOT NULL"]
        params: Dict[str, Any] = {"vector_str": vector_str, "top_k": top_k}

        if category:
            where_clauses.append("category = :category")
            params["category"] = category

        where_sql = " AND ".join(where_clauses)

        sql_query = text(f"""
            SELECT id, title, content, category, source, metadata,
                   (1 - (embedding <=> :vector_str::vector)) AS similarity_score
            FROM documents
            WHERE {where_sql}
            ORDER BY embedding <=> :vector_str::vector ASC
            LIMIT :top_k;
        """)

        results: List[Dict[str, Any]] = []

        try:
            async with async_engine.connect() as conn:
                result_cursor = await conn.execute(sql_query, params)
                rows = result_cursor.fetchall()

                for row in rows:
                    score = float(row.similarity_score) if row.similarity_score is not None else 0.0
                    results.append({
                        "id": str(row.id),
                        "title": row.title,
                        "content": row.content,
                        "category": row.category,
                        "source": row.source,
                        "similarity_score": round(score, 4),
                        "metadata": row.metadata or {},
                    })

            # Record Prometheus metrics
            duration = time.time() - start_time
            MetricsRegistry.rag_retrieval_duration_seconds.observe(duration)
            MetricsRegistry.rag_documents_returned.observe(len(results))

            logger.info("Vector search completed", count=len(results), duration_seconds=round(duration, 3))
            return results

        except Exception as e:
            logger.error("Vector search query error", error=str(e), query=query)
            # If database vector comparison is not yet seeded, return empty list gracefully
            return []


_retriever: DocumentRetriever | None = None


def get_retriever() -> DocumentRetriever:
    """Get the singleton DocumentRetriever instance."""
    global _retriever
    if _retriever is None:
        _retriever = DocumentRetriever()
    return _retriever
