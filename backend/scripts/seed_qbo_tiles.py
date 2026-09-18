"""Script to seed Walcano & Surfaces Tiles inventory items directly into connected QuickBooks Online company."""

import asyncio
import datetime
import logging
from app.integrations.quickbooks.client import QuickBooksClient
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_tiles")

TILES_DATA = [
    {
        "name": "Carrara White Polished Porcelain 600x1200",
        "sku": "WAL-CAR-60120",
        "qty": 245.0,
        "unit_price": 48.50,
        "description": "Premium 600x1200mm Carrara White polished glazed porcelain floor tile.",
    },
    {
        "name": "Royal Beige Matt Porcelain 600x600",
        "sku": "WAL-ROY-6060",
        "qty": 18.0,
        "unit_price": 32.00,
        "description": "Warm beige 600x600mm matte porcelain wall & floor tile.",
    },
    {
        "name": "Calacatta Gold Bookmatch 800x1600",
        "sku": "WAL-CAL-80160",
        "qty": 132.0,
        "unit_price": 85.00,
        "description": "Luxury Calacatta Gold porcelain slab bookmatched 800x1600mm.",
    },
    {
        "name": "Urban Grey Anti-Slip R11 600x600",
        "sku": "WAL-URB-6060",
        "qty": 74.0,
        "unit_price": 36.50,
        "description": "Heavy-duty 20mm outdoor porcelain paver with R11 slip rating.",
    },
    {
        "name": "Travertine Romano Cross-Cut 600x900",
        "sku": "SUR-TRV-6090",
        "qty": 42.0,
        "unit_price": 54.00,
        "description": "Classic honed travertine stone finish tiles 600x900mm.",
    },
    {
        "name": "Statuary Venato Polished 600x1200",
        "sku": "WAL-STA-60120",
        "qty": 89.0,
        "unit_price": 49.00,
        "description": "Crisp white Italian Statuario marble pattern porcelain tile.",
    },
    {
        "name": "Nero Marquina Satin Porcelain 600x1200",
        "sku": "WAL-NER-60120",
        "qty": 5.0,
        "unit_price": 52.00,
        "description": "Deep black with fine white veining satin finish tile.",
    },
    {
        "name": "Silver River Silk Surface 800x1600",
        "sku": "WAL-SRV-80160",
        "qty": 60.0,
        "unit_price": 78.00,
        "description": "Contemporary silk surface large format porcelain slab.",
    },
    {
        "name": "Crema Marfil Classic Matt 600x600",
        "sku": "WAL-CRM-6060",
        "qty": 110.0,
        "unit_price": 34.00,
        "description": "Soft beige Crema Marfil design matte glazed porcelain tile.",
    },
    {
        "name": "Blue Bahia Luxury Polished 800x1600",
        "sku": "SUR-BLU-80160",
        "qty": 15.0,
        "unit_price": 95.00,
        "description": "Exotic Brazilian blue quartzite effect high gloss porcelain slab.",
    },
    {
        "name": "Stoneage Darkgrey 30x60",
        "sku": "WAL-STN-3060",
        "qty": 120.0,
        "unit_price": 31.00,
        "description": "Walcano Stoneage Darkgrey feature wall tile 30x60cm.",
    },
    {
        "name": "Eternal Satuario 60x120 Polished",
        "sku": "WAL-SAT-60120",
        "qty": 85.0,
        "unit_price": 58.00,
        "description": "Walcano Eternal Satuario polished porcelain tile 60x120cm.",
    },
    {
        "name": "Eternal Satuario 60x60 Matt",
        "sku": "WAL-SAT-6060",
        "qty": 65.0,
        "unit_price": 42.00,
        "description": "Walcano Eternal Satuario matt porcelain tile 60x60cm.",
    },
    {
        "name": "Spectra Brown Endless 60x60 Polished",
        "sku": "WAL-SPB-6060",
        "qty": 90.0,
        "unit_price": 46.00,
        "description": "Walcano Spectra Brown Endless polished porcelain tile 60x60cm.",
    },
    {
        "name": "Splendor Gold 60x120 Matt",
        "sku": "WAL-SPL-60120",
        "qty": 40.0,
        "unit_price": 62.00,
        "description": "Walcano Splendor Gold matt porcelain tile 60x120cm.",
    },
    {
        "name": "Brooks Grey 60x120 Matt",
        "sku": "WAL-BRK-60120",
        "qty": 55.0,
        "unit_price": 52.00,
        "description": "Walcano Brooks Grey matt porcelain tile 60x120cm.",
    },
    {
        "name": "Burnt Charcoal 60x120 Glossy",
        "sku": "WAL-BUR-60120",
        "qty": 35.0,
        "unit_price": 75.00,
        "description": "Walcano Burnt Charcoal glossy glass tile 60x120cm.",
    },
    {
        "name": "Sunset Green 60x120 Polished",
        "sku": "WAL-SNG-60120",
        "qty": 28.0,
        "unit_price": 64.00,
        "description": "Walcano Sunset Green polished porcelain tile 60x120cm.",
    },
    {
        "name": "Alfresco Wood 60x90cm 2cm Outdoor Paver",
        "sku": "WAL-ALF-6090",
        "qty": 70.0,
        "unit_price": 48.00,
        "description": "Walcano Alfresco Wood outdoor porcelain paver 60x90cm (2cm).",
    },
]

async def seed():
    client = QuickBooksClient()
    auth = await client.get_valid_access_token()
    if not auth:
        logger.error("Could not obtain valid QuickBooks access token. Please ensure QBO is connected.")
        return

    access_token, realm_id = auth
    url = f"{client.api_base_url}/v3/company/{realm_id}/item"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # Find or use accounts
    income_ref = {"name": "Sales of Product Income", "value": "79"}
    asset_ref = {"name": "Inventory Asset", "value": "81"}
    expense_ref = {"name": "Cost of Goods Sold", "value": "80"}

    created_count = 0
    start_date = "2026-01-01"

    async with httpx.AsyncClient(timeout=25.0) as http_client:
        for tile in TILES_DATA:
            item_payload = {
                "Name": tile["name"],
                "Sku": tile["sku"],
                "Type": "Inventory",
                "TrackQtyOnHand": True,
                "QtyOnHand": tile["qty"],
                "InvStartDate": start_date,
                "UnitPrice": tile["unit_price"],
                "Description": tile["description"],
                "IncomeAccountRef": income_ref,
                "AssetAccountRef": asset_ref,
                "ExpenseAccountRef": expense_ref,
            }

            resp = await http_client.post(url, json=item_payload, headers=headers)
            if resp.status_code == 200:
                created_item = resp.json().get("Item", {})
                logger.info(f"✅ Created in QuickBooks: {created_item.get('Name')} (ID: {created_item.get('Id')}, Qty: {created_item.get('QtyOnHand')})")
                created_count += 1
            else:
                # Check if item already exists
                err_text = resp.text
                if "already exists" in err_text or "Duplicate" in err_text or "Name elements must be unique" in err_text:
                    logger.info(f"ℹ️ Already exists in QuickBooks: {tile['name']}")
                else:
                    logger.warning(f"⚠️ Failed to create {tile['name']}: {resp.status_code} - {err_text}")

    logger.info(f"\n🎉 Seeding complete! Successfully seeded tile products into QuickBooks company {realm_id}.")

if __name__ == "__main__":
    asyncio.run(seed())
