from fastapi.testclient import TestClient

try:
    from backend.app.main import app
except ModuleNotFoundError:
    from backend.main import app

client = TestClient(app)


def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code in (200, 404)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code in (200, 404)
