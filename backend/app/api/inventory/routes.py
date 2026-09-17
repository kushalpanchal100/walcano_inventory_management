import io
import csv
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.integrations.quickbooks.client import QuickBooksClient

router = APIRouter(prefix="/inventory", tags=["QuickBooks Live Inventory"])
_qbo_client = QuickBooksClient()


@router.get("")
async def list_inventory(
    search: Optional[str] = Query(None, description="Search SKU, name, or category"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    demo: bool = Query(False, description="Explicit preview mode"),
):
    """
    List live inventory items fetched directly from QuickBooks Online.
    Returns Product Name, SKU, Quantity on Hand, and Category as the authoritative source.
    """
    return await _qbo_client.fetch_live_inventory(
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
    Export live inventory as a downloadable CSV file.
    """
    inv = await _qbo_client.fetch_live_inventory(
        search=search,
        category=category,
        include_demo=demo,
    )
    items = inv.get("items", [])

    output = io.StringIO()
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

