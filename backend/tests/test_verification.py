import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_verify_link_unauthenticated(client):
    resp = await client.post("/api/verifications/verify-link", data={
        "bank_name": "cbe",
        "reference": "test-ref",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_capture_unauthenticated(client):
    resp = await client.post("/api/verifications/capture")
    assert resp.status_code == 401
