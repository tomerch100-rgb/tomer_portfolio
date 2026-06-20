import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div>
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <button className="primary">Add Transaction</button>
      </div>

      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <div className="metric-title">Total Portfolio Value</div>
          <div className="metric-value">$124,563.00</div>
          <div className="metric-change positive">↑ 2.4% today</div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-title">Today's Profit</div>
          <div className="metric-value">+$3,240.50</div>
          <div className="metric-change positive">↑ 1.2% today</div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-title">Top Performer</div>
          <div className="metric-value">NVDA</div>
          <div className="metric-change positive">↑ 4.8% today</div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-title">Cash Balance</div>
          <div className="metric-value">$12,450.00</div>
          <div className="metric-change">Available for trading</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="glass-panel chart-card">
          <div className="card-header">Portfolio Performance (Placeholder)</div>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Chart visualization will be implemented here
          </div>
        </div>
        
        <div className="glass-panel list-card">
          <div className="card-header">Watchlist</div>
          <div className="stock-list">
            <div className="stock-item">
              <div>
                <div className="stock-symbol">AAPL</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Apple Inc.</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="stock-price">$189.43</div>
                <div className="metric-change positive">+1.2%</div>
              </div>
            </div>
            <div className="stock-item">
              <div>
                <div className="stock-symbol">MSFT</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Microsoft Corp.</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="stock-price">$412.30</div>
                <div className="metric-change positive">+0.8%</div>
              </div>
            </div>
            <div className="stock-item">
              <div>
                <div className="stock-symbol">TSLA</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tesla Inc.</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="stock-price">$175.22</div>
                <div className="metric-change negative">-2.1%</div>
              </div>
            </div>
            <div className="stock-item">
              <div>
                <div className="stock-symbol">AMZN</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Amazon.com Inc.</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="stock-price">$178.15</div>
                <div className="metric-change positive">+0.4%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
