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
    location: str = Query("123 William Street", description="Shopify inventory location name"),
    fill_on_hand_new: bool = Query(True, description="Populate 'On hand (new)' with current stock count for direct import"),
):
    """
    Export inventory directly as a downloadable CSV formatted for Shopify import.
    Matches inventory_bin_new_on_hand_template.csv exactly (19 columns).
    Includes UTF-8 BOM encoding for full Microsoft Excel, Google Sheets, and Shopify compatibility.
    """
    import re
    from app.integrations.quickbooks.product_mapping import normalize_size, extract_finish

    inv = await qbo_client.fetch_live_inventory(
        search=search,
        category=category,
        include_demo=demo,
    )
    items = inv.get("items", [])

    output = io.StringIO()
    # Write UTF-8 BOM for Excel and international characters
    output.write("\ufeff")
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Exact 19 Shopify Inventory headers matching inventory_bin_new_on_hand_template.csv
    writer.writerow([
        "Handle",
        "Title",
        "Option1 Name",
        "Option1 Value",
        "Option2 Name",
        "Option2 Value",
        "Option3 Name",
        "Option3 Value",
        "SKU",
        "HS Code",
        "COO",
        "Location",
        "Bin name",
        "Incoming (not editable)",
        "Unavailable (not editable)",
        "Committed (not editable)",
        "Available (not editable)",
        "On hand (current)",
        "On hand (new)",
    ])

    def format_qty(val):
        if val is None or val == "":
            return ""
        try:
            f = float(val)
            return str(int(f)) if f.is_integer() else str(f)
        except (ValueError, TypeError):
            return str(val)

    def slugify(text):
        if not text:
            return "product"
        s = text.lower()
        s = re.sub(r'[^a-z0-9]+', '-', s)
        s = re.sub(r'-+', '-', s)
        return s.strip('-') or "product"

    for it in items:
        title = (it.get("walcano_name") or it.get("name") or it.get("title") or "").strip()
        handle = (it.get("handle") or slugify(title)).strip()
        sku = (it.get("sku") or "").strip()

        # Options determination
        opt1_name = it.get("option1_name", "")
        opt1_val = it.get("option1_value", "")
        opt2_name = it.get("option2_name", "")
        opt2_val = it.get("option2_value", "")
        opt3_name = it.get("option3_name", "")
        opt3_val = it.get("option3_value", "")

        if not opt1_name and not opt1_val:
            combined = f"{title} {sku} {it.get('category', '')}"
            size_tuple = normalize_size(combined)
            finishes = extract_finish(combined)

            if size_tuple:
                opt1_name = "Size"
                opt1_val = f"{size_tuple[0]}x{size_tuple[1]} cm"
                if finishes:
                    opt2_name = "Finish"
                    opt2_val = finishes[0].capitalize()
            else:
                opt1_name = "Title"
                opt1_val = "Default Title"

        hs_code = it.get("hs_code", "")
        coo = it.get("coo", "")
        bin_name = it.get("bin_name") or it.get("bin") or ""
        target_location = (it.get("location") or location or "123 William Street").strip()

        raw_qty = float(it.get("qty_on_hand", 0.0) or 0.0)
        incoming = format_qty(it.get("incoming", 0))
        unavailable = format_qty(it.get("unavailable", 0))
        committed = format_qty(it.get("committed", 0))

        committed_float = float(it.get("committed", 0) or 0.0)
        available_qty = it.get("available") if it.get("available") is not None else max(0.0, raw_qty - committed_float)
        available = format_qty(available_qty)
        on_hand_current = format_qty(it.get("on_hand_current") if it.get("on_hand_current") is not None else raw_qty)

        # On hand (new): populated with current stock for direct import without manual modifications
        on_hand_new = format_qty(it.get("on_hand_new") if it.get("on_hand_new") is not None else raw_qty) if fill_on_hand_new else ""

        writer.writerow([
            handle,
            title,
            opt1_name,
            opt1_val,
            opt2_name,
            opt2_val,
            opt3_name,
            opt3_val,
            sku,
            hs_code,
            coo,
            target_location,
            bin_name,
            incoming,
            unavailable,
            committed,
            available,
            on_hand_current,
            on_hand_new,
        ])

    today_str = datetime.now().strftime("%Y-%m-%d")
    filename = f"shopify_inventory_{today_str}.csv"
    output.seek(0)

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


