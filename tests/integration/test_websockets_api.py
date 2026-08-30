import pytest
import asyncio
from starlette.testclient import TestClient
from app.core.ws_manager import manager
from app.core.security import create_access_token
from app.models.user import User

def test_websocket_cswsh_protection_rejects_unauthorized_origin(sync_client: TestClient, test_user: User):
    """CSWSH Security: Reject connections from unapproved Origins with WS_1008 Policy Violation."""
    token = create_access_token({"sub": str(test_user.user_id)})
    
    with pytest.raises(Exception):
        with sync_client.websocket_connect(
            f"/ws?token={token}",
            headers={"Origin": "https://malicious-untrusted-site.com"}
        ) as ws:
            pass

def test_websocket_connection_with_valid_token_and_origin(sync_client: TestClient, test_user: User):
    """Verify WebSocket connects cleanly with valid JWT token and approved origin."""
    token = create_access_token({"sub": str(test_user.user_id)})
    headers = {"Origin": "http://localhost:5173"}

    with sync_client.websocket_connect(f"/ws?token={token}", headers=headers) as websocket:
        # Assert user is registered in active connections
        assert test_user.user_id in manager.active_connections
        assert len(manager.active_connections[test_user.user_id]) >= 1

    # Disconnect cleans up
    assert test_user.user_id not in manager.active_connections

def test_websocket_multi_tab_broadcast_to_same_user(sync_client: TestClient, test_user: User):
    """Verify multiple tabs opened by the same user receive real-time personal events."""
    token = create_access_token({"sub": str(test_user.user_id)})
    headers = {"Origin": "http://localhost:5173"}

    with sync_client.websocket_connect(f"/ws?token={token}", headers=headers) as tab1:
        with sync_client.websocket_connect(f"/ws?token={token}", headers=headers) as tab2:
            # 2 active sockets for user
            assert len(manager.active_connections[test_user.user_id]) == 2

            test_payload = {"type": "PRICE_UPDATE", "ticker": "NVDA", "price": 135.0}
            asyncio.run(manager.send_personal_message(test_payload, test_user.user_id))

            msg1 = tab1.receive_json()
            msg2 = tab2.receive_json()

            assert msg1["type"] == "PRICE_UPDATE"
            assert msg2["type"] == "PRICE_UPDATE"
            assert msg1["price"] == 135.0
            assert msg2["price"] == 135.0
