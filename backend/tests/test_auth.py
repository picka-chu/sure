import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_register_validation(client):
    resp = await client.post("/api/auth/register", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_validation(client):
    resp = await client.post("/api/auth/login", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_staff_login_validation(client):
    resp = await client.post("/api/auth/staff/login", json={})
    assert resp.status_code == 422
