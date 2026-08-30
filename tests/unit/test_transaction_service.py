import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.user import User
from app.services import transaction_service


def test_execute_cash_deposit_and_withdraw(db_session: Session, test_user: User):
    """Test depositing cash and withdrawing cash."""
    # Deposit $1000
    tx1 = transaction_service.execute_cash_transaction(db_session, test_user.user_id, "DEPOSIT", 1000.0)
    assert tx1 is not None

    summary = transaction_service.get_cash_summary(db_session, test_user.user_id)
    assert float(summary["available_cash"]) >= 1000.0

    # Withdraw $400
    tx2 = transaction_service.execute_cash_transaction(db_session, test_user.user_id, "WITHDRAW", 400.0)
    assert tx2 is not None

    summary2 = transaction_service.get_cash_summary(db_session, test_user.user_id)
    assert float(summary2["available_cash"]) == float(summary["available_cash"]) - 400.0


def test_withdraw_insufficient_funds_raises_error(db_session: Session, test_user: User):
    """Test withdrawal exceeding cash balance raises HTTPException 400."""
    with pytest.raises(HTTPException) as exc_info:
        transaction_service.execute_cash_transaction(db_session, test_user.user_id, "WITHDRAW", 9999999.0)
    assert exc_info.value.status_code == 400


def test_invalid_cash_transaction_type_raises_error(db_session: Session, test_user: User):
    """Test invalid cash transaction type raises HTTPException 400."""
    with pytest.raises(HTTPException) as exc_info:
        transaction_service.execute_cash_transaction(db_session, test_user.user_id, "INVALID_TYPE", 100.0)
    assert exc_info.value.status_code == 400


def test_transaction_log_history(db_session: Session, test_user: User):
    """Test formatting transaction logs for display."""
    transaction_service.execute_cash_transaction(db_session, test_user.user_id, "DEPOSIT", 500.0)
    history = transaction_service.transaction_log_history(db_session, test_user.user_id)
    assert isinstance(history, list)
    assert len(history) >= 1
    assert history[0]["action_type"] == "DEPOSIT"


@pytest.mark.asyncio
async def test_execute_stock_trade_buy_insufficient_cash(db_session: Session, test_user: User):
    """Test buy order when user has insufficient cash balance."""
    with pytest.raises(HTTPException) as exc_info:
        await transaction_service.execute_stock_trade(db_session, test_user.user_id, "BUY", "NVDA", 100, 1000.0)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_execute_stock_trade_buy_and_sell_success(db_session: Session, test_user: User):
    """Test buying stock with deposited cash and selling it."""
    # Deposit cash first
    transaction_service.execute_cash_transaction(db_session, test_user.user_id, "DEPOSIT", 5000.0)

    # Buy NVDA
    res_buy = await transaction_service.execute_stock_trade(db_session, test_user.user_id, "BUY", "NVDA", 10, 120.0)
    assert res_buy is not None

    # Sell NVDA
    res_sell = await transaction_service.execute_stock_trade(db_session, test_user.user_id, "SELL", "NVDA", 5, 140.0)
    assert res_sell is not None


@pytest.mark.asyncio
async def test_execute_stock_trade_invalid_type(db_session: Session, test_user: User):
    """Test invalid trade type."""
    with pytest.raises(HTTPException) as exc_info:
        await transaction_service.execute_stock_trade(db_session, test_user.user_id, "UNKNOWN", "AAPL", 10, 150.0)
    assert exc_info.value.status_code == 400
