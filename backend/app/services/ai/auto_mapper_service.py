"""Product Auto-Mapper AI Service.

Specialized in matching unmapped QuickBooks / Walcano inventory items against
the authoritative Surfaces Tiles catalog based on size, finish, and attributes.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from app.integrations.quickbooks.product_mapping import (
    PARSED_ENTRIES,
    PDF_MAPPING_ROWS,
    extract_finish,
    normalize_size,
    normalize_words,
)
from app.services.ai.gemini_provider import gemini_provider

logger = logging.getLogger(__name__)


class ProductAutoMapperService:
    """Matches catalog items using Gemini structured outputs with heuristic fallback."""

    def __init__(self, provider=gemini_provider):
        self.provider = provider

    async def auto_map(
        self,
        unmapped_items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Generate AI mapping suggestions for unmapped inventory items."""
        if not unmapped_items:
            return []

        if self.provider.is_configured:
            try:
                gemini_suggestions = await self._auto_map_with_gemini(unmapped_items)
                if gemini_suggestions:
                    return gemini_suggestions
            except Exception as e:
                logger.warning(f"Gemini auto-mapping failed, using heuristic matcher: {e}")

        return self._heuristic_auto_map(unmapped_items)

    async def _auto_map_with_gemini(
        self,
        unmapped_items: List[Dict[str, Any]],
    ) -> Optional[List[Dict[str, Any]]]:
        """Call Gemini with JSON structured response schema."""
        surfaces_catalog = list(dict.fromkeys(s for _, s in PDF_MAPPING_ROWS))

        sample_unmapped = []
        for it in unmapped_items[:25]:
            sample_unmapped.append({
                "walcano_name": it.get("walcano_name") or it.get("name", ""),
                "sku": it.get("sku", ""),
                "category": it.get("category", "General"),
            })

        system_instruction = (
            "You are a ceramic and porcelain tile catalog specialist for Walcano Tiles and Surfaces Tiles.\n"
            "Your task is to match unmapped Walcano inventory products to their corresponding authoritative Surfaces product.\n\n"
            "Rules for matching:\n"
            "1. Match on dimensions: 30x60, 60x60, 60x90 (2cm outdoor), 60x120, 80x120, 100x100.\n"
            "2. Match on finish: Matt, Polished, Carving, High Gloss, Glass, Outdoor Paver.\n"
            "3. Match on series name and color tone (e.g., Satuario -> Mercure Marble White, Endless -> Classico Grande Endless).\n"
            "4. Provide a confidence between 0.50 and 0.99, and a brief 1-sentence explanation.\n\n"
            "Authoritative Surfaces Catalog options:\n"
            f"{json.dumps(surfaces_catalog, indent=1)}\n\n"
            "Output MUST be a valid JSON array of objects with keys: "
            "'walcano_name', 'suggested_surfaces_name', 'confidence', 'reasoning'."
        )

        prompt = f"Match these unmapped Walcano items:\n{json.dumps(sample_unmapped, indent=1)}"

        results = await self.provider.generate_structured_json(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.1,
        )

        if not results or not isinstance(results, list):
            return None

        return [
            {
                "walcano_name": r.get("walcano_name"),
                "suggested_surfaces_name": r.get("suggested_surfaces_name"),
                "confidence": round(float(r.get("confidence", 0.8)), 2),
                "reasoning": r.get("reasoning", "Matched via Gemini tile attribute analysis"),
                "provider": "gemini",
            }
            for r in results
            if r.get("suggested_surfaces_name")
        ]

    def _heuristic_auto_map(
        self,
        unmapped_items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Smart local fallback matcher comparing dimensions, finishes, and word tokens."""
        suggestions = []

        for it in unmapped_items:
            name = it.get("walcano_name") or it.get("name", "")
            sku = it.get("sku", "")
            query = f"{name} {sku}".strip()

            item_size = normalize_size(query)
            item_finishes = set(extract_finish(query))
            item_tokens = set(normalize_words(name))

            best_entry = None
            best_score = 0.0
            reasons = []

            for entry in PARSED_ENTRIES:
                score = 0.0
                match_reasons = []

                # Size match
                if item_size and entry.effective_size:
                    if item_size == entry.effective_size:
                        score += 0.40
                        match_reasons.append(f"{item_size[0]}x{item_size[1]}cm dimension")

                # Finish match
                cand_finishes = set(entry.surfaces_finish + entry.walcano_finish)
                common_finishes = item_finishes.intersection(cand_finishes)
                if common_finishes:
                    score += 0.30
                    match_reasons.append(f"{'/'.join(common_finishes).capitalize()} finish")

                # Token match
                cand_tokens = set(entry.walcano_tokens + entry.surfaces_tokens)
                common_tokens = item_tokens.intersection(cand_tokens)
                if common_tokens:
                    score += 0.25 * (len(common_tokens) / max(1, len(item_tokens)))
                    match_reasons.append(f"color/series keyword match ({', '.join(common_tokens)})")

                if score > best_score and score >= 0.40:
                    best_score = score
                    best_entry = entry
                    reasons = match_reasons

            if best_entry and best_score >= 0.40:
                confidence = min(0.95, round(best_score, 2))
                reasoning = "Matched based on " + ", ".join(reasons) if reasons else "Partial catalog similarity"
                suggestions.append({
                    "walcano_name": name,
                    "suggested_surfaces_name": best_entry.surfaces_name,
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "provider": "heuristic",
                })

        return suggestions


# Global singleton instance
auto_mapper_service = ProductAutoMapperService()
