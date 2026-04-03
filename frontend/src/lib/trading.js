// Trading helper functions for Supabase
import { supabase } from "./supabase";
import { STOCKS, getStockData, generatePriceHistory } from "./supabase";

export async function executeTrade(userId, symbol, action, quantity, price) {
  const total = price * quantity;

  // Get current balance and position
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single();

  if (!profile) throw new Error('User not found');

  const { data: existingPosition } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .single();

  if (action === 'buy') {
    if (profile.balance < total) {
      throw new Error('Insufficient balance');
    }

    // Update balance
    await supabase
      .from('profiles')
      .update({ balance: profile.balance - total })
      .eq('id', userId);

    // Update or create position
    if (existingPosition) {
      const newQty = existingPosition.quantity + quantity;
      const newAvg = ((existingPosition.avg_price * existingPosition.quantity) + total) / newQty;
      
      await supabase
        .from('positions')
        .update({ 
          quantity: newQty, 
          avg_price: newAvg
        })
        .eq('user_id', userId)
        .eq('symbol', symbol);
    } else {
      await supabase
        .from('positions')
        .insert({
          user_id: userId,
          symbol,
          name: STOCKS[symbol]?.name || symbol,
          quantity,
          avg_price: price
        });
    }
  } else {
    // Sell
    if (!existingPosition || existingPosition.quantity < quantity) {
      throw new Error('Insufficient shares to sell');
    }

    // Update balance
    await supabase
      .from('profiles')
      .update({ balance: profile.balance + total })
      .eq('id', userId);

    // Update position
    const newQty = existingPosition.quantity - quantity;
    if (newQty === 0) {
      await supabase
        .from('positions')
        .delete()
        .eq('user_id', userId)
        .eq('symbol', symbol);
    } else {
      await supabase
        .from('positions')
        .update({ quantity: newQty })
        .eq('user_id', userId)
        .eq('symbol', symbol);
    }
  }

  // Record trade
  const { data: trade, error } = await supabase
    .from('trades')
    .insert({
      user_id: userId,
      symbol,
      action,
      quantity,
      price,
      total
    })
    .select()
    .single();

  if (error) throw error;
  return trade;
}

export async function getPortfolio(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single();

  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId);

  const stocks = getStockData();
  
  const portfolioPositions = (positions || []).map(pos => {
    const stock = stocks.find(s => s.symbol === pos.symbol);
    const currentPrice = stock?.price || pos.avg_price;
    const marketValue = currentPrice * pos.quantity;
    const costBasis = pos.avg_price * pos.quantity;
    const pnl = marketValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

    return {
      symbol: pos.symbol,
      name: pos.name,
      quantity: pos.quantity,
      avg_price: parseFloat(pos.avg_price),
      current_price: currentPrice,
      market_value: marketValue,
      pnl,
      pnl_percent: pnlPercent
    };
  });

  const portfolioValue = portfolioPositions.reduce((sum, p) => sum + p.market_value, 0);
  const balance = parseFloat(profile?.balance || 0);

  return {
    balance,
    portfolio_value: portfolioValue,
    positions: portfolioPositions
  };
}
