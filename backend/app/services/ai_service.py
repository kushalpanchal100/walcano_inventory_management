"""Backward-compatible AI Service facade.

Re-exports and delegates to the specialized AI services under `app.services.ai.*`:
- GeminiProvider: Client lifecycle and Gemini model interactions
- InventoryCopilotService: Conversational assistance and table filters
- ProductAutoMapperService: Catalog product matching
- RestockInsightsService: Predictive reordering and health scoring
- SemanticSearchService: Semantic search and specification discovery
"""

from typing import Any, Dict, List, Optional

from app.services.ai.gemini_provider import GeminiProvider, gemini_provider
from app.services.ai.copilot_service import InventoryCopilotService, copilot_service
from app.services.ai.auto_mapper_service import ProductAutoMapperService, auto_mapper_service
from app.services.ai.restock_insights_service import RestockInsightsService, restock_service
from app.services.ai.semantic_search_service import SemanticSearchService, semantic_search_service


class AIService:
    """Unified facade delegating to specialized modular AI services."""

    def __init__(
        self,
        provider=gemini_provider,
        copilot=copilot_service,
        auto_mapper=auto_mapper_service,
        restock=restock_service,
        search=semantic_search_service,
    ):
        self.provider = provider
        self.copilot = copilot
        self.auto_mapper = auto_mapper
        self.restock = restock
        self.search = search

    @property
    def is_configured(self) -> bool:
        """Check if Gemini API key is configured."""
        return self.provider.is_configured

    async def chat_inventory(
        self,
        query: str,
        items: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Delegate conversational queries to InventoryCopilotService."""
        return await self.copilot.chat(query=query, items=items, history=history)

    async def auto_map_unmapped(
        self,
        unmapped_items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Delegate unmapped product matching to ProductAutoMapperService."""
        return await self.auto_mapper.auto_map(unmapped_items=unmapped_items)

    async def get_restock_insights(
        self,
        items: List[Dict[str, Any]],
        threshold_low: float = 10.0,
    ) -> Dict[str, Any]:
        """Delegate stockout forecasting to RestockInsightsService."""
        return await self.restock.generate_restock_report(items=items, threshold_low=threshold_low)

    async def semantic_search(
        self,
        query: str,
        items: List[Dict[str, Any]],
        limit: int = 15,
    ) -> Dict[str, Any]:
        """Delegate natural language search to SemanticSearchService."""
        return await self.search.search_products(query=query, items=items, limit=limit)


# Global singleton instance
ai_service = AIService()

__all__ = [
    "AIService",
    "ai_service",
    "GeminiProvider",
    "gemini_provider",
    "InventoryCopilotService",
    "copilot_service",
    "ProductAutoMapperService",
    "auto_mapper_service",
    "RestockInsightsService",
    "restock_service",
    "SemanticSearchService",
    "semantic_search_service",
]
