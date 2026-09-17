"""Restock Insights & Stockout Forecasting AI Service.

Analyzes stock levels, computes inventory health metrics, identifies stockout risks,
and generates purchase order reorder recommendations.
"""

import logging
from typing import Any, Dict, List, Optional

from app.services.ai.gemini_provider import gemini_provider

logger = logging.getLogger(__name__)


class RestockInsightsService:
    """Computes replenishment recommendations and inventory health scoring."""

    def __init__(self, provider=gemini_provider):
        self.provider = provider

    async def generate_restock_report(
        self,
        items: List[Dict[str, Any]],
        threshold_low: float = 10.0,
    ) -> Dict[str, Any]:
        """
        Analyze current inventory and produce structured reorder insights with risk tiers.
        """
        total_items = len(items)
        if total_items == 0:
            return {
                "health_score": 100,
                "status": "empty",
                "summary": "No inventory records found.",
                "critical_count": 0,
                "low_stock_count": 0,
                "recommendations": [],
                "provider": "heuristic",
            }

        critical_items = []
        low_stock_items = []
        healthy_items = []

        for it in items:
            qty = float(it.get("qty_on_hand", 0.0))
            name = it.get("walcano_name") or it.get("name", "Unknown Item")
            sku = it.get("sku", "")
            category = it.get("category", "General")
            is_mapped = it.get("is_mapped", False)
            surfaces_name = it.get("surfaces_name")

            if qty <= 0:
                # Suggest replenishment batch (e.g. 100 boxes/units base)
                suggested_reorder = 120.0
                critical_items.append({
                    "name": name,
                    "surfaces_name": surfaces_name,
                    "sku": sku,
                    "category": category,
                    "current_qty": qty,
                    "priority": "Critical",
                    "risk_reason": "Completely out of stock (0 units)",
                    "suggested_reorder_qty": suggested_reorder,
                    "is_mapped": is_mapped,
                })
            elif qty <= threshold_low:
                suggested_reorder = max(50.0, 80.0 - qty)
                low_stock_items.append({
                    "name": name,
                    "surfaces_name": surfaces_name,
                    "sku": sku,
                    "category": category,
                    "current_qty": qty,
                    "priority": "High",
                    "risk_reason": f"Only {qty} units remaining (below threshold of {threshold_low})",
                    "suggested_reorder_qty": suggested_reorder,
                    "is_mapped": is_mapped,
                })
            else:
                healthy_items.append(it)

        # Calculate health score: 100 - (critical * 5 + low_stock * 2) capped at 0-100
        penalty = (len(critical_items) * 8.0) + (len(low_stock_items) * 3.0)
        health_score = max(10, min(100, int(100 - (penalty / max(1, total_items) * 100))))

        all_recommendations = critical_items + low_stock_items

        # Generate executive summary
        summary = (
            f"Inventory contains {total_items} total products. "
            f"{len(critical_items)} items are completely out of stock and {len(low_stock_items)} items are running low. "
            f"Overall catalog health is rated at {health_score}/100."
        )

        if self.provider.is_configured and all_recommendations:
            try:
                gemini_summary = await self._generate_gemini_summary(
                    health_score=health_score,
                    critical_count=len(critical_items),
                    low_stock_count=len(low_stock_items),
                    recommendations=all_recommendations[:10],
                )
                if gemini_summary:
                    summary = gemini_summary
            except Exception as e:
                logger.warning(f"Failed to generate Gemini restock summary: {e}")

        return {
            "health_score": health_score,
            "status": "action_required" if all_recommendations else "healthy",
            "summary": summary,
            "total_items": total_items,
            "critical_count": len(critical_items),
            "low_stock_count": len(low_stock_items),
            "healthy_count": len(healthy_items),
            "recommendations": all_recommendations,
            "provider": "gemini" if self.provider.is_configured else "heuristic",
        }

    async def _generate_gemini_summary(
        self,
        health_score: int,
        critical_count: int,
        low_stock_count: int,
        recommendations: List[Dict[str, Any]],
    ) -> Optional[str]:
        """Generate executive restocking summary using Gemini."""
        prompt = (
            f"Generate a 2-3 sentence executive inventory health note for a tile distributor.\n"
            f"Metrics: Health score {health_score}/100, {critical_count} critical stockouts, {low_stock_count} low-stock products.\n"
            f"Sample critical items: {[r['name'] for r in recommendations[:5]]}."
        )
        return await self.provider.generate_text(
            prompt=prompt,
            system_instruction="You are a warehouse procurement advisor. Be concise and actionable.",
            temperature=0.3,
        )


# Global singleton instance
restock_service = RestockInsightsService()
