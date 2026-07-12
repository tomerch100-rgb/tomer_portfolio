from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Numeric, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.base_class import Base

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False) # 255 הוא הסטנדרט המקובל לאימיילים
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(60), nullable=False) # חובה 60 תווים עבור Bcrypt
    
    # קשרים לטבלאות האחרות. cascade דואג למחיקה אוטומטית אם המשתמש נמחק
    portfolio = relationship("Portfolio", back_populates="owner", cascade="all, delete-orphan")
    history = relationship("PortfolioHistory", back_populates="owner", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="owner", cascade="all, delete-orphan")
    watchlist = relationship("Watchlist", back_populates="owner", cascade="all, delete-orphan")


class Portfolio(Base):
    __tablename__ = "portfolio"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(12), nullable=False)
    
    # Numeric(10, 4) אומר: סך הכל 10 ספרות, מתוכן 4 אחרי הנקודה. מושלם לשברי מניות
    shares = Column(Numeric(10, 4), nullable=False)
    avg_price = Column(Numeric(10, 2), nullable=False) # 2 ספרות אחרי הנקודה לכסף
    sector = Column(String(50), nullable=False)
    
    owner = relationship("User", back_populates="portfolio")
    
    # חוק ברזל: למשתמש לא יכולה להיות פעמיים אותה מניה בתיק בשורות נפרדות
    __table_args__ = (UniqueConstraint("user_id", "ticker", name="_user_ticker_uc"),)


class PortfolioHistory(Base):
    __tablename__ = "portfolio_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    total_value = Column(Numeric(12, 2), nullable=False)
    
    # הדאטהבייס מכניס את התאריך של היום באופן עצמאי
    calculation_date = Column(Date, server_default=func.current_date(), nullable=False)
    
    owner = relationship("User", back_populates="history")


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(12), nullable=False)
    type = Column(String(10), nullable=False) # 'BUY' או 'SELL'
    shares = Column(Numeric(10, 4), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    # חותמת זמן מדויקת עם שעה דקה ושנייה
    transaction_date = Column(DateTime, server_default=func.now(), nullable=False)
    realized_pl = Column(Numeric(10, 2), default=0.00)
    
    owner = relationship("User", back_populates="transactions")


class Watchlist(Base):
    __tablename__ = "watchlist"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(12), nullable=False)
    order_index = Column(Integer, default=0) # עוזר לשמור על הסדר שהמשתמש מסדר את הרשימה
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    owner = relationship("User", back_populates="watchlist")
    
    # חוק ברזל: משתמש לא יכול להוסיף את אותה מניה פעמיים לרשימת המעקב
    __table_args__ = (UniqueConstraint("user_id", "ticker", name="_user_watchlist_uc"),)