"""AI Services Package for Walcano Inventory Management.

Provides specialized AI services for:
- GeminiProvider: Client lifecycle and structured prompt execution.
- InventoryCopilotService: Conversational inventory queries and interactive UI actions.
- RestockInsightsService: Predictive reorders and stock health forecasting.
- SemanticSearchService: Natural language tile concept search.
"""

from app.services.ai.gemini_provider import GeminiProvider, gemini_provider
from app.services.ai.copilot_service import InventoryCopilotService, copilot_service
from app.services.ai.restock_insights_service import RestockInsightsService, restock_service
from app.services.ai.semantic_search_service import SemanticSearchService, semantic_search_service

__all__ = [
    "GeminiProvider",
    "gemini_provider",
    "InventoryCopilotService",
    "copilot_service",
    "RestockInsightsService",
    "restock_service",
    "SemanticSearchService",
    "semantic_search_service",
]
