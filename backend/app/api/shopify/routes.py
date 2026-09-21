"""FastAPI router for Shopify Inventory Management API integration."""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.integrations.shopify.client import ShopifyClient
from app.integrations.quickbooks.client import QuickBooksClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shopify", tags=["Shopify Live Integration"])
shopify_client = ShopifyClient()
qbo_client = QuickBooksClient()


# ─── Pydantic Request & Response Models ──────────────────────────────────────

class ShopifyConnectRequest(BaseModel):
    shop_url: str = Field(..., description="Shopify store domain (e.g. store.myshopify.com)")
    access_token: str = Field(..., description="Shopify Admin API Access Token (shpat_...)")
    api_version: Optional[str] = Field("2024-04", description="Shopify GraphQL API version")
    location_id: Optional[str] = Field(None, description="Shopify location GID")
    location_name: Optional[str] = Field("123 William Street", description="Shopify location name")
    auto_sync: Optional[bool] = Field(True, description="Automatically sync stock and new products")


class ShopifySetLocationRequest(BaseModel):
    location_id: str = Field(..., description="Shopify location GID")
    location_name: str = Field(..., description="Shopify location display name")


class ShopifySyncProductRequest(BaseModel):
    sku: str = Field(..., description="Item SKU")
    name: Optional[str] = Field(None, description="Wallcano or general product name")
    walcano_name: Optional[str] = Field(None, description="Wallcano tile product name")
    surfaces_name: Optional[str] = Field(None, description="Surfaces Tiles mapped product name")
    category: Optional[str] = Field("Tiles & Surfaces", description="Product category")
    qty_on_hand: Optional[float] = Field(0.0, description="Quantity on hand")
    location_id: Optional[str] = Field(None, description="Target Shopify location ID")
    location_name: Optional[str] = Field(None, description="Target Shopify location name")


class ShopifySyncAllRequest(BaseModel):
    items: Optional[List[Dict[str, Any]]] = Field(None, description="Optional items list to sync")
    location_id: Optional[str] = Field(None, description="Target Shopify location ID")
    location_name: Optional[str] = Field(None, description="Target Shopify location name")
    demo: Optional[bool] = Field(False, description="Sync demo inventory items")


class ShopifyUpdateStockRequest(BaseModel):
    sku: str = Field(..., description="Item SKU to adjust")
    new_quantity: int = Field(..., description="New on-hand quantity count")
    item_details: Optional[Dict[str, Any]] = Field(None, description="Additional item details")


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/status")
async def get_shopify_status():
    """
    Check connection status to Shopify store.
    Returns store name, domain, selected location, sync count, and auto_sync status.
    """
    try:
        status_info = await shopify_client.get_connection_status()
        return status_info
    except Exception as e:
        logger.error(f"Error checking Shopify status: {e}")
        return {
            "connected": False,
            "error": str(e),
            "message": "Failed to connect to Shopify.",
        }


@router.post("/connect")
async def connect_shopify(req: ShopifyConnectRequest):
    """
    Save Shopify credentials and verify connection with Shopify GraphQL Admin API.
    """
    try:
        # Persist configuration
        shopify_client.save_config({
            "shop_url": req.shop_url,
            "access_token": req.access_token,
            "api_version": req.api_version or "2024-04",
            "location_id": req.location_id,
            "location_name": req.location_name or "123 William Street",
            "auto_sync": req.auto_sync if req.auto_sync is not None else True,
        })

        # Test connection immediately
        status_info = await shopify_client.get_connection_status()
        if not status_info.get("connected") and not status_info.get("is_mock"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=status_info.get("error") or "Could not verify credentials with Shopify API.",
            )

        return {
            "success": True,
            "status": status_info,
            "message": f"Successfully connected to Shopify store '{status_info.get('shop_name')}'!",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to connect Shopify: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to establish connection with Shopify: {str(e)}",
        )


@router.post("/disconnect")
async def disconnect_shopify():
    """Disconnect Shopify integration and clear saved store credentials."""
    shopify_client.clear_config()
    return {
        "success": True,
        "connected": False,
        "message": "Shopify integration successfully disconnected.",
    }


@router.get("/locations")
async def get_shopify_locations():
    """
    Fetch all active inventory locations from Shopify using the GraphQL Admin API.
    """
    try:
        locations = await shopify_client.get_locations()
        return {
            "success": True,
            "locations": locations,
            "count": len(locations),
        }
    except Exception as e:
        logger.error(f"Error fetching Shopify locations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve Shopify locations: {str(e)}",
        )


@router.post("/set-location")
async def set_shopify_location(req: ShopifySetLocationRequest):
    """Update primary Shopify inventory location for inventory syncing."""
    try:
        updated = shopify_client.save_config({
            "location_id": req.location_id,
            "location_name": req.location_name,
        })
        return {
            "success": True,
            "location_id": updated.get("location_id"),
            "location_name": updated.get("location_name"),
            "message": f"Primary Shopify location updated to '{req.location_name}'.",
        }
    except Exception as e:
        logger.error(f"Error setting Shopify location: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update location: {str(e)}",
        )


@router.post("/sync-product")
async def sync_single_product(req: ShopifySyncProductRequest):
    """
    One-click sync/add a single product directly into Shopify:
    - Automatically creates the product in Shopify if it does not exist (using Surfaces Tiles name).
    - Sets or updates on-hand quantity at the selected Shopify location using inventorySetQuantities.
    """
    try:
        item_dict = req.model_dump()
        result = await shopify_client.sync_product(
            item=item_dict,
            location_id=req.location_id,
            location_name=req.location_name,
        )
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error") or "Sync failed for product.",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing product {req.sku} to Shopify: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shopify sync error: {str(e)}",
        )


@router.post("/sync-all")
async def sync_all_products(req: ShopifySyncAllRequest):
    """
    One-click sync all products directly between our system and Shopify.
    If no items provided in body, pulls current inventory items automatically.
    """
    try:
        items_to_sync = req.items
        if not items_to_sync:
            inv = await qbo_client.fetch_live_inventory(include_demo=req.demo or True)
            items_to_sync = inv.get("items", [])

        if not items_to_sync:
            return {
                "success": True,
                "total_items": 0,
                "created": 0,
                "updated": 0,
                "failed": 0,
                "message": "No items found to sync.",
            }

        result = await shopify_client.sync_all_products(
            items=items_to_sync,
            location_id=req.location_id,
            location_name=req.location_name,
        )
        return result
    except Exception as e:
        logger.error(f"Error in Shopify bulk sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shopify bulk sync error: {str(e)}",
        )


@router.post("/update-stock")
async def update_inventory_stock(req: ShopifyUpdateStockRequest):
    """
    Adjust on-hand inventory quantity in the inventory system and automatically
    synchronize the change to Shopify's Inventory Management API (inventorySetQuantities).
    """
    try:
        result = await shopify_client.update_stock(
            sku=req.sku,
            new_quantity=req.new_quantity,
            item_details=req.item_details,
        )
        return result
    except Exception as e:
        logger.error(f"Error updating stock for SKU {req.sku}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stock update error: {str(e)}",
        )


@router.get("/products")
async def get_synced_products():
    """Retrieve list of products synced with Shopify and their status."""
    records = shopify_client.get_synced_product_records()
    return {
        "success": True,
        "count": len(records),
        "products": records,
    }
