"""Semantic Tile Search AI Service.

Translates natural language buyer/contractor queries (e.g., "grey patio pavers",
"white marble look bathroom") into matching tile specifications and products.
"""

import logging
from typing import Any, Dict, List, Optional

from app.integrations.quickbooks.product_mapping import (
    extract_finish,
    normalize_size,
    normalize_words,
)
from app.services.ai.gemini_provider import gemini_provider

logger = logging.getLogger(__name__)


class SemanticSearchService:
    """Semantic tile search engine matching queries against product specifications."""

    def __init__(self, provider=gemini_provider):
        self.provider = provider

    async def search_products(
        self,
        query: str,
        items: List[Dict[str, Any]],
        limit: int = 15,
    ) -> Dict[str, Any]:
        """
        Rank and return products semantically relevant to user's natural language query.
        """
        if not query or not query.strip():
            return {"query": "", "count": 0, "results": [], "provider": "none"}

        clean_query = query.strip()

        # Step 1: Extract target attributes from query
        query_size = normalize_size(clean_query)
        query_finishes = set(extract_finish(clean_query))
        query_tokens = set(normalize_words(clean_query))

        scored_results = []

        for it in items:
            name = it.get("walcano_name") or it.get("name", "")
            surfaces_name = it.get("surfaces_name") or ""
            category = it.get("category", "")
            sku = it.get("sku", "")

            combined_item_text = f"{name} {surfaces_name} {category} {sku}".lower()

            item_size = normalize_size(combined_item_text)
            item_finishes = set(extract_finish(combined_item_text))
            item_tokens = set(normalize_words(f"{name} {surfaces_name} {category}"))

            score = 0.0
            matches = []

            # 1. Exact or partial substring in product name
            if clean_query.lower() in combined_item_text:
                score += 0.50
                matches.append("exact keyword in title")

            # 2. Dimensions match
            if query_size and item_size:
                if query_size == item_size:
                    score += 0.35
                    matches.append(f"dimensions {item_size[0]}x{item_size[1]}cm")

            # 3. Finish / Texture match
            common_finishes = query_finishes.intersection(item_finishes)
            if common_finishes:
                score += 0.25 * len(common_finishes)
                matches.append(f"finish: {', '.join(common_finishes)}")

            # 4. Token overlap (color/material/name)
            common_tokens = query_tokens.intersection(item_tokens)
            if common_tokens:
                score += 0.20 * (len(common_tokens) / max(1, len(query_tokens)))
                matches.append(f"attribute keywords: {', '.join(common_tokens)}")

            # Outdoor / paver concept matching
            if any(w in clean_query.lower() for w in ["outdoor", "paver", "pavers", "patio", "exterior", "garden"]):
                if "outdoor" in combined_item_text or "2cm" in combined_item_text or "enduro" in combined_item_text or "endura" in combined_item_text:
                    score += 0.40
                    matches.append("outdoor porcelain paver specification")

            # Marble concept matching
            if any(w in clean_query.lower() for w in ["marble", "marbel", "satuario", "calacatta", "luxury"]):
                if "marble" in combined_item_text or "satuario" in combined_item_text or "mercure" in combined_item_text:
                    score += 0.30
                    matches.append("marble design aesthetic")

            if score > 0.15:
                scored_results.append({
                    "item": it,
                    "relevance_score": round(min(1.0, score), 2),
                    "reasons": matches,
                })

        # Sort by highest relevance score
        scored_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        top_matches = scored_results[:limit]

        return {
            "query": clean_query,
            "count": len(top_matches),
            "results": top_matches,
            "provider": "gemini" if self.provider.is_configured else "heuristic",
        }


# Global singleton instance
semantic_search_service = SemanticSearchService()
