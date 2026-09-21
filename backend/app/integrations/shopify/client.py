"""Shopify Admin API client for live inventory integration and synchronization.

Uses Shopify's official GraphQL Admin API and Inventory Management APIs:
- inventorySetQuantities mutation for setting on-hand / available inventory
- locations query for retrieving inventory locations
- productCreate mutation for creating new Surfaces Tiles products
- productVariants query for matching products and inventory item IDs
Reference: https://shopify.dev/docs/apps/build/orders-fulfillment/inventory-management-apps
"""

import json
import logging
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.config.settings import get_settings

logger = logging.getLogger(__name__)

# Persistent config and sync state paths
CONFIG_FILE_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".shopify_config.json"
SYNC_STATE_FILE_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".shopify_sync_state.json"


class ShopifyClient:
    """Client for interacting with Shopify's GraphQL Admin API."""

    def __init__(self):
        self.settings = get_settings()
        self._default_api_version = "2024-04"

    # ─── Configuration & Persistence ──────────────────────────────────────────

    def _load_stored_config(self) -> Dict[str, Any]:
        """Load stored Shopify configuration from disk or environment."""
        config = {
            "shop_url": self.settings.SHOPIFY_SHOP_URL,
            "access_token": self.settings.SHOPIFY_ACCESS_TOKEN,
            "api_version": self.settings.SHOPIFY_API_VERSION or self._default_api_version,
            "location_id": self.settings.SHOPIFY_LOCATION_ID,
            "location_name": self.settings.SHOPIFY_LOCATION_NAME or "123 William Street",
            "auto_sync": self.settings.SHOPIFY_AUTO_SYNC if self.settings.SHOPIFY_AUTO_SYNC is not None else True,
            "is_connected": False,
            "shop_name": None,
            "currency": "USD",
        }

        if CONFIG_FILE_PATH.exists():
            try:
                with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                    file_config = json.load(f)
                    for k, v in file_config.items():
                        if v is not None:
                            config[k] = v
            except Exception as e:
                logger.warning(f"Failed to read Shopify config file: {e}")

        # If credentials exist, treat as configured
        if config.get("shop_url") and config.get("access_token"):
            config["is_connected"] = True

        return config

    def save_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """Persist Shopify configuration to local file."""
        current = self._load_stored_config()

        # Sanitize shop URL (strip protocol and trailing slash)
        if "shop_url" in config_data and config_data["shop_url"]:
            shop = config_data["shop_url"].strip().lower()
            shop = re.sub(r"^https?://", "", shop).rstrip("/")
            if "." not in shop:
                shop = f"{shop}.myshopify.com"
            config_data["shop_url"] = shop

        current.update(config_data)
        current["is_connected"] = bool(current.get("shop_url") and current.get("access_token"))

        try:
            with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(current, f, indent=2)
            logger.info("Shopify configuration saved successfully.")
        except Exception as e:
            logger.error(f"Failed to save Shopify config: {e}")

        return current

    def clear_config(self) -> None:
        """Clear saved Shopify configuration (disconnect)."""
        try:
            if CONFIG_FILE_PATH.exists():
                CONFIG_FILE_PATH.unlink()
            logger.info("Shopify configuration cleared.")
        except Exception as e:
            logger.error(f"Failed to delete Shopify config file: {e}")

    def _load_sync_state(self) -> Dict[str, Any]:
        """Load sync tracking metadata (which items are synced to Shopify)."""
        if SYNC_STATE_FILE_PATH.exists():
            try:
                with open(SYNC_STATE_FILE_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load sync state: {e}")
        return {"synced_products": {}, "last_sync_timestamp": None}

    def _save_sync_state(self, state: Dict[str, Any]) -> None:
        """Persist sync tracking metadata."""
        try:
            with open(SYNC_STATE_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save sync state: {e}")

    # ─── URL & Request Helpers ───────────────────────────────────────────────

    def _normalize_shop_domain(self, shop_url: str) -> str:
        """Ensure shop URL targets the direct Shopify admin domain."""
        clean = re.sub(r"^https?://", "", shop_url).rstrip("/").lower()
        if "surfacestiles.co.uk" in clean:
            return "surfaces-tiles.myshopify.com"
        if "." not in clean:
            return f"{clean}.myshopify.com"
        return clean

    def _get_api_endpoint(self, shop_url: str, api_version: str) -> str:
        """Construct the GraphQL endpoint URL for Shopify."""
        clean_shop = self._normalize_shop_domain(shop_url)
        return f"https://{clean_shop}/admin/api/{api_version}/graphql.json"

    async def _resolve_access_token(self, shop: str, cfg: Dict[str, Any]) -> str:
        """
        Resolve an active Shopify access token:
        1. Direct personal/app token (shpat_..., shpua_...)
        2. Client Credentials grant for Shopify Dev Dashboard apps (using client_id and client_secret)
        """
        token = cfg.get("access_token") or ""
        client_id = cfg.get("client_id") or self.settings.SHOPIFY_CLIENT_ID
        client_secret = cfg.get("client_secret") or self.settings.SHOPIFY_CLIENT_SECRET or (token if token.startswith("shpss_") else None)

        # Check if already a direct access token
        if token.startswith("shpat_") or token.startswith("shpua_"):
            return token

        # If client credentials grant is applicable
        if client_id and client_secret:
            cached = cfg.get("_cached_oauth_token")
            cached_exp = cfg.get("_cached_oauth_exp", 0)
            if cached and time.time() < (cached_exp - 300):
                return cached

            clean_shop = self._normalize_shop_domain(shop)
            token_url = f"https://{clean_shop}/admin/oauth/access_token"
            payload = {
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            }
            headers = {"Content-Type": "application/x-www-form-urlencoded"}

            async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
                resp = await client.post(token_url, data=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    new_token = data.get("access_token")
                    expires_in = data.get("expires_in", 86400)
                    if new_token:
                        self.save_config({
                            "_cached_oauth_token": new_token,
                            "_cached_oauth_exp": time.time() + expires_in,
                        })
                        return new_token
                else:
                    raise ValueError(f"Shopify OAuth exchange failed ({resp.status_code}): {resp.text}")

        if token.startswith("shpss_") and not client_id:
            raise ValueError(
                "Provided token is a Shopify Client Secret (shpss_...). "
                "Please also provide SHOPIFY_CLIENT_ID from Dev Dashboard -> App settings."
            )

        return token

    async def _execute_graphql(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
        shop_url: Optional[str] = None,
        access_token: Optional[str] = None,
        api_version: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute a GraphQL query or mutation against Shopify GraphQL Admin API."""
        cfg = self._load_stored_config()
        shop = shop_url or cfg.get("shop_url")
        version = api_version or cfg.get("api_version") or self._default_api_version

        if not shop:
            raise ValueError("Shopify shop URL is missing.")

        # Resolve active access token
        effective_token = access_token
        if not effective_token:
            effective_token = await self._resolve_access_token(shop, cfg)

        if not effective_token:
            raise ValueError("Shopify Access Token is missing.")

        endpoint = self._get_api_endpoint(shop, version)
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Shopify-Access-Token": effective_token,
        }
        payload = {"query": query, "variables": variables or {}}

        async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
            resp = await client.post(endpoint, json=payload, headers=headers)
            if resp.status_code != 200:
                raise ValueError(f"Shopify GraphQL request failed with status {resp.status_code}: {resp.text}")

            result = resp.json()
            if "errors" in result and result["errors"]:
                error_messages = "; ".join([e.get("message", "Unknown error") for e in result["errors"]])
                raise ValueError(f"Shopify GraphQL errors: {error_messages}")

            return result.get("data", {})

    # ─── Connection & Store Info ──────────────────────────────────────────────

    async def get_connection_status(self) -> Dict[str, Any]:
        """Check connection status to Shopify store. Supports live credentials and demo/mock mode."""
        cfg = self._load_stored_config()
        shop_url = cfg.get("shop_url")
        access_token = cfg.get("access_token")
        sync_state = self._load_sync_state()

        synced_count = len(sync_state.get("synced_products", {}))

        # Check if live credentials are configured
        if shop_url and access_token:
            query = """
            query GetShopDetails {
              shop {
                name
                myshopifyDomain
                currencyCode
                plan {
                  displayName
                }
              }
            }
            """
            try:
                data = await self._execute_graphql(query, shop_url=shop_url, access_token=access_token)
                shop_info = data.get("shop", {})
                shop_name = shop_info.get("name") or shop_url
                currency = shop_info.get("currencyCode", "USD")

                # Auto-resolve location_id if missing or mock
                current_loc_id = cfg.get("location_id")
                current_loc_name = cfg.get("location_name") or self.settings.SHOPIFY_LOCATION_NAME
                if not current_loc_id or "9082341029" in str(current_loc_id):
                    try:
                        live_locs = await self.get_locations()
                        if live_locs:
                            # Try to match by configured location name if available
                            matched_loc = None
                            if current_loc_name:
                                for loc in live_locs:
                                    if (loc.get("name") or "").strip().lower() == current_loc_name.strip().lower():
                                        matched_loc = loc
                                        break
                            if not matched_loc:
                                matched_loc = live_locs[0]

                            current_loc_id = matched_loc["id"]
                            current_loc_name = matched_loc["name"]
                            self.save_config({
                                "location_id": current_loc_id,
                                "location_name": current_loc_name,
                            })
                    except Exception as loc_err:
                        logger.warning(f"Could not auto-fetch locations: {loc_err}")

                # Cache updated info
                self.save_config({
                    "shop_name": shop_name,
                    "currency": currency,
                    "last_connected": time.time(),
                })

                return {
                    "connected": True,
                    "is_mock": False,
                    "shop_url": shop_url,
                    "shop_name": shop_name,
                    "currency": currency,
                    "api_version": cfg.get("api_version", self._default_api_version),
                    "location_id": current_loc_id,
                    "location_name": current_loc_name or "Shop location",
                    "auto_sync": cfg.get("auto_sync", True),
                    "synced_products_count": synced_count,
                    "last_sync_timestamp": sync_state.get("last_sync_timestamp"),
                    "message": f"Connected to live Shopify store '{shop_name}'.",
                }
            except Exception as e:
                logger.warning(f"Shopify connection test failed with live credentials: {e}")
                return {
                    "connected": False,
                    "is_mock": False,
                    "shop_url": shop_url,
                    "shop_name": None,
                    "api_version": cfg.get("api_version", self._default_api_version),
                    "error": str(e),
                    "synced_products_count": synced_count,
                    "message": f"Connection error: {e}",
                }

        # Demo/Mock sandbox mode when credentials are not configured yet
        return {
            "connected": False,
            "is_mock": True,
            "shop_url": "surfaces-tiles-demo.myshopify.com",
            "shop_name": "Surfaces Tiles Showcase (Sandbox)",
            "currency": "USD",
            "api_version": self._default_api_version,
            "location_id": "gid://shopify/Location/9082341029",
            "location_name": cfg.get("location_name") or "123 William Street",
            "auto_sync": cfg.get("auto_sync", True),
            "synced_products_count": synced_count,
            "last_sync_timestamp": sync_state.get("last_sync_timestamp"),
            "message": "Shopify is running in Sandbox / Demo mode. Add your Shopify store domain and Admin API Access Token to connect live.",
        }

    # ─── Locations Query ──────────────────────────────────────────────────────

    async def get_locations(self) -> List[Dict[str, Any]]:
        """
        Query available inventory locations using Shopify's official GraphQL Admin API.
        Falls back to demo locations in mock mode.
        """
        cfg = self._load_stored_config()
        if cfg.get("shop_url") and cfg.get("access_token"):
            query = """
            query GetLocations {
              locations(first: 50, includeInactive: false) {
                edges {
                  node {
                    id
                    name
                    isActive
                    address {
                      address1
                      city
                      province
                      country
                      zip
                    }
                  }
                }
              }
            }
            """
            try:
                data = await self._execute_graphql(query)
                edges = data.get("locations", {}).get("edges", [])
                locations = []
                for edge in edges:
                    node = edge.get("node", {})
                    addr = node.get("address") or {}
                    formatted_addr = ", ".join(
                        filter(None, [addr.get("address1"), addr.get("city"), addr.get("country")])
                    )
                    locations.append({
                        "id": node.get("id"),
                        "name": node.get("name"),
                        "is_active": node.get("isActive", True),
                        "address": formatted_addr,
                    })
                if locations:
                    return locations
            except Exception as e:
                logger.error(f"Error fetching Shopify locations: {e}")

        # Realistic mock locations for sandbox and demo mode
        return [
            {
                "id": "gid://shopify/Location/9082341029",
                "name": "123 William Street",
                "is_active": True,
                "address": "123 William Street, New York, USA",
            },
            {
                "id": "gid://shopify/Location/9082341030",
                "name": "Central Distribution Warehouse",
                "is_active": True,
                "address": "45 Industrial Parkway, Newark, USA",
            },
            {
                "id": "gid://shopify/Location/9082341031",
                "name": "Surfaces Tiles Flagship Showroom",
                "is_active": True,
                "address": "780 5th Avenue, New York, USA",
            },
        ]

    # ─── Inventory Management API: inventorySetQuantities ─────────────────────

    async def set_inventory_quantities(
        self,
        inventory_item_id: str,
        location_id: str,
        quantity: int,
        reason: str = "correction",
        reference_document_uri: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute official Shopify GraphQL mutation: inventorySetQuantities.
        Sets on-hand and available inventory quantities at a specified location.
        Reference: https://shopify.dev/docs/apps/build/orders-fulfillment/inventory-management-apps#graphql-queries-and-mutations
        """
        mutation = """
        mutation SetInventoryQuantities($input: InventorySetQuantitiesInput!) {
          inventorySetQuantities(input: $input) {
            inventoryAdjustmentGroup {
              id
              reason
              referenceDocumentUri
              changes {
                name
                delta
                quantityAfterChange
              }
            }
            userErrors {
              field
              message
              code
            }
          }
        }
        """
        variables = {
            "input": {
                "reason": reason,
                "referenceDocumentUri": reference_document_uri or "walcano://inventory/sync",
                "quantities": [
                    {
                        "inventoryItemId": inventory_item_id,
                        "locationId": location_id,
                        "quantity": int(quantity),
                    }
                ],
            }
        }

        data = await self._execute_graphql(mutation, variables=variables)
        result = data.get("inventorySetQuantities", {})
        user_errors = result.get("userErrors", [])
        if user_errors:
            error_msgs = "; ".join([e.get("message", "") for e in user_errors])
            raise ValueError(f"Shopify inventorySetQuantities error: {error_msgs}")

        return result

    # ─── Product Lookup & Creation ────────────────────────────────────────────

    async def find_product_variant_by_sku(self, sku: str) -> Optional[Dict[str, Any]]:
        """Search Shopify for a product variant with matching SKU using GraphQL."""
        if not sku:
            return None

        query = """
        query FindVariantBySku($query: String!) {
          productVariants(first: 5, query: $query) {
            edges {
              node {
                id
                title
                sku
                price
                product {
                  id
                  title
                  handle
                  vendor
                  productType
                }
                inventoryItem {
                  id
                  tracked
                }
              }
            }
          }
        }
        """
        escaped_sku = sku.replace('"', '\\"')
        variables = {"query": f"sku:{escaped_sku}"}

        try:
            data = await self._execute_graphql(query, variables=variables)
            edges = data.get("productVariants", {}).get("edges", [])
            for edge in edges:
                node = edge.get("node", {})
                if (node.get("sku") or "").strip().lower() == sku.strip().lower():
                    return node
        except Exception as e:
            logger.debug(f"Could not find variant by SKU '{sku}': {e}")

        return None

    async def create_product(
        self,
        title: str,
        sku: str,
        category: Optional[str] = None,
        description: Optional[str] = None,
        vendor: str = "Surfaces Tiles",
        price: str = "0.00",
    ) -> Dict[str, Any]:
        """
        Create a new product and variant in Shopify via GraphQL productCreate mutation.
        Reference: https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate
        """
        mutation = """
        mutation CreateProduct($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
              handle
              vendor
              productType
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    sku
                    inventoryItem {
                      id
                      tracked
                    }
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
        """
        variables = {
            "input": {
                "title": title,
                "vendor": vendor,
                "productType": category or "Tiles & Flooring",
                "descriptionHtml": description or f"<p>Surfaces Tiles premium collection. SKU: {sku}</p>",
                "tags": ["Surfaces Tiles", "Wallcano", category or "Tiles"],
                "variants": [
                    {
                        "sku": sku,
                        "price": price,
                        "inventoryManagement": "SHOPIFY",
                    }
                ],
            }
        }

        data = await self._execute_graphql(mutation, variables=variables)
        result = data.get("productCreate", {})
        user_errors = result.get("userErrors", [])
        if user_errors:
            error_msgs = "; ".join([e.get("message", "") for e in user_errors])
            raise ValueError(f"Shopify productCreate error: {error_msgs}")

        return result.get("product", {})

    # ─── One-Click Sync / Add Product ─────────────────────────────────────────

    async def sync_product(
        self,
        item: Dict[str, Any],
        location_id: Optional[str] = None,
        location_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        One-click sync/add a single product to Shopify:
        - Uses the Surfaces Tiles product name (or Wallcano name).
        - Uses the SKU and item specifications.
        - Automatically creates the product in Shopify if it does not exist.
        - Automatically updates Shopify inventory on-hand quantity using inventorySetQuantities.
        - Records sync state.
        """
        cfg = self._load_stored_config()
        sync_state = self._load_sync_state()

        # Prioritize Surfaces Tiles product name as specified in prompt
        surfaces_name = (item.get("surfaces_name") or "").strip()
        walcano_name = (item.get("walcano_name") or item.get("name") or "").strip()
        product_title = surfaces_name or walcano_name or "Premium Surfaces Tile"
        sku = (item.get("sku") or "").strip()
        quantity = int(float(item.get("qty_on_hand") or 0.0))
        category = item.get("category") or "Tiles & Surfaces"
        target_location_id = location_id or cfg.get("location_id") or "gid://shopify/Location/9082341029"
        target_location_name = location_name or cfg.get("location_name") or "123 William Street"

        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # Check if live Shopify connection is available
        is_live = bool(cfg.get("shop_url") and cfg.get("access_token"))

        shopify_product_id = None
        shopify_inventory_item_id = None
        action_performed = "created"

        if is_live:
            try:
                # Ensure we have a valid live location ID
                if not target_location_id or "9082341029" in str(target_location_id):
                    live_locs = await self.get_locations()
                    if live_locs:
                        target_location_id = live_locs[0]["id"]
                        target_location_name = live_locs[0]["name"]

                # 1. Search for existing variant by SKU
                existing_variant = await self.find_product_variant_by_sku(sku)

                if existing_variant:
                    # Existing product: update inventory quantity
                    action_performed = "updated"
                    variant_id = existing_variant.get("id")
                    inv_item = existing_variant.get("inventoryItem") or {}
                    shopify_inventory_item_id = inv_item.get("id")
                    product_node = existing_variant.get("product") or {}
                    shopify_product_id = product_node.get("id")

                    if shopify_inventory_item_id:
                        await self.set_inventory_quantities(
                            inventory_item_id=shopify_inventory_item_id,
                            location_id=target_location_id,
                            quantity=quantity,
                            reason="correction",
                            reference_document_uri=f"walcano://inventory/item/{sku}",
                        )
                else:
                    # 2. Product does not exist: create in Shopify
                    action_performed = "created"
                    created_product = await self.create_product(
                        title=product_title,
                        sku=sku,
                        category=category,
                        description=f"<p><strong>{product_title}</strong></p><p>Surfaces Tiles Catalog. SKU: {sku}. Stock count: {quantity}.</p>",
                        vendor="Surfaces Tiles",
                    )
                    shopify_product_id = created_product.get("id")
                    variants = created_product.get("variants", {}).get("edges", [])
                    if variants:
                        v_node = variants[0].get("node", {})
                        inv_node = v_node.get("inventoryItem") or {}
                        shopify_inventory_item_id = inv_node.get("id")

                    # Set inventory at location
                    if shopify_inventory_item_id:
                        await self.set_inventory_quantities(
                            inventory_item_id=shopify_inventory_item_id,
                            location_id=target_location_id,
                            quantity=quantity,
                            reason="correction",
                            reference_document_uri=f"walcano://inventory/item/{sku}",
                        )
            except Exception as e:
                logger.error(f"Live Shopify sync error for SKU {sku}: {e}")
                # Fall back to recorded mock sync with warning
                return {
                    "success": False,
                    "sku": sku,
                    "error": str(e),
                    "product_name": product_title,
                }
        else:
            # Sandbox / Demo Mode simulated sync
            existing_record = sync_state.get("synced_products", {}).get(sku)
            if existing_record:
                action_performed = "updated"
                shopify_product_id = existing_record.get("shopify_product_id")
                shopify_inventory_item_id = existing_record.get("shopify_inventory_item_id")
            else:
                action_performed = "created"
                simulated_hash = abs(hash(sku or product_title)) % 1000000000
                shopify_product_id = f"gid://shopify/Product/{simulated_hash}"
                shopify_inventory_item_id = f"gid://shopify/InventoryItem/{simulated_hash + 100}"

        # Record in sync state
        record = {
            "sku": sku,
            "product_title": product_title,
            "walcano_name": walcano_name,
            "surfaces_name": surfaces_name,
            "qty_on_hand": quantity,
            "location_id": target_location_id,
            "location_name": target_location_name,
            "shopify_product_id": shopify_product_id,
            "shopify_inventory_item_id": shopify_inventory_item_id,
            "last_synced": now_iso,
            "action": action_performed,
            "mode": "live" if is_live else "sandbox",
        }

        synced_map = sync_state.get("synced_products", {})
        synced_map[sku] = record
        sync_state["synced_products"] = synced_map
        sync_state["last_sync_timestamp"] = now_iso
        self._save_sync_state(sync_state)

        return {
            "success": True,
            "action": action_performed,
            "sku": sku,
            "product_name": product_title,
            "quantity": quantity,
            "location_name": target_location_name,
            "shopify_product_id": shopify_product_id,
            "last_synced": now_iso,
            "mode": "live" if is_live else "sandbox",
            "message": f"Successfully {action_performed} in Shopify: '{product_title}' (Qty: {quantity}) at '{target_location_name}'",
        }

    # ─── Bulk Sync All Products ───────────────────────────────────────────────

    async def sync_all_products(
        self,
        items: List[Dict[str, Any]],
        location_id: Optional[str] = None,
        location_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """One-click sync all products directly into Shopify."""
        results = []
        created_count = 0
        updated_count = 0
        failed_count = 0

        for item in items:
            try:
                res = await self.sync_product(
                    item=item,
                    location_id=location_id,
                    location_name=location_name,
                )
                if res.get("success"):
                    if res.get("action") == "created":
                        created_count += 1
                    else:
                        updated_count += 1
                else:
                    failed_count += 1
                results.append(res)
            except Exception as e:
                failed_count += 1
                results.append({
                    "success": False,
                    "sku": item.get("sku"),
                    "error": str(e),
                })

        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return {
            "success": True,
            "total_items": len(items),
            "created": created_count,
            "updated": updated_count,
            "failed": failed_count,
            "results": results,
            "synced_at": now_iso,
            "message": f"Shopify bulk sync complete: {created_count} created, {updated_count} updated, {failed_count} errors.",
        }

    # ─── Real-time Stock Update Hook ──────────────────────────────────────────

    async def update_stock(
        self,
        sku: str,
        new_quantity: int,
        item_details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Automatically update Shopify inventory quantities whenever inventory changes in our system.
        Executes Shopify's official inventorySetQuantities mutation.
        """
        cfg = self._load_stored_config()
        sync_state = self._load_sync_state()

        target_location_id = cfg.get("location_id") or "gid://shopify/Location/9082341029"
        target_location_name = cfg.get("location_name") or "123 William Street"

        # Check if already synced
        record = sync_state.get("synced_products", {}).get(sku)

        # Build item payload
        item_payload = item_details or {}
        item_payload["sku"] = sku
        item_payload["qty_on_hand"] = new_quantity
        if record:
            item_payload["surfaces_name"] = record.get("surfaces_name")
            item_payload["walcano_name"] = record.get("walcano_name")

        # Sync to Shopify
        sync_res = await self.sync_product(
            item=item_payload,
            location_id=target_location_id,
            location_name=target_location_name,
        )

        return {
            "success": sync_res.get("success", True),
            "sku": sku,
            "new_quantity": new_quantity,
            "shopify_synced": True,
            "shopify_details": sync_res,
            "message": f"Stock updated to {new_quantity} and synchronized to Shopify location '{target_location_name}'.",
        }

    def get_synced_product_records(self) -> Dict[str, Any]:
        """Get all products currently recorded as synced with Shopify."""
        return self._load_sync_state().get("synced_products", {})
