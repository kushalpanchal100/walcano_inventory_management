"""AI API routes for Walcano Copilot and inventory intelligence."""

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, status

from app.config.settings import get_settings
from app.integrations.quickbooks.client import QuickBooksClient
from app.integrations.quickbooks.product_mapping import (
    delete_custom_mapping,
    list_custom_mappings,
    save_custom_mapping,
)
from app.services.ai import (
    gemini_provider,
    copilot_service,
    restock_service,
    semantic_search_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Copilot & Smart Tools"])
settings = get_settings()
_qbo_client = QuickBooksClient()


# ─── Pydantic Request Models ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., description="User question or query about inventory")
    history: Optional[List[Dict[str, str]]] = Field(default=None, description="Previous conversation turns")
    demo: bool = Field(default=False, description="Preview demo mode")


class AcceptMappingRequest(BaseModel):
    walcano_name: str = Field(..., description="Walcano product name")
    surfaces_name: str = Field(..., description="Surfaces tile product name")
    confidence: Optional[float] = Field(default=1.0, description="Match confidence score")
    note: Optional[str] = Field(default="AI confirmed mapping", description="Optional note or reference")


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., description="Natural language search query")
    demo: bool = Field(default=False, description="Preview demo mode")
    limit: int = Field(default=15, description="Maximum products to return")


class RestockInsightsRequest(BaseModel):
    threshold_low: float = Field(default=10.0, description="Threshold for low stock status")
    demo: bool = Field(default=False, description="Preview demo mode")


# ─── Endpoints ────────────────────────────────────────────────────────────

@router.get("/status")
async def get_ai_status():
    """
    Check AI configuration status and active model.
    """
    is_conf = gemini_provider.is_configured
    return {
        "configured": is_conf,
        "provider": "gemini" if is_conf else "heuristic",
        "model": gemini_provider.model_name,
        "mode_label": "Google Gemini 2.5 Flash" if is_conf else "Smart Local Assistant",
        "notice": None if is_conf else "Using high-accuracy local heuristics. Set GEMINI_API_KEY in backend/.env for full live Gemini reasoning.",
        "services": [
            "InventoryCopilotService",
            "RestockInsightsService",
            "SemanticSearchService",
        ],
    }


@router.post("/chat")
async def chat_with_copilot(req: ChatRequest):
    """
    Chat with the AI Inventory Assistant. Provides insights and suggests UI filter actions.
    """
    try:
        # Fetch current live inventory
        valid_auth = await _qbo_client.get_valid_access_token()
        inv_data = await _qbo_client.fetch_live_inventory(include_demo=req.demo or not bool(valid_auth))
        items = inv_data.get("items", [])

        result = await copilot_service.chat(
            query=req.message,
            items=items,
            history=req.history,
        )
        return result
    except Exception as e:
        logger.error(f"Error in AI chat: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI chat error: {str(e)}",
        )


@router.post("/accept-mapping")
async def accept_mapping(req: AcceptMappingRequest):
    """
    Accept and persist an AI product mapping. Persists to .custom_mappings.json.
    """
    try:
        save_custom_mapping(
            walcano_name=req.walcano_name,
            surfaces_name=req.surfaces_name,
            confidence=req.confidence or 1.0,
            note=req.note or "AI confirmed mapping",
        )
        return {
            "success": True,
            "message": f"Mapping confirmed for '{req.walcano_name}' -> '{req.surfaces_name}'",
            "walcano_name": req.walcano_name,
            "surfaces_name": req.surfaces_name,
        }
    except Exception as e:
        logger.error(f"Error saving custom mapping: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save mapping: {str(e)}",
        )


@router.get("/custom-mappings")
async def get_custom_mappings():
    """
    List all user-confirmed and AI-accepted mappings.
    """
    mappings = list_custom_mappings()
    return {
        "count": len(mappings),
        "mappings": mappings,
    }


@router.delete("/custom-mappings/{walcano_name}")
async def remove_custom_mapping(walcano_name: str):
    """
    Delete a custom mapping.
    """
    deleted = delete_custom_mapping(walcano_name)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No custom mapping found for '{walcano_name}'",
        )
    return {
        "success": True,
        "message": f"Custom mapping removed for '{walcano_name}'",
    }


@router.post("/restock-insights")
async def get_restock_insights(req: RestockInsightsRequest = RestockInsightsRequest()):
    """
    Generate proactive restock report, stockout risk tiers, and health score.
    """
    try:
        inv_data = await _qbo_client.fetch_live_inventory(include_demo=req.demo or True)
        items = inv_data.get("items", [])
        return await restock_service.generate_restock_report(
            items=items,
            threshold_low=req.threshold_low,
        )
    except Exception as e:
        logger.error(f"Error generating restock insights: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Restock insights error: {str(e)}",
        )


@router.post("/semantic-search")
async def semantic_search(req: SemanticSearchRequest):
    """
    Perform natural language semantic search across tile catalog.
    """
    try:
        inv_data = await _qbo_client.fetch_live_inventory(include_demo=req.demo or True)
        items = inv_data.get("items", [])
        return await semantic_search_service.search_products(
            query=req.query,
            items=items,
            limit=req.limit,
        )
    except Exception as e:
        logger.error(f"Error performing semantic search: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search error: {str(e)}",
        )
