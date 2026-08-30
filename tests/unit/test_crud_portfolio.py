from sqlalchemy.orm import Session

from app.crud import crud_portfolio
from app.models.user import User


def test_crud_portfolio_lifecycle(db_session: Session, test_user: User):
    """Test full CRUD operations on portfolio positions and history."""
    # 1. Insert position
    pos = crud_portfolio.insert_portfolio(db_session, test_user.user_id, "GOOGL", 15.0, 140.0, "Technology")
    assert pos.id is not None
    assert pos.ticker == "GOOGL"

    # 2. Get single & all
    retrieved = crud_portfolio.get_portfolio_stock(db_session, test_user.user_id, "GOOGL")
    assert retrieved is not None
    all_pos = crud_portfolio.get_portfolio_all(db_session, test_user.user_id)
    assert len(all_pos) == 1

    # 3. Update shares and avg_price
    updated = crud_portfolio.update_portfolio(db_session, test_user.user_id, "GOOGL", 20.0, 145.0)
    assert updated.shares == 20.0
    assert updated.avg_price == 145.0

    # 4. Total value & count
    total_val = crud_portfolio.get_portfolio_total_value(db_session, test_user.user_id)
    assert total_val == 20.0 * 145.0
    count = crud_portfolio.get_portfolio_positions_count(db_session, test_user.user_id)
    assert count == 1

    # 5. History operations
    hist = crud_portfolio.insert_portfolio_history(db_session, test_user.user_id, total_val)
    assert hist.id is not None
    history_records = crud_portfolio.get_portfolio_history(db_session, test_user.user_id)
    assert len(history_records) == 1

    # 6. Delete position
    deleted = crud_portfolio.delete_portfolio_stock(db_session, test_user.user_id, "GOOGL")
    assert deleted is True
    assert crud_portfolio.get_portfolio_stock(db_session, test_user.user_id, "GOOGL") is None
