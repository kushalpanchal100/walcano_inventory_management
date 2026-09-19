"""Product Auto-Mapper AI Service.

Specialized in automatically mapping Walcano Tiles and Surfaces Tiles products,
and generating unique, relevant, and consistent Surfaces Tiles product names
using Google Gemini AI based on mapped Walcano product attributes.
"""

import json
import logging
import random
import re
from typing import Any, Dict, List, Optional, Set

from app.integrations.quickbooks.product_mapping import (
    PARSED_ENTRIES,
    PDF_MAPPING_ROWS,
    extract_finish,
    load_custom_mappings,
    normalize_size,
    normalize_words,
    save_custom_mapping,
)
from app.services.ai.gemini_provider import gemini_provider

logger = logging.getLogger(__name__)

# Curated luxury collection prefixes for brand-consistent naming and fallback
LUXURY_COLLECTIONS = [
    "Aura", "Bellagio", "Lumina", "Celestia", "Novara", "Vento", "Petra",
    "Statuario Supremo", "Opulenza", "Elysium", "Verona", "Milano", "Carrara Grand",
    "Sabbia", "Mercure Marble", "Nexo", "Enduro", "Mandala", "Luxe", "Rosetta",
    "Zenith", "Gemstone", "Cotto Sealine", "Titan", "Volcanic", "Cloudy", "Lava"
]


def get_all_existing_surfaces_names() -> Set[str]:
    """Collect all known Surfaces product names to prevent duplicates."""
    names: Set[str] = set()

    # 1. Authoritative PDF mappings
    for _, s_name in PDF_MAPPING_ROWS:
        if s_name and s_name.strip():
            names.add(s_name.strip())

    # 2. Saved custom mappings
    try:
        custom_mappings = load_custom_mappings()
        for entry in custom_mappings.values():
            sn = entry.get("surfaces_name")
            if sn and sn.strip():
                names.add(sn.strip())
    except Exception as e:
        logger.warning(f"Error loading custom mappings for uniqueness check: {e}")

    return names


class ProductAutoMapperService:
    """Auto-maps products and generates unique Surfaces product names with Gemini AI."""

    def __init__(self, provider=gemini_provider):
        self.provider = provider

    def _extract_product_specs(self, walcano_name: str, sku: str = "", category: str = "") -> Dict[str, Any]:
        """Parse structured physical attributes from Walcano product information."""
        combined = f"{walcano_name} {sku} {category}".strip()
        size_tuple = normalize_size(combined)
        finishes = extract_finish(combined)
        tokens = normalize_words(walcano_name)

        # Standardize size string
        dim_str = "60x120 cm"
        is_outdoor = "outdoor" in finishes or "paver" in combined.lower() or "2cm" in combined.lower()
        if size_tuple:
            w, h = size_tuple
            if is_outdoor and (w, h) in [(60, 90), (90, 60)]:
                dim_str = "60x90cm (2cm)"
            else:
                dim_str = f"{w}x{h} cm"

        # Standardize finish string
        finish_str = "Polished Porcelain"
        if "carving" in finishes:
            finish_str = "Carving Matt Porcelain"
        elif "glass" in finishes:
            finish_str = "Glass Tiles"
        elif "outdoor" in finishes or is_outdoor:
            finish_str = "Outdoor Porcelain Floor"
        elif "matt" in finishes:
            finish_str = "Matt Porcelain"
        elif "gloss" in finishes:
            finish_str = "High Gloss Porcelain"
        elif "satin" in finishes:
            finish_str = "Satin Porcelain"
        elif "polished" in finishes:
            finish_str = "Polished Porcelain"

        # Determine tile type
        tile_type = "Tiles"
        c_lower = category.lower()
        if "wall" in c_lower or "feature" in combined.lower():
            tile_type = "Feature Wall Tiles"
        elif "slab" in c_lower or (size_tuple and max(size_tuple) >= 160):
            tile_type = "Porcelain Slabs"
        elif "outdoor" in c_lower or is_outdoor:
            tile_type = "Tiles"
        elif "glass" in c_lower:
            tile_type = "Tiles"
        else:
            tile_type = "Floor & Wall Tiles"

        return {
            "walcano_name": walcano_name,
            "sku": sku,
            "category": category or "Porcelain Tiles",
            "size_tuple": size_tuple,
            "dimensions": dim_str,
            "finishes": finishes,
            "finish_str": finish_str,
            "tile_type": tile_type,
            "tokens": tokens,
            "is_outdoor": is_outdoor,
        }

    async def generate_unique_surfaces_name(
        self,
        walcano_details: Dict[str, Any],
        existing_names: Optional[Set[str]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a unique, relevant, and consistent Surfaces Tiles product name using Gemini AI.
        
        Guarantees that the generated name does not conflict with:
        - PDF catalog reference mappings
        - .custom_mappings.json entries
        - Active live inventory items
        """
        if existing_names is None:
            existing_names = get_all_existing_surfaces_names()

        existing_names_lower = {n.lower().strip() for n in existing_names}

        walcano_name = walcano_details.get("walcano_name") or walcano_details.get("name", "")
        sku = walcano_details.get("sku", "")
        category = walcano_details.get("category", "")

        specs = self._extract_product_specs(walcano_name, sku, category)

        # 1. Attempt generation with Gemini AI if configured
        if self.provider.is_configured:
            try:
                gemini_result = await self._generate_name_with_gemini(
                    specs=specs,
                    existing_names=existing_names,
                    existing_names_lower=existing_names_lower,
                )
                if gemini_result and gemini_result.get("surfaces_name"):
                    gen_name = gemini_result["surfaces_name"].strip()
                    if gen_name.lower() not in existing_names_lower:
                        return {
                            "surfaces_name": gen_name,
                            "confidence": round(float(gemini_result.get("confidence", 0.96)), 2),
                            "reasoning": gemini_result.get("reasoning", "Generated by AI matching Walcano specifications"),
                            "is_unique": True,
                            "provider": "gemini",
                            "attributes": {
                                "dimensions": specs["dimensions"],
                                "finish": specs["finish_str"],
                                "tile_type": specs["tile_type"],
                                "collection": gemini_result.get("collection", "Surfaces Signature"),
                            },
                        }
                    else:
                        logger.warning(f"Gemini name '{gen_name}' already exists, generating distinct variant.")
            except Exception as e:
                logger.error(f"Gemini unique name generation error: {e}", exc_info=True)

        # 2. Heuristic fallback generation with uniqueness verification
        return self._heuristic_unique_name(specs, existing_names_lower)

    async def _generate_name_with_gemini(
        self,
        specs: Dict[str, Any],
        existing_names: Set[str],
        existing_names_lower: Set[str],
        forbidden_candidates: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Call Gemini to synthesize a brand-compliant unique Surfaces product name derived SOLELY from the selected product."""
        forbidden_list = list(existing_names)[:60]
        if forbidden_candidates:
            forbidden_list.extend(forbidden_candidates)

        selected_name = specs["walcano_name"]

        system_instruction = (
            "You are an elite tile catalog architect and brand naming specialist for Surfaces Tiles "
            "(a luxury architectural B2C tile brand) and Walcano Tiles (its manufacturing counterpart).\n\n"
            "CRITICAL CONSTRAINTS & SINGLE SOURCE OF TRUTH:\n"
            f"The user has selected ONE specific Walcano product as the SINGLE SOURCE OF TRUTH: '{selected_name}'.\n"
            "1. You must derive the unique Surfaces Tiles product name EXCLUSIVELY and STRICTLY from this selected Walcano product's specifications.\n"
            "2. Do NOT use other Walcano products, alternative matches, or suggested products.\n"
            "3. Do NOT provide alternative product suggestions or names based on other Walcano products.\n"
            "4. Return EXACTLY ONE unique Surfaces Tiles product name based only on the selected Walcano product's details.\n\n"
            "Surfaces Tiles Brand Naming Syntax:\n"
            "[Luxury Collection Name] [Color / Motif Descriptor] [Dimensions cm] [Surface Finish] [Tile Type]\n\n"
            "Naming Rules:\n"
            "1. RELEVANCE: Accurately reflect this specific product's physical dimensions (e.g. 60x120 cm, 60x60 cm, 80x120 cm, 60x90cm (2cm)), "
            "surface finish (Polished, Matt, Carving Matt, High Gloss, Satin, Glass, Outdoor Paver), and tile type.\n"
            "2. CONSISTENCY: Use evocative luxury collection names (e.g., Mercure, Aura, Bellagio, Lumina, Celestia, Novara, Enduro, "
            "Sabbia, Rosetta, Mystic, Zenith, Pune, Nexo, Volcanic, etc.) paired with clear color/motif descriptors derived from this product.\n"
            "3. STRICT UNIQUENESS: The generated name MUST BE 100% UNIQUE. It MUST NOT match any existing catalog product name.\n"
            "4. FORBIDDEN NAMES (Do NOT use any of these or near-duplicates):\n"
            f"{json.dumps(forbidden_list[:40], indent=1)}\n\n"
            "Output MUST be valid JSON with keys:\n"
            "{\n"
            "  \"surfaces_name\": \"[Collection] [Color/Motif] [Dimensions] [Finish] [Tile Type]\",\n"
            "  \"collection\": \"Name of the luxury collection\",\n"
            "  \"color_descriptor\": \"Color or veining tone\",\n"
            "  \"dimensions\": \"Dimensions in cm\",\n"
            "  \"finish\": \"Finish specification\",\n"
            "  \"tile_type\": \"Tile category specification\",\n"
            "  \"confidence\": 0.98,\n"
            f"  \"reasoning\": \"Derived exclusively from selected Walcano product '{selected_name}'\"\n"
            "}"
        )

        prompt = (
            f"SELECTED WALCANO PRODUCT (SINGLE SOURCE OF TRUTH):\n"
            f"- Walcano Product Name: {specs['walcano_name']}\n"
            f"- SKU: {specs['sku']}\n"
            f"- Category: {specs['category']}\n"
            f"- Extracted Dimensions: {specs['dimensions']}\n"
            f"- Extracted Finish: {specs['finish_str']}\n"
            f"- Extracted Tile Type: {specs['tile_type']}\n\n"
            f"Remember: Base your name ONLY on this specific selected Walcano product. Do not suggest or reference any other product. "
            f"Generate exactly ONE unique Surfaces Tiles product name in JSON format."
        )

        result = await self.provider.generate_structured_json(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.2,
        )

        if isinstance(result, dict) and result.get("surfaces_name"):
            return result
        return None


    def _heuristic_unique_name(
        self,
        specs: Dict[str, Any],
        existing_names_lower: Set[str],
    ) -> Dict[str, Any]:
        """Deterministic, brand-consistent fallback generator ensuring zero collision."""
        w_name = specs["walcano_name"]
        dim = specs["dimensions"]
        finish = specs["finish_str"]
        tile_type = specs["tile_type"]

        # Extract primary color or tone keyword
        color_kw = "Marble White"
        tokens = [t.capitalize() for t in specs["tokens"] if t.lower() not in {"tiles", "tile", "porcelain", "wall", "floor"}]
        if tokens:
            color_kw = " ".join(tokens[:2])

        # Find an unused luxury collection prefix
        chosen_name = None
        for col in LUXURY_COLLECTIONS:
            cand = f"{col} {color_kw} {dim} {finish} {tile_type}".strip()
            if cand.lower() not in existing_names_lower:
                chosen_name = cand
                break

        if not chosen_name:
            # Add unique variant suffix
            suffix_num = 1
            while True:
                cand = f"Aura {color_kw} Grande {suffix_num} {dim} {finish} {tile_type}"
                if cand.lower() not in existing_names_lower:
                    chosen_name = cand
                    break
                suffix_num += 1

        return {
            "surfaces_name": chosen_name,
            "confidence": 0.90,
            "reasoning": f"Generated based on {dim} dimension, {finish} finish, and {color_kw} color tone",
            "is_unique": True,
            "provider": "heuristic",
            "attributes": {
                "dimensions": dim,
                "finish": finish,
                "tile_type": tile_type,
                "collection": chosen_name.split()[0],
            },
        }

    async def auto_map_single_product(
        self,
        walcano_name: Optional[str] = None,
        surfaces_name: Optional[str] = None,
        sku: Optional[str] = None,
        category: Optional[str] = None,
        auto_save: bool = True,
        existing_inventory_names: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Execute Auto Mapping for a specific product.
        
        If starting from a Surfaces Tiles product or Walcano product, automatically:
        1. Maps it to the corresponding Walcano product.
        2. Generates a unique Surfaces Tiles product name using Gemini AI based on the mapped Walcano details.
        3. Optionally persists the custom mapping so it applies across inventory & CSV exports.
        """
        existing_names = get_all_existing_surfaces_names()
        if existing_inventory_names:
            for n in existing_inventory_names:
                if n and n.strip():
                    existing_names.add(n.strip())

        # Determine effective Walcano item
        target_walcano = (walcano_name or "").strip()

        # If only surfaces_name was provided, find corresponding Walcano product
        if not target_walcano and surfaces_name:
            s_query = surfaces_name.strip()
            # 1. Search PDF mapping rows
            for w, s in PDF_MAPPING_ROWS:
                if s.lower() == s_query.lower():
                    target_walcano = w
                    break

            # 2. Search parsed entries by token similarity
            if not target_walcano:
                s_tokens = set(normalize_words(s_query))
                best_w = None
                best_score = 0
                for entry in PARSED_ENTRIES:
                    common = s_tokens.intersection(set(entry.surfaces_tokens + entry.walcano_tokens))
                    if len(common) > best_score:
                        best_score = len(common)
                        best_w = entry.walcano_name
                target_walcano = best_w or surfaces_name

        if not target_walcano:
            target_walcano = "Unspecified Tile Product"

        # Generate unique Surfaces Tiles product name based on mapped Walcano details
        walcano_details = {
            "walcano_name": target_walcano,
            "sku": sku or "",
            "category": category or "Porcelain Tiles",
        }

        unique_gen = await self.generate_unique_surfaces_name(
            walcano_details=walcano_details,
            existing_names=existing_names,
        )

        gen_surfaces_name = unique_gen["surfaces_name"]
        confidence = unique_gen["confidence"]
        reasoning = unique_gen["reasoning"]

        saved = False
        if auto_save and target_walcano and gen_surfaces_name:
            try:
                save_custom_mapping(
                    walcano_name=target_walcano,
                    surfaces_name=gen_surfaces_name,
                    confidence=confidence,
                    note=reasoning,
                )
                saved = True
            except Exception as e:
                logger.error(f"Failed to auto-save custom mapping: {e}")

        return {
            "success": True,
            "walcano_name": target_walcano,
            "surfaces_name": gen_surfaces_name,
            "confidence": confidence,
            "reasoning": reasoning,
            "is_unique": unique_gen.get("is_unique", True),
            "provider": unique_gen.get("provider", "gemini"),
            "attributes": unique_gen.get("attributes", {}),
            "saved": saved,
        }

    async def auto_map(
        self,
        unmapped_items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Generate AI mapping suggestions for unmapped inventory items using Gemini AI."""
        if not unmapped_items:
            return []

        existing_names = get_all_existing_surfaces_names()
        # Add existing mapped names from items
        for it in unmapped_items:
            sn = it.get("surfaces_name")
            if sn and sn.strip():
                existing_names.add(sn.strip())

        suggestions = []
        for it in unmapped_items:
            w_name = it.get("walcano_name") or it.get("name", "")
            sku = it.get("sku", "")
            cat = it.get("category", "General")

            gen_result = await self.generate_unique_surfaces_name(
                walcano_details={"walcano_name": w_name, "sku": sku, "category": cat},
                existing_names=existing_names,
            )

            # Record newly generated name so subsequent items in the batch also don't collide
            new_name = gen_result["surfaces_name"]
            existing_names.add(new_name)

            suggestions.append({
                "walcano_name": w_name,
                "suggested_surfaces_name": new_name,
                "confidence": gen_result["confidence"],
                "reasoning": gen_result["reasoning"],
                "is_unique": gen_result.get("is_unique", True),
                "provider": gen_result.get("provider", "gemini"),
                "attributes": gen_result.get("attributes", {}),
            })

        return suggestions


# Global singleton instance
auto_mapper_service = ProductAutoMapperService()
