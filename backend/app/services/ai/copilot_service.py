"""Inventory Copilot Service.

Specialized in conversational inventory reasoning, answering user questions about current stock,
and emitting structured interactive table filter actions for the UI.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.services.ai.gemini_provider import gemini_provider

logger = logging.getLogger(__name__)


class InventoryCopilotService:
    """Conversational assistant for live inventory insights and UI action generation."""

    def __init__(self, provider=gemini_provider):
        self.provider = provider

    async def chat(
        self,
        query: str,
        items: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Process user query against live inventory snapshot and return answer + filter action.
        """
        if not query or not query.strip():
            return {
                "answer": "Please ask a question about your inventory, stock levels, or product mappings.",
                "action": None,
                "provider": "none",
            }

        # Calculate live inventory stats
        total_items = len(items)
        low_stock = [it for it in items if 0 < it.get("qty_on_hand", 0.0) <= 10]
        out_of_stock = [it for it in items if it.get("qty_on_hand", 0.0) <= 0]
        in_stock = [it for it in items if it.get("qty_on_hand", 0.0) > 10]
        unmapped = [it for it in items if not it.get("is_mapped", False)]
        mapped = [it for it in items if it.get("is_mapped", False)]

        # Try Gemini if configured
        if self.provider.is_configured:
            try:
                gemini_res = await self._chat_with_gemini(
                    query=query,
                    items=items,
                    stats={
                        "total": total_items,
                        "in_stock": len(in_stock),
                        "low_stock": len(low_stock),
                        "out_of_stock": len(out_of_stock),
                        "unmapped": len(unmapped),
                        "mapped": len(mapped),
                    },
                    history=history,
                )
                if gemini_res:
                    return gemini_res
            except Exception as e:
                logger.warning(f"Gemini copilot chat failed, falling back to heuristic: {e}")

        # Fallback to local heuristic assistant
        return self._heuristic_chat(
            query=query,
            items=items,
            low_stock=low_stock,
            out_of_stock=out_of_stock,
            in_stock=in_stock,
            unmapped=unmapped,
            mapped=mapped,
        )

    async def _chat_with_gemini(
        self,
        query: str,
        items: List[Dict[str, Any]],
        stats: Dict[str, int],
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Generate response via Gemini."""
        sampled = []
        for it in items[:70]:
            sampled.append({
                "walcano_name": it.get("walcano_name") or it.get("name", ""),
                "surfaces_name": it.get("surfaces_name"),
                "sku": it.get("sku", ""),
                "qty": it.get("qty_on_hand", 0.0),
                "category": it.get("category", "General"),
                "is_mapped": it.get("is_mapped", False),
            })

        system_instruction = (
            "You are the Walcano AI Inventory Assistant. You help warehouse managers, sales teams, "
            "and inventory controllers manage tile stock and product mappings between Walcano Tiles "
            "and Surfaces Tiles.\n"
            "Inventory Context Overview:\n"
            f"- Total inventory items: {stats['total']}\n"
            f"- In stock (>10 units): {stats['in_stock']}\n"
            f"- Low stock (1-10 units): {stats['low_stock']}\n"
            f"- Out of stock (0 units): {stats['out_of_stock']}\n"
            f"- Unmapped products: {stats['unmapped']}\n"
            f"- Mapped products: {stats['mapped']}\n\n"
            f"Active Inventory Sample:\n{json.dumps(sampled, indent=1)}\n\n"
            "Instructions:\n"
            "1. Give concise, well-formatted Markdown answers.\n"
            "2. If the user wants to inspect, see, or filter a group of products (e.g. low stock, unmapped, "
            "a specific category, or search term), output a JSON action block at the very end on a new line:\n"
            "```json\n"
            "{\n"
            '  "action": "filter",\n'
            '  "label": "View Low Stock Tiles",\n'
            '  "filters": {\n'
            '    "stock": "low_stock" | "out_of_stock" | "in_stock" | "all",\n'
            '    "mapping": "unmapped" | "mapped" | "all",\n'
            '    "category": "All" or category name,\n'
            '    "search": "optional keyword"\n'
            "  }\n"
            "}\n"
            "```\n"
            "Do not include the json block if no UI filter action is relevant."
        )

        prompt = f"User Question: {query}"
        raw_text = await self.provider.generate_text(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.2,
        )

        if not raw_text:
            return None

        # Parse optional action JSON block
        action = None
        cleaned_text = raw_text
        match = re.search(r"```json\s*(\{[\s\S]*?\})\s*```", raw_text)
        if match:
            try:
                action_data = json.loads(match.group(1))
                if action_data.get("action") == "filter":
                    action = action_data
                    cleaned_text = raw_text[:match.start()].strip()
            except Exception as e:
                logger.debug(f"Could not parse action json: {e}")

        return {
            "answer": cleaned_text,
            "action": action,
            "provider": "gemini",
            "model": self.provider.model_name,
        }

    def _heuristic_chat(
        self,
        query: str,
        items: List[Dict[str, Any]],
        low_stock: List[Dict[str, Any]],
        out_of_stock: List[Dict[str, Any]],
        in_stock: List[Dict[str, Any]],
        unmapped: List[Dict[str, Any]],
        mapped: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Local heuristic assistant when Gemini API key is unavailable."""
        q = query.lower()
        total = len(items)

        # 1. Low stock / Out of stock queries
        if any(term in q for term in ["low stock", "running low", "critical", "reorder", "depleted"]):
            items_list = "\n".join(
                f"- **{it.get('walcano_name') or it.get('name')}** (SKU: `{it.get('sku')}`) — **{it.get('qty_on_hand', 0)}** on hand"
                for it in low_stock[:6]
            )
            extra = f"\n*...and {len(low_stock) - 6} more*" if len(low_stock) > 6 else ""
            return {
                "answer": (
                    f"### ⚠️ Low Stock Alert ({len(low_stock)} items)\n\n"
                    f"The following items have **10 or fewer units** remaining in QuickBooks inventory:\n\n"
                    f"{items_list}{extra}\n\n"
                    "> [!TIP]\n"
                    "> Consider creating restock purchase orders for these items to avoid stockouts."
                ),
                "action": {
                    "action": "filter",
                    "label": f"Filter Table: Show {len(low_stock)} Low Stock Items",
                    "filters": {"stock": "low_stock", "mapping": "all"},
                },
                "provider": "heuristic",
            }

        # 2. Out of stock queries
        if any(term in q for term in ["out of stock", "zero stock", "empty", "no stock"]):
            items_list = "\n".join(
                f"- **{it.get('walcano_name') or it.get('name')}** (SKU: `{it.get('sku')}`)"
                for it in out_of_stock[:6]
            )
            return {
                "answer": (
                    f"### 🛑 Out of Stock ({len(out_of_stock)} items)\n\n"
                    f"There are currently **{len(out_of_stock)} items** with 0 quantity on hand.\n\n"
                    f"{items_list}"
                ),
                "action": {
                    "action": "filter",
                    "label": f"Filter Table: Show {len(out_of_stock)} Out of Stock Items",
                    "filters": {"stock": "out_of_stock", "mapping": "all"},
                },
                "provider": "heuristic",
            }

        # 3. Unmapped items queries
        if any(term in q for term in ["unmapped", "mapping", "surfaces mapping", "not mapped"]):
            items_list = "\n".join(
                f"- **{it.get('walcano_name') or it.get('name')}** (SKU: `{it.get('sku')}`)"
                for it in unmapped[:6]
            )
            extra = f"\n*...and {len(unmapped) - 6} more unmapped items*" if len(unmapped) > 6 else ""
            return {
                "answer": (
                    f"### 🔗 Unmapped Products ({len(unmapped)} of {total})\n\n"
                    f"**{len(unmapped)} items** in QuickBooks are not yet mapped to an authoritative Surfaces Tiles product.\n\n"
                    f"{items_list}{extra}\n\n"
                    "Use the manual mapping button on any product row in the table below to assign Surfaces Tiles specifications."
                ),
                "action": {
                    "action": "filter",
                    "label": f"Filter Table: Show {len(unmapped)} Unmapped Items",
                    "filters": {"mapping": "unmapped", "stock": "all"},
                },
                "provider": "heuristic",
            }

        # 4. Outdoor / Pavers queries
        if any(term in q for term in ["outdoor", "paver", "pavers", "2cm", "patio"]):
            outdoor_items = [
                it for it in items
                if "outdoor" in (it.get("category", "") + it.get("name", "")).lower()
                or "2cm" in (it.get("name", "")).lower()
            ]
            items_list = "\n".join(
                f"- **{it.get('walcano_name') or it.get('name')}** — {it.get('qty_on_hand', 0)} in stock"
                for it in outdoor_items[:5]
            )
            return {
                "answer": (
                    f"### 🌿 Outdoor & 2cm Porcelain Tiles ({len(outdoor_items)} products found)\n\n"
                    f"{items_list or 'No specific outdoor tiles found in current query.'}"
                ),
                "action": {
                    "action": "filter",
                    "label": "Filter Table: Show Outdoor Tiles",
                    "filters": {"category": "Outdoor Porcelain", "stock": "all", "mapping": "all"},
                },
                "provider": "heuristic",
            }

        # 5. Summary / Health check query
        return {
            "answer": (
                f"### 📊 Live Inventory Health Summary\n\n"
                f"- **Total Catalog Items:** {total}\n"
                f"- **In Stock:** {len(in_stock)} items (Healthy)\n"
                f"- **Low Stock (≤10):** {len(low_stock)} items (Action Recommended)\n"
                f"- **Out of Stock (0):** {len(out_of_stock)} items (Critical)\n"
                f"- **Mapped to Surfaces:** {len(mapped)} items ({round(len(mapped)/max(1, total)*100)}% coverage)\n"
                f"- **Unmapped:** {len(unmapped)} items\n\n"
                "💡 *Tip: Add `GEMINI_API_KEY` to `backend/.env` for open-ended natural language reasoning and instant calculations.*"
            ),
            "action": {
                "action": "filter",
                "label": "View All Items",
                "filters": {"stock": "all", "mapping": "all", "category": "All", "search": ""},
            },
            "provider": "heuristic",
        }


# Global singleton instance
copilot_service = InventoryCopilotService()
