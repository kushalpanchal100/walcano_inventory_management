"""QuickBooks Online API routes for live inventory and OAuth connection."""

import logging
import io
import csv
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import RedirectResponse, StreamingResponse

from app.config.settings import get_settings
from app.integrations.quickbooks.client import QuickBooksClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quickbooks", tags=["QuickBooks Live Integration"])
settings = get_settings()
qbo_client = QuickBooksClient()


@router.get("/status")
async def get_qbo_status():
    """Check whether the application is connected to QuickBooks Online."""
    try:
        return await qbo_client.get_connection_status()
    except Exception as e:
        logger.error(f"Error checking QBO status: {e}")
        return {
            "connected": False,
            "error": str(e),
            "environment": settings.QBO_ENVIRONMENT,
        }


@router.get("/auth-url")
async def get_auth_url():
    """Generate QuickBooks OAuth 2.0 authorization URL."""
    try:
        url = qbo_client.get_authorization_url()
        return {"auth_url": url}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate QuickBooks authorization URL: {e}",
        )


@router.get("/callback")
async def oauth_callback(
    code: Optional[str] = Query(None),
    realmId: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
):
    """
    Handle QuickBooks OAuth 2.0 callback, exchange code for tokens,
    and redirect back to the frontend inventory dashboard.
    """
    frontend_base = settings.FRONTEND_URL or "http://localhost:3000"
    target_url = f"{frontend_base}/dashboard/inventory"

    if error:
        logger.warning(f"QuickBooks OAuth error returned: {error}")
        return RedirectResponse(url=f"{target_url}?qbo_error={error}")

    if not code or not realmId:
        logger.error("QuickBooks OAuth callback missing code or realmId")
        return RedirectResponse(url=f"{target_url}?qbo_error=missing_credentials")

    try:
        await qbo_client.exchange_code_for_tokens(code=code, realm_id=realmId)
        logger.info(f"Successfully authenticated QuickBooks Online for realmId: {realmId}")
        return RedirectResponse(url=f"{target_url}?qbo_connected=true")
    except Exception as e:
        logger.error(f"Failed to complete QuickBooks token exchange: {e}")
        return RedirectResponse(url=f"{target_url}?qbo_error={str(e)}")


@router.post("/disconnect")
async def disconnect_quickbooks():
    """Disconnect QuickBooks Online integration and revoke saved session tokens."""
    qbo_client.clear_tokens()
    return {"message": "QuickBooks session successfully disconnected.", "connected": False}


@router.get("/inventory")
async def get_live_inventory(
    search: Optional[str] = Query(None, description="Search product name, SKU, or category"),
    category: Optional[str] = Query(None, description="Filter by category"),
    demo: bool = Query(False, description="Explicit development/demo preview mode"),
):
    """
    Fetch live inventory items directly from QuickBooks Online.
    Returns Product Name, SKU, Quantity on Hand, and Category as the single source of truth.
    """
    return await qbo_client.fetch_live_inventory(
        search=search,
        category=category,
        include_demo=demo,
    )


@router.get("/export-csv")
async def export_inventory_csv(
    search: Optional[str] = Query(None, description="Filter exported items by search term"),
    category: Optional[str] = Query(None, description="Filter exported items by category"),
    demo: bool = Query(False, description="Explicit preview mode"),
):
    """
    Export QuickBooks live inventory directly as a downloadable CSV file.
    Includes UTF-8 BOM encoding for full Microsoft Excel and Google Sheets compatibility.
    """
    inv = await qbo_client.fetch_live_inventory(
        search=search,
        category=category,
        include_demo=demo,
    )
    items = inv.get("items", [])

    output = io.StringIO()
    # Write UTF-8 BOM for Excel compatibility
    output.write("\ufeff")
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "Walcano Product Name",
        "Surfaces Product Name",
        "Mapping Status",
        "SKU",
        "Quantity on Hand",
        "Stock Status",
        "Category",
        "Type",
        "QuickBooks ID",
    ])

    for it in items:
        qty = it.get("qty_on_hand", 0.0)
        status_label = "In Stock" if qty > 10 else ("Low Stock" if qty > 0 else "Out of Stock")
        is_mapped = it.get("is_mapped", False)
        surfaces_name = it.get("surfaces_name") or "No Mapping Available"
        mapping_status = "Mapped" if is_mapped else "No Mapping Available"
        walcano_name = it.get("walcano_name") or it.get("name", "")

        writer.writerow([
            walcano_name,
            surfaces_name,
            mapping_status,
            it.get("sku", ""),
            qty,
            status_label,
            it.get("category", "General"),
            it.get("type", "Inventory"),
            it.get("id", ""),
        ])

    today_str = datetime.now().strftime("%Y-%m-%d")
    filename = f"quickbooks_inventory_{today_str}.csv"
    output.seek(0)

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

