"""QuickBooks Online API client for live inventory integration."""

import json
import logging
import os
import time
import urllib.parse
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

from app.config.settings import get_settings
from app.integrations.quickbooks.product_mapping import match_product_mapping

logger = logging.getLogger(__name__)

# Token file path
TOKEN_FILE_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".qbo_tokens.json"


class QuickBooksClient:
    """Client for interacting with QuickBooks Online Accounting API."""

    AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
    TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
    SANDBOX_BASE_URL = "https://sandbox-quickbooks.api.intuit.com"
    PROD_BASE_URL = "https://quickbooks.api.intuit.com"

    def __init__(self):
        self.settings = get_settings()
        self.client_id = self.settings.QBO_CLIENT_ID
        self.client_secret = self.settings.QBO_CLIENT_SECRET
        self.redirect_uri = self.settings.QBO_REDIRECT_URI
        self.environment = (self.settings.QBO_ENVIRONMENT or "sandbox").lower()
        self.api_base_url = (
            self.PROD_BASE_URL if self.environment == "production" else self.SANDBOX_BASE_URL
        )

    def _load_stored_tokens(self) -> Dict[str, Any]:
        """Load stored tokens from disk or environment."""
        tokens = {
            "access_token": self.settings.QBO_ACCESS_TOKEN,
            "refresh_token": self.settings.QBO_REFRESH_TOKEN,
            "realm_id": self.settings.QBO_REALM_ID,
            "expires_at": 0,
        }

        if TOKEN_FILE_PATH.exists():
            try:
                with open(TOKEN_FILE_PATH, "r", encoding="utf-8") as f:
                    file_tokens = json.load(f)
                    tokens.update(file_tokens)
            except Exception as e:
                logger.warning(f"Failed to read QuickBooks token file: {e}")

        return tokens

    def _save_tokens(self, token_data: Dict[str, Any]) -> None:
        """Persist tokens to local file."""
        try:
            current = self._load_stored_tokens()
            current.update(token_data)
            with open(TOKEN_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(current, f, indent=2)
            logger.info("QuickBooks tokens saved successfully.")
        except Exception as e:
            logger.error(f"Failed to save QuickBooks tokens: {e}")

    def clear_tokens(self) -> None:
        """Clear saved tokens (disconnect)."""
        try:
            if TOKEN_FILE_PATH.exists():
                TOKEN_FILE_PATH.unlink()
            logger.info("QuickBooks tokens cleared.")
        except Exception as e:
            logger.error(f"Failed to delete token file: {e}")

    def get_authorization_url(self, state: str = "walcano_qbo_state") -> str:
        """Generate Intuit OAuth 2.0 authorization URL."""
        if not self.client_id:
            raise ValueError("QuickBooks Client ID is not configured.")

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "scope": "com.intuit.quickbooks.accounting",
            "redirect_uri": self.redirect_uri,
            "state": state,
        }
        query_string = urllib.parse.urlencode(params)
        return f"{self.AUTH_URL}?{query_string}"

    async def exchange_code_for_tokens(self, code: str, realm_id: str) -> Dict[str, Any]:
        """Exchange authorization code for OAuth 2.0 access & refresh tokens."""
        if not self.client_id or not self.client_secret:
            raise ValueError("QuickBooks Client ID or Client Secret not configured.")

        auth = (self.client_id, self.client_secret)
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(self.TOKEN_URL, data=data, headers=headers, auth=auth)
            if resp.status_code != 200:
                logger.error(f"QBO Token exchange error: {resp.status_code} - {resp.text}")
                raise ValueError(f"Failed to exchange code for token: {resp.text}")

            result = resp.json()
            expires_in = result.get("expires_in", 3600)
            token_payload = {
                "access_token": result.get("access_token"),
                "refresh_token": result.get("refresh_token"),
                "realm_id": realm_id,
                "expires_at": time.time() + expires_in,
                "token_type": result.get("token_type", "bearer"),
            }
            self._save_tokens(token_payload)
            return token_payload

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh an expired access token using the refresh token."""
        if not self.client_id or not self.client_secret:
            raise ValueError("QuickBooks Client credentials missing.")

        auth = (self.client_id, self.client_secret)
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(self.TOKEN_URL, data=data, headers=headers, auth=auth)
            if resp.status_code != 200:
                logger.error(f"QBO Token refresh error: {resp.status_code} - {resp.text}")
                raise ValueError(f"Failed to refresh access token: {resp.text}")

            result = resp.json()
            expires_in = result.get("expires_in", 3600)
            token_payload = {
                "access_token": result.get("access_token"),
                "refresh_token": result.get("refresh_token") or refresh_token,
                "expires_at": time.time() + expires_in,
            }
            self._save_tokens(token_payload)
            return token_payload

    async def get_valid_access_token(self) -> Optional[tuple[str, str]]:
        """
        Get a valid access token and realm_id.
        Refreshes if token is expired or expires within 180 seconds.
        Returns (access_token, realm_id) or None.
        """
        tokens = self._load_stored_tokens()
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        realm_id = tokens.get("realm_id")
        expires_at = tokens.get("expires_at", 0)

        if not access_token and not refresh_token:
            return None

        if not realm_id:
            return None

        # Check if expired or about to expire
        if expires_at and (time.time() + 180 > expires_at):
            if refresh_token:
                try:
                    logger.info("QuickBooks access token expired/expiring. Refreshing...")
                    refreshed = await self.refresh_access_token(refresh_token)
                    return refreshed["access_token"], realm_id
                except Exception as e:
                    logger.error(f"Failed to refresh QBO access token: {e}")
                    return None
            return None

        return access_token, realm_id

    async def get_connection_status(self) -> Dict[str, Any]:
        """Check QuickBooks Online connection status."""
        tokens = self._load_stored_tokens()
        realm_id = tokens.get("realm_id")
        has_token = bool(tokens.get("access_token") or tokens.get("refresh_token"))

        is_connected = False
        company_name = None

        if has_token and realm_id:
            valid_auth = await self.get_valid_access_token()
            if valid_auth:
                is_connected = True
                access_token, realm = valid_auth
                try:
                    company_name = await self._fetch_company_name(access_token, realm)
                except Exception:
                    company_name = f"QuickBooks Company ({realm})"

        return {
            "connected": is_connected,
            "realm_id": realm_id if is_connected else None,
            "company_name": company_name,
            "environment": self.environment,
            "client_configured": bool(self.client_id and self.client_secret),
        }

    async def _fetch_company_name(self, access_token: str, realm_id: str) -> Optional[str]:
        """Retrieve the QuickBooks company name."""
        url = f"{self.api_base_url}/v3/company/{realm_id}/companyinfo/{realm_id}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("CompanyInfo", {}).get("CompanyName")
        return None

    async def fetch_live_inventory(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
        include_demo: bool = False,
    ) -> Dict[str, Any]:
        """
        Fetch live inventory items directly from QuickBooks Online.
        """
        import datetime

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Check connection
        valid_auth = await self.get_valid_access_token()

        if include_demo:
            demo_items = self._get_demo_inventory()
            filtered = self._filter_items(demo_items, search, category)
            cats = sorted(list({item["category"] for item in demo_items if item["category"]}))
            return {
                "connected": bool(valid_auth),
                "is_demo": True,
                "items": filtered,
                "count": len(filtered),
                "total_count": len(demo_items),
                "categories": cats,
                "source": "demo_preview",
                "last_synced": now_iso,
                "message": "Showing demo tile inventory preview.",
            }

        if not valid_auth:
            return {
                "connected": False,
                "is_demo": False,
                "items": [],
                "count": 0,
                "total_count": 0,
                "categories": [],
                "source": "quickbooks_online",
                "last_synced": now_iso,
                "message": "QuickBooks Online is not connected. Connect your QuickBooks account to view live inventory.",
            }

        access_token, realm_id = valid_auth

        # Query QuickBooks Online for items
        query = "select * from Item maxresults 1000"
        url = f"{self.api_base_url}/v3/company/{realm_id}/query"
        params = {"query": query}
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code != 200:
                    logger.error(f"QuickBooks API query failed: {resp.status_code} - {resp.text}")
                    return {
                        "connected": True,
                        "is_demo": False,
                        "items": [],
                        "count": 0,
                        "total_count": 0,
                        "categories": [],
                        "source": "quickbooks_online",
                        "last_synced": now_iso,
                        "error": f"QuickBooks query returned {resp.status_code}: {resp.text}",
                    }

                data = resp.json()
                raw_items = data.get("QueryResponse", {}).get("Item", [])

                # Build category lookup for Category items
                category_lookup: Dict[str, str] = {}
                for it in raw_items:
                    if it.get("Type") == "Category":
                        category_lookup[str(it.get("Id"))] = it.get("Name", "Uncategorized")

                parsed_items: List[Dict[str, Any]] = []
                for it in raw_items:
                    # Skip pure Category items in inventory list
                    if it.get("Type") == "Category":
                        continue

                    # Extract Category
                    cat_name = "General"
                    parent_ref = it.get("ParentRef")
                    if parent_ref:
                        if isinstance(parent_ref, dict):
                            cat_name = parent_ref.get("name") or category_lookup.get(
                                str(parent_ref.get("value")), "General"
                            )
                        else:
                            cat_name = category_lookup.get(str(parent_ref), "General")
                    elif it.get("ItemCategoryType"):
                        cat_name = it.get("ItemCategoryType")

                    # Extract SKU, Name, Quantity
                    name = it.get("Name", "Unnamed Product")
                    sku = it.get("Sku") or name
                    qty = float(it.get("QtyOnHand", 0.0) or 0.0)
                    item_type = it.get("Type", "Inventory")
                    active = it.get("Active", True)

                    # Enrich with Surfaces Tiles product mapping from reference PDF
                    mapping = match_product_mapping(name, sku)

                    parsed_items.append({
                        "id": str(it.get("Id")),
                        "name": name,
                        "walcano_name": mapping.get("walcano_name") or name,
                        "surfaces_name": mapping.get("surfaces_name"),
                        "surfaces_variants": mapping.get("surfaces_variants", []),
                        "is_mapped": mapping.get("is_mapped", False),
                        "mapping_note": mapping.get("mapping_note"),
                        "sku": sku,
                        "qty_on_hand": qty,
                        "category": cat_name,
                        "type": item_type,
                        "active": active,
                    })

                all_categories = sorted(list({it["category"] for it in parsed_items if it["category"]}))
                filtered = self._filter_items(parsed_items, search, category)

                return {
                    "connected": True,
                    "is_demo": False,
                    "items": filtered,
                    "count": len(filtered),
                    "total_count": len(parsed_items),
                    "categories": all_categories,
                    "source": "quickbooks_online",
                    "last_synced": now_iso,
                }

        except Exception as e:
            logger.exception(f"Error fetching live inventory from QuickBooks: {e}")
            return {
                "connected": True,
                "is_demo": False,
                "items": [],
                "count": 0,
                "total_count": 0,
                "categories": [],
                "source": "quickbooks_online",
                "last_synced": now_iso,
                "error": str(e),
            }

    def _filter_items(
        self,
        items: List[Dict[str, Any]],
        search: Optional[str] = None,
        category: Optional[str] = None,
        mapping_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Filter items by search string, category, and mapping status."""
        filtered = items
        if category and category.lower() != "all":
            filtered = [i for i in filtered if i.get("category", "").lower() == category.lower()]

        if mapping_filter:
            mf = mapping_filter.lower().strip()
            if mf == "mapped":
                filtered = [i for i in filtered if i.get("is_mapped") is True]
            elif mf == "unmapped":
                filtered = [i for i in filtered if not i.get("is_mapped")]

        if search:
            q = search.lower().strip()
            filtered = [
                i
                for i in filtered
                if q in i.get("name", "").lower()
                or q in i.get("walcano_name", "").lower()
                or q in (i.get("surfaces_name") or "").lower()
                or any(q in v.lower() for v in i.get("surfaces_variants", []))
                or q in i.get("sku", "").lower()
                or q in i.get("category", "").lower()
            ]

        return filtered

    def _get_demo_inventory(self) -> List[Dict[str, Any]]:
        """Demo tile inventory items for explicit development preview mode."""
        raw_demo = [
            {
                "id": "qbo-201",
                "name": "Stoneage Darkgrey 30x60 Feature Tile",
                "sku": "WAL-STN-3060",
                "qty_on_hand": 140.0,
                "category": "Wall Ceramics",
                "type": "Inventory",
                "active": True,
            },
            {
                "id": "qbo-202",
                "name": "Eternal Satuario 60x120 Polished Porcelain",
                "sku": "WAL-SAT-60120",
                "qty_on_hand": 85.0,
                "category": "Porcelain Tiles",
                "type": "Inventory",
                "active": True,
            },
            {
                "id": "qbo-203",
                "name": "Spectra Brown Endless 60x60 Polished",
                "sku": "WAL-SPB-6060",
                "qty_on_hand": 62.0,
                "category": "Porcelain Tiles",
                "type": "Inventory",
                "active": True,
            },
            {
                "id": "qbo-204",
                "name": "Splendor Gold 60x120 Matt Porcelain",
                "sku": "WAL-SPL-60120",
                "qty_on_hand": 44.0,
                "category": "Porcelain Tiles",
                "type": "Inventory",
                "active": True,
            },
            {
                "id": "qbo-205",
                "name": "Alfresco Wood 60x90cm 2cm Paver",
                "sku": "WAL-ALF-6090",
                "qty_on_hand": 190.0,
                "category": "Outdoor Pavers",
                "type": "Inventory",
                "active": True,
            },
            {
                "id": "qbo-206",
                "name": "Burnt Charcoal 60x120 Glossy Tile",
                "sku": "WAL-BUR-60120",
                "qty_on_hand": 28.0,
                "category": "Glass Tiles",
                "type": "Inventory",
                "active": True,
            },
            {
                "id": "qbo-207",
                "name": "Brooks Grey 100x100 Matt Porcelain",
                "sku": "WAL-BRK-100100",
                "qty_on_hand": 16.0,
                "category": "Porcelain Tiles",
                "type": "Inventory",
                "active": True,
            },
            {
                "id": "qbo-208",
                "name": "Dappled Grey 60x60 Carving Matt",
                "sku": "WAL-DAP-6060",
                "qty_on_hand": 105.0,
                "category": "Porcelain Tiles",
                "type": "Inventory",
                "active": True,
            },
            {
                "id": "qbo-209",
                "name": "Carrara White Polished Porcelain 600x1200",
                "sku": "WAL-CAR-60120",
                "qty_on_hand": 245.0,
                "category": "Porcelain Tiles",
                "type": "Inventory",
                "active": True,
            },
            {
                "id": "qbo-210",
                "name": "Calacatta Gold Bookmatch 800x1600",
                "sku": "WAL-CAL-80160",
                "qty_on_hand": 132.0,
                "category": "Porcelain Slabs",
                "type": "Inventory",
                "active": True,
            },
            {
                "id": "qbo-211",
                "name": "Concrete Installation & Polishing",
                "sku": "SRV-CONC-01",
                "qty_on_hand": 0.0,
                "category": "Services",
                "type": "Service",
                "active": True,
            },
        ]

        # Enrich demo items with mapping
        enriched_demo = []
        for it in raw_demo:
            mapping = match_product_mapping(it["name"], it.get("sku"))
            enriched_demo.append({
                **it,
                "walcano_name": mapping.get("walcano_name") or it["name"],
                "surfaces_name": mapping.get("surfaces_name"),
                "surfaces_variants": mapping.get("surfaces_variants", []),
                "is_mapped": mapping.get("is_mapped", False),
                "mapping_note": mapping.get("mapping_note"),
            })
        return enriched_demo
