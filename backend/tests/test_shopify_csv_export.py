import csv
import io
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import application

@pytest.mark.asyncio
async def test_shopify_csv_export_exact_headers_and_structure():
    # Read reference Shopify template
    with open("../inventory_bin_new_on_hand_template.csv", "r", encoding="utf-8") as f:
        template_reader = csv.reader(f)
        expected_headers = next(template_reader)

    assert len(expected_headers) == 19

    async with AsyncClient(transport=ASGITransport(app=application), base_url="http://test") as client:
        response = await client.get("/api/v1/quickbooks/export-csv?demo=true&location=123%20William%20Street&fill_on_hand_new=true")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]

        content = response.content.decode("utf-8-sig")
        reader = csv.reader(io.StringIO(content))
        actual_headers = next(reader)

        # 1. Exact Header Match
        assert actual_headers == expected_headers, f"Headers do not match template!\nExpected: {expected_headers}\nActual: {actual_headers}"

        rows = list(reader)
        assert len(rows) > 0

        # 2. Row Format & Column Count Verification
        for row in rows:
            assert len(row) == 19, f"Row length is {len(row)}, expected 19"
            handle = row[0]
            title = row[1]
            opt1_name = row[2]
            opt1_val = row[3]
            sku = row[8]
            location = row[11]
            available = row[16]
            on_hand_current = row[17]
            on_hand_new = row[18]

            # Verify slug format
            assert handle and "-" in handle or handle.isalnum()
            # Verify title is present
            assert title
            # Verify options
            assert opt1_name in ("Size", "Title")
            assert opt1_val
            # Verify location matches requested
            assert location == "123 William Street"
            # Verify on_hand_current and on_hand_new are populated
            assert on_hand_current != ""
            assert on_hand_new == on_hand_current, f"Expected on_hand_new to equal current stock for direct import. Got {on_hand_new} vs {on_hand_current}"

@pytest.mark.asyncio
async def test_shopify_csv_export_blank_on_hand_new_mode():
    async with AsyncClient(transport=ASGITransport(app=application), base_url="http://test") as client:
        response = await client.get("/api/v1/quickbooks/export-csv?demo=true&fill_on_hand_new=false")
        assert response.status_code == 200
        content = response.content.decode("utf-8-sig")
        reader = csv.reader(io.StringIO(content))
        headers = next(reader)
        assert len(headers) == 19
        rows = list(reader)
        assert len(rows) > 0
        for row in rows:
            assert row[18] == "", "Expected 'On hand (new)' to be blank when fill_on_hand_new=False"
