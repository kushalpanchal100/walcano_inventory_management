"""Authoritative product mapping between Wallcano Tiles and Surfaces Tiles.

Derived directly from WallcanoSurfacesNames - Sheet1.pdf.
Provides precise matching based on product line, size, finish, and attributes.
"""

import json
import logging
from pathlib import Path
from datetime import datetime
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

CUSTOM_MAPPINGS_FILE = Path(__file__).resolve().parent.parent.parent.parent / ".custom_mappings.json"


def load_custom_mappings() -> Dict[str, Dict[str, Any]]:
    """Load user-confirmed or AI-accepted mappings from JSON file."""
    if not CUSTOM_MAPPINGS_FILE.exists():
        return {}
    try:
        with open(CUSTOM_MAPPINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to read custom mappings file: {e}")
        return {}


def save_custom_mapping(
    walcano_name: str,
    surfaces_name: str,
    confidence: float = 1.0,
    note: str = "AI confirmed mapping",
) -> None:
    """Save or update an accepted product mapping."""
    mappings = load_custom_mappings()
    key = walcano_name.strip().lower()
    mappings[key] = {
        "walcano_name": walcano_name.strip(),
        "surfaces_name": surfaces_name.strip(),
        "confidence": confidence,
        "note": note,
        "updated_at": datetime.now().isoformat(),
    }
    try:
        with open(CUSTOM_MAPPINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(mappings, f, indent=2)
        logger.info(f"Saved custom mapping for '{walcano_name}' -> '{surfaces_name}'")
    except Exception as e:
        logger.error(f"Failed to save custom mapping: {e}")
        raise


def delete_custom_mapping(walcano_name: str) -> bool:
    """Delete a custom mapping by Wallcano product name."""
    mappings = load_custom_mappings()
    key = walcano_name.strip().lower()
    if key in mappings:
        del mappings[key]
        try:
            with open(CUSTOM_MAPPINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(mappings, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to delete custom mapping: {e}")
            raise
    return False


def list_custom_mappings() -> List[Dict[str, Any]]:
    """Return all stored custom mappings as a list."""
    mappings = load_custom_mappings()
    return list(mappings.values())


# Raw mapping table: 56 items directly extracted from WallcanoSurfacesNames - Sheet1.pdf
PDF_MAPPING_ROWS: List[Tuple[str, str]] = [
    ("Stoneage Darkgrey", "Mandala Dark Grey 30x60 cm Feature Wall Tiles"),
    ("Stoneage Lightgrey", "Vintage Ash Light Grey 30x60 CM Feature Wall Tiles"),
    ("Eternal Satuario", "Mercure Marble White 30x60 cm Matt Tiles"),
    ("Onyx white", "Snow Sheen 30x60 CM Polished Porcelain Marble Look Wall & Floor Tile"),
    ("Brickstone Grey", "Brick Effect Grey 30x60 CM Feature Wall Tiles"),
    ("Brickstone Natural", "Brick Effect Natural 30x60 CM Feature Wall Tiles"),
    ("Jaisalmer Beige", "Sandstone Beige 30x60 CM Feature Wall Tiles"),
    ("Eternal Satuario", "Mercure Marble White 60x120 cm Polished Porcelain Tile"),
    ("Eternal Satuario", "Mercure Marble White 60x60 cm Matt Porcelain Tile"),
    ("Eternal Satuario", "Mercure Marble White 60x60 cm Polished Tiles"),
    ("Spectra Brown Endless", "Mystic Brown Endless 30x60 cm Polished Porcelain Tiles"),
    ("Dappled Grey", "Meadow Ash 60x60 cm Carving Matt Porcelain Tiles"),
    ("Spectra Brown Endless", "Mystic Brown Endless 60X60 cm Polished Porcelain Tiles"),
    ("Mystic Griss Endless", "Mystic Griss Endless 60x60 cm Polished Porcelain Tiles"),
    ("Splendor Gold", "Luxe Gold 60x60 CM Matt Porcelain Tiles"),
    ("Ruby Onyx Pink", "Rosetta Pink 60x120 CM Matt Porcelain Tiles"),
    ("Ruby Onyx Pink", "Rosetta Pink 60x120 cm Polished Porcelain Tiles"),
    ("Alfresco Wood", "Enduro Walnut 60x90cm (2cm) Outdoor Porcelain Tiles"),
    ("Cemslate Anthracite", "Endura Anthracite 60X90 cm (2cm) Outdoor Tiles"),
    ("Splendor Gold", "Luxe Gold 60x120 cm Matt Porcelain Tiles"),
    ("Splendor Gold", "Luxe Gold 60x120 cm Polished Porcelain Tiles"),
    ("Sunset Green", "Sunset Green 60x120 cm Polished Porcelain Tiles"),
    ("Cementino Grey", "Granvia Grey 60x90cm (2cm) Outdoor Porcelain Floor Tiles"),
    ("Hardwood Bianco", "Mistwood Bianco 60x90cm (2cm) Outdoor Porcelain Floor Tiles"),
    ("cemslate Anthracite", "Vulcan Anthracite 60x90cm (2cm) Outdoor Porcelain Floor Tiles"),
    ("Newton Anthrecite", "Sahara Anthracite 60x90cm (2cm) Outdoor Porcelain Tiles"),
    ("Grande El Lasa Beige", "Sabbia Beige 60x120 cm Polished Porcelain Tile"),
    ("Romelini Bianco", "Verona Bianco 60x120 cm Polished Porcelain Tile"),
    ("Sparos Gold", "Sparos Dorado 60x120 cm Polished Porcelain Tile"),
    ("Spanish Punch", "Misty Matte 60x120 CM Matt Porcelain Tiles"),
    ("Pacific Aqua", "Mystic Azure 60x120 cm Polished Porcelain Tiles"),
    ("Onyx Blue", "Ocean Blue 60x120 cm High Gloss Porcelain Tiles"),
    ("Ruby Onyx Sky", "Rosetta Beige 60x120 cm Polished Porcelain Tiles"),
    ("Astonished Grey", "Zenith Grey 80x120 cm Carving Matt Tiles"),
    ("Concrete Bianco", "Mortar Bianco 80x120 cm Matt Tiles"),
    ("Imperial Beige", "Pune Beige 80x120 cm Polished Tiles"),
    ("Elegant Satuario Endless", "Classico Grande Endless 80x120 cm Matt Porcelain Tiles"),
    ("Elegant Satuario Endless", "Classico Grande Endless 80x120 cm Polished Porcelain Tiles"),
    ("Onyx Pearl", "Gemstone Pearl 80x120 CM Polished Porcelain Tiles"),
    ("Brooks Bone", "Render Bone 60X120 cm Matt Porcelain Tiles"),
    ("Brooks Grey", "Render Grey 60x120 cm Matt Porcelain Tiles"),
    ("Brooks Pearl", "Render Pearl 60x120 cm Matt Porcelain Tiles"),
    ("Onyx Turquoise", "Mystic Turquoise 80x120 cm High Gloss Porcelain Tiles"),
    ("Terra Crema Cement", "Cotto Sealine Cement 80x120 cm Ghr Matt Porcelain Tile"),
    ("Terra Crema White", "Cotto Sealine White 80x120 cm Ghr Matt Porcelain Tile"),
    ("Terra Crema Ghr", "Cotto Sealine Crema 80x120 cm Ghr Matt Porcelain Tile"),
    ("Tempo White Matt", "Nexo Snow 60X120 cm Matt Porcelain Tiles"),
    ("Tempo Sand Matt", "Nexo Dune 100x100 CM Matt Porcelain Tiles"),
    ("Tempo Sand Matt", "Nexo Dune 60x120 cm Matt Porcelain Tiles"),
    ("Tempo Greige Matt", "Nexo Taupe Matt 60x120 CM Matt Porcelain Floor & Wall Tiles"),
    ("Brooks Grey", "Render Grey 100X100 CM Matt Porcelain Tiles"),
    ("Burnt Charcoal", "Volcanic Charcoal 60x120 CM Glass Tiles Glossy Grey Wall Tiles for Modern Interiors"),
    ("Gloucose White", "Cloudy White 60x120 cm Glass Tiles"),
    ("Hurrican Roase Gold", "Pewter Grey 60x120 cm Glass Tiles"),
    ("Magnum Blue", "Titan Blue 60x120 CM Glass Tiles"),
    ("Scoria Gold", "Lava Gold 60x120 cm Glass Tiles"),
]


def normalize_size(text: str) -> Optional[Tuple[int, int]]:
    """Extract standard (width_cm, height_cm) dimensions from a name or SKU.
    
    Handles mm (e.g., 600x1200 -> 60x120) and cm (e.g., 60x120 -> 60x120).
    """
    if not text:
        return None
    m = re.search(r'(\d{2,4})\s*[xX*]\s*(\d{2,4})', text)
    if not m:
        # Check for SKU patterns like 60120 or 6060 or 80160
        m_sku = re.search(r'-(\d{2})(\d{2,3})(?:$|[^\d])', text)
        if m_sku:
            d1 = int(m_sku.group(1))
            d2 = int(m_sku.group(2))
            return (min(d1, d2), max(d1, d2))
        return None

    d1, d2 = int(m.group(1)), int(m.group(2))
    # If dimensions are in mm (>= 250 and multiple of 10), convert to cm
    if d1 >= 250 and d1 % 10 == 0:
        d1 = d1 // 10
    if d2 >= 250 and d2 % 10 == 0:
        d2 = d2 // 10

    return (min(d1, d2), max(d1, d2))


def extract_finish(text: str) -> List[str]:
    """Extract surface finish and texture descriptors."""
    if not text:
        return []
    t = text.lower()
    finishes = []
    if "matt" in t or "matte" in t:
        finishes.append("matt")
    if "polish" in t:
        finishes.append("polished")
    if "high gloss" in t or "glossy" in t or "gloss" in t:
        finishes.append("gloss")
    if "carving" in t:
        finishes.append("carving")
    if "satin" in t:
        finishes.append("satin")
    if "glass" in t:
        finishes.append("glass")
    if "outdoor" in t or "paver" in t or "2cm" in t:
        finishes.append("outdoor")
    if "ghr" in t:
        finishes.append("ghr")
    if "feature" in t:
        finishes.append("feature")
    if "endless" in t:
        finishes.append("endless")
    return finishes


def normalize_words(text: str) -> List[str]:
    """Tokenize lowercase alphanumeric words, filtering stopwords."""
    stopwords = {"cm", "mm", "tiles", "tile", "porcelain", "wall", "floor", "for", "look", "interiors", "modern"}
    tokens = re.findall(r'[a-zA-Z0-9]+', text.lower())
    return [tok for tok in tokens if tok not in stopwords]


class ParsedMappingEntry:
    def __init__(self, walcano_name: str, surfaces_name: str):
        self.walcano_name = walcano_name.strip()
        self.surfaces_name = surfaces_name.strip()
        self.walcano_size = normalize_size(self.walcano_name)
        self.surfaces_size = normalize_size(self.surfaces_name)
        self.effective_size = self.surfaces_size or self.walcano_size
        self.walcano_finish = extract_finish(self.walcano_name)
        self.surfaces_finish = extract_finish(self.surfaces_name)
        self.walcano_tokens = normalize_words(self.walcano_name)
        self.surfaces_tokens = normalize_words(self.surfaces_name)


# Precompile parsed mapping entries
PARSED_ENTRIES: List[ParsedMappingEntry] = [
    ParsedMappingEntry(w, s) for w, s in PDF_MAPPING_ROWS
]


def match_product_mapping(item_name: str, sku: Optional[str] = None) -> Dict[str, Any]:
    """
    Match a product item (from QuickBooks or Inventory) against the Surfaces Tiles PDF catalog.

    Returns:
        {
            "walcano_name": str,
            "surfaces_name": Optional[str],
            "surfaces_variants": List[str],
            "is_mapped": bool,
            "match_confidence": float,
            "mapping_note": Optional[str],
        }
    """
    if not item_name:
        return {
            "walcano_name": "",
            "surfaces_name": None,
            "surfaces_variants": [],
            "is_mapped": False,
            "match_confidence": 0.0,
            "mapping_note": "No item name provided",
        }

    combined_query = f"{item_name} {sku or ''}".strip()
    item_size = normalize_size(combined_query)
    item_finishes = extract_finish(combined_query)
    item_tokens = set(normalize_words(item_name))

    # 0. Check custom user-confirmed / AI-accepted mappings first
    custom_mappings = load_custom_mappings()
    custom_key = item_name.strip().lower()
    if custom_key in custom_mappings:
        custom_entry = custom_mappings[custom_key]
        return {
            "walcano_name": custom_entry.get("walcano_name", item_name),
            "surfaces_name": custom_entry.get("surfaces_name"),
            "surfaces_variants": [custom_entry.get("surfaces_name")],
            "is_mapped": True,
            "match_confidence": custom_entry.get("confidence", 1.0),
            "mapping_note": custom_entry.get("note", "AI confirmed mapping"),
        }

    # 1. Exact or near-exact match on Surfaces Name directly
    for entry in PARSED_ENTRIES:
        if entry.surfaces_name.lower() == item_name.strip().lower():
            return {
                "walcano_name": entry.walcano_name,
                "surfaces_name": entry.surfaces_name,
                "surfaces_variants": [entry.surfaces_name],
                "is_mapped": True,
                "match_confidence": 1.0,
                "mapping_note": "Exact Surfaces product match",
            }

    # 2. Match based on Wallcano product line
    matching_candidates: List[ParsedMappingEntry] = []

    for entry in PARSED_ENTRIES:
        entry_w_tokens = set(entry.walcano_tokens)
        # Check if Wallcano name base is in item_name
        walcano_base = entry.walcano_name.lower().replace("endless", "").strip()
        if walcano_base and walcano_base in item_name.lower():
            matching_candidates.append(entry)
        elif entry_w_tokens and entry_w_tokens.issubset(item_tokens):
            matching_candidates.append(entry)

    # If no subset match, try high token overlap for Wallcano name
    if not matching_candidates:
        scored = []
        for entry in PARSED_ENTRIES:
            entry_w_tokens = set(entry.walcano_tokens)
            if not entry_w_tokens:
                continue
            common = entry_w_tokens.intersection(item_tokens)
            ratio = len(common) / len(entry_w_tokens)
            if ratio >= 0.75:
                scored.append((ratio, entry))
        if scored:
            max_ratio = max(s[0] for s in scored)
            matching_candidates = [entry for r, entry in scored if r == max_ratio]

    if not matching_candidates:
        # Check if any surfaces token core matches (reverse lookup)
        for entry in PARSED_ENTRIES:
            # First 2-3 words of surfaces name (product title)
            surfaces_core = " ".join(entry.surfaces_tokens[:3])
            if surfaces_core and surfaces_core in item_name.lower():
                matching_candidates.append(entry)

    if not matching_candidates:
        # Unmapped product
        return {
            "walcano_name": item_name,
            "surfaces_name": None,
            "surfaces_variants": [],
            "is_mapped": False,
            "match_confidence": 0.0,
            "mapping_note": "No Surfaces Tiles mapping available in reference PDF",
        }

    # Extract all variant Surfaces names for this Wallcano line
    all_variant_names = list(dict.fromkeys(e.surfaces_name for e in matching_candidates))

    # If only 1 candidate, that's our match
    if len(matching_candidates) == 1:
        best = matching_candidates[0]
        return {
            "walcano_name": best.walcano_name,
            "surfaces_name": best.surfaces_name,
            "surfaces_variants": all_variant_names,
            "is_mapped": True,
            "match_confidence": 0.95,
            "mapping_note": "Direct reference mapping",
        }

    # Multiple variants exist (e.g. Eternal Satuario, Splendor Gold, Ruby Onyx Pink)
    # Score candidates based on size, finish, and attributes
    best_candidate = matching_candidates[0]
    best_score = -1.0

    for cand in matching_candidates:
        score = 1.0  # Base match for line

        # Size matching
        if item_size and cand.effective_size:
            if item_size == cand.effective_size:
                score += 5.0  # Strong size match
            else:
                score -= 2.0  # Size mismatch penalty

        # Finish matching
        cand_finishes = cand.surfaces_finish + cand.walcano_finish
        for f in item_finishes:
            if f in cand_finishes:
                score += 3.0  # Finish match
            else:
                score -= 1.0

        # Substring / attribute bonus
        for tok in cand.surfaces_tokens:
            if tok in combined_query.lower():
                score += 0.5

        if score > best_score:
            best_score = score
            best_candidate = cand

    return {
        "walcano_name": best_candidate.walcano_name,
        "surfaces_name": best_candidate.surfaces_name,
        "surfaces_variants": all_variant_names,
        "is_mapped": True,
        "match_confidence": min(1.0, max(0.5, best_score / 10.0)),
        "mapping_note": f"Matched from {len(matching_candidates)} PDF variant options by attributes",
    }


def get_all_reference_mappings() -> List[Dict[str, Any]]:
    """Return all 56 official mappings from the PDF."""
    return [
        {
            "index": idx + 1,
            "walcano_name": w,
            "surfaces_name": s,
            "size": normalize_size(s),
            "finishes": extract_finish(s),
        }
        for idx, (w, s) in enumerate(PDF_MAPPING_ROWS)
    ]
