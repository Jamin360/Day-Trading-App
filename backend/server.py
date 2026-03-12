from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import random
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'daytradingpro_secret_key_2024')
JWT_ALGORITHM = "HS256"

# Create the main app
app = FastAPI(title="DayTradingPro API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    balance: float
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class StockData(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    high: float
    low: float
    open: float
    volume: int
    timestamp: str

class PricePoint(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class TradeCreate(BaseModel):
    symbol: str
    action: str  # 'buy' or 'sell'
    quantity: int
    price: float

class TradeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    symbol: str
    action: str
    quantity: int
    price: float
    total: float
    timestamp: str

class Position(BaseModel):
    symbol: str
    name: str
    quantity: int
    avg_price: float
    current_price: float
    market_value: float
    pnl: float
    pnl_percent: float

class PortfolioResponse(BaseModel):
    balance: float
    portfolio_value: float
    total_value: float
    total_pnl: float
    total_pnl_percent: float
    positions: List[Position]

class JournalEntryCreate(BaseModel):
    trade_id: Optional[str] = None
    symbol: Optional[str] = None
    title: str
    content: str
    sentiment: str  # 'bullish', 'bearish', 'neutral'
    lessons: Optional[str] = None

class JournalEntryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    trade_id: Optional[str]
    symbol: Optional[str]
    title: str
    content: str
    sentiment: str
    lessons: Optional[str]
    created_at: str

# ==================== STOCK SIMULATION ====================

STOCKS = {
    "AAPL": {"name": "Apple Inc.", "base_price": 185.50},
    "MSFT": {"name": "Microsoft Corp.", "base_price": 378.25},
    "GOOGL": {"name": "Alphabet Inc.", "base_price": 141.80},
    "AMZN": {"name": "Amazon.com Inc.", "base_price": 178.90},
    "TSLA": {"name": "Tesla Inc.", "base_price": 248.50},
    "NVDA": {"name": "NVIDIA Corp.", "base_price": 495.75},
    "META": {"name": "Meta Platforms Inc.", "base_price": 505.30},
    "JPM": {"name": "JPMorgan Chase", "base_price": 198.40},
    "V": {"name": "Visa Inc.", "base_price": 275.60},
    "WMT": {"name": "Walmart Inc.", "base_price": 165.20}
}

# Store simulated prices in memory
price_cache = {}
price_history = {}

def simulate_price(base_price: float, volatility: float = 0.02) -> float:
    """Generate realistic price movement"""
    change = random.gauss(0, volatility)
    return round(base_price * (1 + change), 2)

def get_current_price(symbol: str) -> dict:
    """Get current simulated price for a stock"""
    if symbol not in STOCKS:
        return None
    
    base = STOCKS[symbol]["base_price"]
    now = datetime.now(timezone.utc)
    
    # Initialize or update price cache
    if symbol not in price_cache or (now - price_cache[symbol]["updated"]).seconds > 5:
        if symbol in price_cache:
            prev_price = price_cache[symbol]["price"]
        else:
            prev_price = base
        
        new_price = simulate_price(prev_price, 0.003)
        open_price = price_cache.get(symbol, {}).get("open", simulate_price(base, 0.01))
        high = max(price_cache.get(symbol, {}).get("high", new_price), new_price)
        low = min(price_cache.get(symbol, {}).get("low", new_price), new_price)
        
        change = new_price - open_price
        change_percent = (change / open_price) * 100
        
        price_cache[symbol] = {
            "price": new_price,
            "open": open_price,
            "high": high,
            "low": low,
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "volume": random.randint(1000000, 50000000),
            "updated": now
        }
    
    return price_cache[symbol]

def generate_price_history(symbol: str, minutes: int = 60) -> List[dict]:
    """Generate historical price data for charting"""
    if symbol not in STOCKS:
        return []
    
    base = STOCKS[symbol]["base_price"]
    now = datetime.now(timezone.utc)
    history = []
    
    price = base * random.uniform(0.98, 1.02)
    
    for i in range(minutes):
        time = now - timedelta(minutes=minutes - i)
        
        # Simulate OHLC
        open_p = price
        close_p = simulate_price(open_p, 0.002)
        high_p = max(open_p, close_p) * random.uniform(1.0, 1.005)
        low_p = min(open_p, close_p) * random.uniform(0.995, 1.0)
        
        history.append({
            "time": time.strftime("%H:%M"),
            "open": round(open_p, 2),
            "high": round(high_p, 2),
            "low": round(low_p, 2),
            "close": round(close_p, 2),
            "volume": random.randint(10000, 500000)
        })
        
        price = close_p
    
    return history

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "balance": 100000.00,  # Starting virtual balance
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user_id,
        email=data.email,
        name=data.name,
        balance=100000.00,
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        balance=user["balance"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        balance=user["balance"],
        created_at=user["created_at"]
    )

# ==================== STOCK ENDPOINTS ====================

@api_router.get("/stocks", response_model=List[StockData])
async def get_stocks():
    """Get all stocks with current prices"""
    stocks = []
    for symbol, info in STOCKS.items():
        price_data = get_current_price(symbol)
        stocks.append(StockData(
            symbol=symbol,
            name=info["name"],
            price=price_data["price"],
            change=price_data["change"],
            change_percent=price_data["change_percent"],
            high=price_data["high"],
            low=price_data["low"],
            open=price_data["open"],
            volume=price_data["volume"],
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
    return stocks

@api_router.get("/stocks/{symbol}", response_model=StockData)
async def get_stock(symbol: str):
    """Get single stock data"""
    symbol = symbol.upper()
    if symbol not in STOCKS:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    price_data = get_current_price(symbol)
    return StockData(
        symbol=symbol,
        name=STOCKS[symbol]["name"],
        price=price_data["price"],
        change=price_data["change"],
        change_percent=price_data["change_percent"],
        high=price_data["high"],
        low=price_data["low"],
        open=price_data["open"],
        volume=price_data["volume"],
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@api_router.get("/stocks/{symbol}/history", response_model=List[PricePoint])
async def get_stock_history(symbol: str, minutes: int = 60):
    """Get price history for charting"""
    symbol = symbol.upper()
    if symbol not in STOCKS:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    history = generate_price_history(symbol, minutes)
    return [PricePoint(**p) for p in history]

# ==================== TRADING ENDPOINTS ====================

@api_router.post("/trades", response_model=TradeResponse)
async def create_trade(trade: TradeCreate, user: dict = Depends(get_current_user)):
    """Execute a buy or sell trade"""
    symbol = trade.symbol.upper()
    
    if symbol not in STOCKS:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    if trade.action not in ["buy", "sell"]:
        raise HTTPException(status_code=400, detail="Action must be 'buy' or 'sell'")
    
    if trade.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    
    total = trade.price * trade.quantity
    
    # Get current user balance
    current_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    if trade.action == "buy":
        if current_user["balance"] < total:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Update balance
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"balance": -total}}
        )
        
        # Update or create position
        position = await db.positions.find_one({"user_id": user["id"], "symbol": symbol}, {"_id": 0})
        if position:
            new_qty = position["quantity"] + trade.quantity
            new_avg = ((position["avg_price"] * position["quantity"]) + total) / new_qty
            await db.positions.update_one(
                {"user_id": user["id"], "symbol": symbol},
                {"$set": {"quantity": new_qty, "avg_price": round(new_avg, 2)}}
            )
        else:
            await db.positions.insert_one({
                "user_id": user["id"],
                "symbol": symbol,
                "name": STOCKS[symbol]["name"],
                "quantity": trade.quantity,
                "avg_price": trade.price
            })
    
    else:  # sell
        position = await db.positions.find_one({"user_id": user["id"], "symbol": symbol}, {"_id": 0})
        if not position or position["quantity"] < trade.quantity:
            raise HTTPException(status_code=400, detail="Insufficient shares to sell")
        
        # Update balance
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"balance": total}}
        )
        
        # Update position
        new_qty = position["quantity"] - trade.quantity
        if new_qty == 0:
            await db.positions.delete_one({"user_id": user["id"], "symbol": symbol})
        else:
            await db.positions.update_one(
                {"user_id": user["id"], "symbol": symbol},
                {"$set": {"quantity": new_qty}}
            )
    
    # Record trade
    trade_id = str(uuid.uuid4())
    trade_record = {
        "id": trade_id,
        "user_id": user["id"],
        "symbol": symbol,
        "action": trade.action,
        "quantity": trade.quantity,
        "price": trade.price,
        "total": round(total, 2),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.trades.insert_one(trade_record)
    
    return TradeResponse(**trade_record)

@api_router.get("/trades", response_model=List[TradeResponse])
async def get_trades(user: dict = Depends(get_current_user), limit: int = 50):
    """Get user's trade history"""
    trades = await db.trades.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return [TradeResponse(**t) for t in trades]

# ==================== PORTFOLIO ENDPOINTS ====================

@api_router.get("/portfolio", response_model=PortfolioResponse)
async def get_portfolio(user: dict = Depends(get_current_user)):
    """Get user's portfolio with current values"""
    current_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    positions_data = await db.positions.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    positions = []
    portfolio_value = 0
    total_cost = 0
    
    for pos in positions_data:
        price_data = get_current_price(pos["symbol"])
        current_price = price_data["price"]
        market_value = current_price * pos["quantity"]
        cost_basis = pos["avg_price"] * pos["quantity"]
        pnl = market_value - cost_basis
        pnl_percent = (pnl / cost_basis) * 100 if cost_basis > 0 else 0
        
        positions.append(Position(
            symbol=pos["symbol"],
            name=pos.get("name", STOCKS.get(pos["symbol"], {}).get("name", pos["symbol"])),
            quantity=pos["quantity"],
            avg_price=pos["avg_price"],
            current_price=current_price,
            market_value=round(market_value, 2),
            pnl=round(pnl, 2),
            pnl_percent=round(pnl_percent, 2)
        ))
        
        portfolio_value += market_value
        total_cost += cost_basis
    
    total_value = current_user["balance"] + portfolio_value
    total_pnl = portfolio_value - total_cost
    total_pnl_percent = (total_pnl / total_cost) * 100 if total_cost > 0 else 0
    
    return PortfolioResponse(
        balance=round(current_user["balance"], 2),
        portfolio_value=round(portfolio_value, 2),
        total_value=round(total_value, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_percent=round(total_pnl_percent, 2),
        positions=positions
    )

# ==================== JOURNAL ENDPOINTS ====================

@api_router.post("/journal", response_model=JournalEntryResponse)
async def create_journal_entry(entry: JournalEntryCreate, user: dict = Depends(get_current_user)):
    """Create a trading journal entry"""
    entry_id = str(uuid.uuid4())
    entry_record = {
        "id": entry_id,
        "user_id": user["id"],
        "trade_id": entry.trade_id,
        "symbol": entry.symbol,
        "title": entry.title,
        "content": entry.content,
        "sentiment": entry.sentiment,
        "lessons": entry.lessons,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.journal.insert_one(entry_record)
    
    return JournalEntryResponse(**entry_record)

@api_router.get("/journal", response_model=List[JournalEntryResponse])
async def get_journal_entries(user: dict = Depends(get_current_user), limit: int = 50):
    """Get user's journal entries"""
    entries = await db.journal.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [JournalEntryResponse(**e) for e in entries]

@api_router.delete("/journal/{entry_id}")
async def delete_journal_entry(entry_id: str, user: dict = Depends(get_current_user)):
    """Delete a journal entry"""
    result = await db.journal.delete_one({"id": entry_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted"}

# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/analytics/performance")
async def get_performance(user: dict = Depends(get_current_user)):
    """Get trading performance analytics"""
    trades = await db.trades.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    if not trades:
        return {
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "win_rate": 0,
            "total_profit": 0,
            "total_loss": 0,
            "net_pnl": 0,
            "avg_trade_size": 0,
            "largest_win": 0,
            "largest_loss": 0,
            "by_symbol": {}
        }
    
    # Calculate metrics
    total_trades = len(trades)
    buys = [t for t in trades if t["action"] == "buy"]
    sells = [t for t in trades if t["action"] == "sell"]
    
    # Group by symbol for P&L
    by_symbol = {}
    for trade in trades:
        symbol = trade["symbol"]
        if symbol not in by_symbol:
            by_symbol[symbol] = {"trades": 0, "volume": 0}
        by_symbol[symbol]["trades"] += 1
        by_symbol[symbol]["volume"] += trade["total"]
    
    return {
        "total_trades": total_trades,
        "buy_trades": len(buys),
        "sell_trades": len(sells),
        "total_volume": round(sum(t["total"] for t in trades), 2),
        "avg_trade_size": round(sum(t["total"] for t in trades) / total_trades, 2),
        "by_symbol": by_symbol
    }

# ==================== RESET ENDPOINT ====================

@api_router.post("/reset")
async def reset_account(user: dict = Depends(get_current_user)):
    """Reset user's account to starting state"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"balance": 100000.00}}
    )
    await db.positions.delete_many({"user_id": user["id"]})
    await db.trades.delete_many({"user_id": user["id"]})
    await db.journal.delete_many({"user_id": user["id"]})
    
    return {"message": "Account reset successfully", "balance": 100000.00}

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "DayTradingPro API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
