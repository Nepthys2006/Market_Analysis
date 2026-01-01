/**
 * Stock Exchange Pro - AI-Powered Trading Analysis Platform
 * ==========================================================
 * Features:
 * - Live market data with 5-second REST API polling (Finnhub)
 * - AI Trading Council integration via WebSocket
 * - 11 specific market symbols (crypto, forex, stocks)
 * - Collapsible panels with minimize/maximize
 */

// ============ Configuration ============
const CONFIG = {
    FINNHUB_API_KEY: localStorage.getItem('finnhub_key') || '',
    FINNHUB_REST_URL: 'https://finnhub.io/api/v1',
    AI_COUNCIL_URL: localStorage.getItem('council_url') || 'ws://localhost:8000/ws',
    REFRESH_INTERVAL: parseInt(localStorage.getItem('refresh_interval')) || 5000,
    DEFAULT_SYMBOL: 'AAPL',
    DEMO_MODE: false
};

// ============ Market Symbols Configuration ============
const MARKETS = {
    crypto: [
        { symbol: 'BINANCE:BTCUSDT', display: 'BTC', name: 'Bitcoin', type: 'crypto' },
        { symbol: 'BINANCE:ETHUSDT', display: 'ETH', name: 'Ethereum', type: 'crypto' },
        { symbol: 'BINANCE:SOLUSDT', display: 'SOL', name: 'Solana', type: 'crypto' }
    ],
    forex: [
        { symbol: 'OANDA:XAU_USD', display: 'GOLD', name: 'Gold/USD', type: 'commodity' },
        { symbol: 'OANDA:EUR_USD', display: 'EUR', name: 'Euro/USD', type: 'forex' },
        { symbol: 'OANDA:USD_JPY', display: 'JPY', name: 'USD/JPY', type: 'forex' }
    ],
    stocks: [
        { symbol: 'NVDA', display: 'NVDA', name: 'NVIDIA', type: 'stock' },
        { symbol: 'GOOGL', display: 'GOOGL', name: 'Alphabet', type: 'stock' },
        { symbol: 'AMZN', display: 'AMZN', name: 'Amazon', type: 'stock' },
        { symbol: 'AAPL', display: 'AAPL', name: 'Apple', type: 'stock' },
        { symbol: 'TSLA', display: 'TSLA', name: 'Tesla', type: 'stock' }
    ]
};

// Get all symbols as flat array
const ALL_SYMBOLS = [...MARKETS.crypto, ...MARKETS.forex, ...MARKETS.stocks];

// ============ Demo Data for Fallback ============
const DEMO_DATA = {
    quotes: {
        'BINANCE:BTCUSDT': { c: 42500, pc: 42000, o: 42100, h: 43000, l: 41800, dp: 1.19 },
        'BINANCE:ETHUSDT': { c: 2250, pc: 2200, o: 2210, h: 2280, l: 2180, dp: 2.27 },
        'BINANCE:SOLUSDT': { c: 98.5, pc: 96.0, o: 96.5, h: 100, l: 95, dp: 2.60 },
        'OANDA:XAU_USD': { c: 2045, pc: 2038, o: 2040, h: 2050, l: 2035, dp: 0.34 },
        'OANDA:EUR_USD': { c: 1.0865, pc: 1.0850, o: 1.0855, h: 1.0880, l: 1.0840, dp: 0.14 },
        'OANDA:USD_JPY': { c: 148.25, pc: 147.80, o: 147.90, h: 148.50, l: 147.60, dp: 0.30 },
        'NVDA': { c: 495, pc: 488, o: 490, h: 500, l: 485, dp: 1.43 },
        'GOOGL': { c: 140.25, pc: 138.50, o: 139, h: 141, l: 138, dp: 1.26 },
        'AMZN': { c: 178.25, pc: 175, o: 176, h: 180, l: 174.50, dp: 1.86 },
        'AAPL': { c: 178.50, pc: 175.20, o: 176, h: 180, l: 175.50, dp: 1.88 },
        'TSLA': { c: 248.50, pc: 242, o: 244, h: 252, l: 241, dp: 2.69 }
    },
    profiles: {
        'NVDA': { name: 'NVIDIA Corporation', marketCapitalization: 1220000 },
        'GOOGL': { name: 'Alphabet Inc.', marketCapitalization: 1750000 },
        'AMZN': { name: 'Amazon.com Inc.', marketCapitalization: 1560000 },
        'AAPL': { name: 'Apple Inc.', marketCapitalization: 2800000 },
        'TSLA': { name: 'Tesla Inc.', marketCapitalization: 787000 }
    },
    generateCandles(basePrice, count = 100) {
        const candles = [];
        let price = basePrice;
        const now = Math.floor(Date.now() / 1000);
        for (let i = count - 1; i >= 0; i--) {
            const change = (Math.random() - 0.48) * (basePrice * 0.02);
            const open = price;
            price = Math.max(basePrice * 0.5, price + change);
            const close = price;
            const high = Math.max(open, close) + Math.random() * (basePrice * 0.01);
            const low = Math.min(open, close) - Math.random() * (basePrice * 0.01);
            candles.push({
                time: now - i * 3600,
                open, high, low, close,
                volume: Math.floor(1000000 + Math.random() * 5000000)
            });
        }
        return candles;
    }
};

// ============ Sentiment Analyzer ============
const SentimentAnalyzer = {
    BULLISH: ['surge', 'soar', 'rally', 'bull', 'bullish', 'gain', 'gains', 'rises', 'rising',
        'jumps', 'jump', 'spikes', 'spike', 'climbs', 'climb', 'hits high', 'all-time high',
        'ath', 'breakout', 'momentum', 'buy', 'buying', 'accumulate', 'uptrend', 'positive',
        'optimistic', 'profit', 'boom', 'strong', 'outperform', 'record', 'breakthrough',
        'adoption', 'institutional', 'upgrade', 'growth', 'recover', 'recovery', 'rebound'],

    BEARISH: ['crash', 'plunge', 'fall', 'falling', 'drop', 'drops', 'decline', 'bear', 'bearish',
        'sell', 'selling', 'selloff', 'dump', 'tank', 'collapse', 'slump', 'tumble', 'sink',
        'downtrend', 'negative', 'pessimistic', 'loss', 'losses', 'risk', 'risky', 'danger',
        'warning', 'warn', 'caution', 'concern', 'worried', 'fear', 'panic', 'volatile'],

    analyze(text) {
        const lower = text.toLowerCase();
        let bullish = 0, bearish = 0;
        this.BULLISH.forEach(k => { if (lower.includes(k)) bullish++; });
        this.BEARISH.forEach(k => { if (lower.includes(k)) bearish++; });
        if (bullish > bearish) return 'bullish';
        if (bearish > bullish) return 'bearish';
        return 'neutral';
    }
};

// ============ Finnhub API Manager ============
class FinnhubAPI {
    constructor() {
        this.cache = new Map();
        this.lastQuotes = new Map();
        this.pollInterval = null;
    }

    startPolling(symbols, callback) {
        this.stopPolling();

        const fetchAll = async () => {
            for (const sym of symbols) {
                const quote = await this.getQuote(sym.symbol);
                if (quote && quote.c) {
                    this.lastQuotes.set(sym.symbol, quote);
                    callback(sym.symbol, quote);
                }
            }
        };

        fetchAll();
        this.pollInterval = setInterval(fetchAll, CONFIG.REFRESH_INTERVAL);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async fetch(endpoint, params = {}) {
        if (CONFIG.DEMO_MODE || !CONFIG.FINNHUB_API_KEY) return null;

        const url = new URL(`${CONFIG.FINNHUB_REST_URL}${endpoint}`);
        params.token = CONFIG.FINNHUB_API_KEY;
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

        const cacheKey = url.toString();
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.time < 5000) return cached.data;

        try {
            const res = await fetch(url);

            if (res.status === 401) {
                console.warn('Finnhub API 401 - Invalid key. Using demo mode.');
                CONFIG.DEMO_MODE = true;
                this.updateConnectionStatus('Demo Mode', true);
                return null;
            }

            if (res.status === 429) {
                console.warn('Finnhub rate limit hit. Slowing down...');
                return null;
            }

            const data = await res.json();
            this.cache.set(cacheKey, { data, time: Date.now() });
            return data;
        } catch (e) {
            console.error('API Error:', e);
            return null;
        }
    }

    async getQuote(symbol) {
        const data = await this.fetch('/quote', { symbol });
        if (data && data.c) {
            this.updateConnectionStatus('Connected', true);
            return data;
        }
        // Fallback to demo data
        const demoQuote = DEMO_DATA.quotes[symbol];
        if (demoQuote) {
            this.updateConnectionStatus('Demo Mode', true);
            // Add slight variation for realism
            return {
                ...demoQuote,
                c: demoQuote.c * (1 + (Math.random() - 0.5) * 0.002)
            };
        }
        return null;
    }

    async getProfile(symbol) {
        const data = await this.fetch('/stock/profile2', { symbol });
        if (data && data.name) return data;
        return DEMO_DATA.profiles[symbol] || { name: symbol, marketCapitalization: 0 };
    }

    async getCandles(symbol, resolution, from, to) {
        const data = await this.fetch('/stock/candle', { symbol, resolution, from, to });
        if (data && data.s === 'ok') return data;

        const basePrice = DEMO_DATA.quotes[symbol]?.c || 150;
        const candles = DEMO_DATA.generateCandles(basePrice, 100);
        return {
            s: 'ok',
            t: candles.map(c => c.time),
            o: candles.map(c => c.open),
            h: candles.map(c => c.high),
            l: candles.map(c => c.low),
            c: candles.map(c => c.close),
            v: candles.map(c => c.volume)
        };
    }

    async getNews(category = 'general') {
        return this.fetch('/news', { category });
    }

    updateConnectionStatus(text, connected) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.querySelector('.status-text').textContent = text;
            statusEl.classList.toggle('connected', connected);
        }
    }
}

// ============ Chart Manager (Lightweight Charts) ============
class ChartManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.chart = null;
        this.series = null;
        this.volumeSeries = null;
        this.indicators = {};
        this.chartType = 'candlestick';
    }

    init() {
        if (!this.container) return;

        this.chart = LightweightCharts.createChart(this.container, {
            width: this.container.clientWidth,
            height: this.container.clientHeight || 400,
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)' },
            timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', timeVisible: true }
        });

        this.createSeries();
        window.addEventListener('resize', () => this.resize());
    }

    createSeries() {
        if (this.series) this.chart.removeSeries(this.series);

        if (this.chartType === 'candlestick') {
            this.series = this.chart.addCandlestickSeries({
                upColor: '#00FF88',
                downColor: '#FF4757',
                borderUpColor: '#00FF88',
                borderDownColor: '#FF4757',
                wickUpColor: '#00FF88',
                wickDownColor: '#FF4757'
            });
        } else if (this.chartType === 'line') {
            this.series = this.chart.addLineSeries({
                color: '#FFD700',
                lineWidth: 2
            });
        } else if (this.chartType === 'area') {
            this.series = this.chart.addAreaSeries({
                topColor: 'rgba(255, 215, 0, 0.4)',
                bottomColor: 'rgba(255, 215, 0, 0.0)',
                lineColor: '#FFD700',
                lineWidth: 2
            });
        }
    }

    setChartType(type) {
        this.chartType = type;
        const data = this.currentData || [];
        this.createSeries();
        if (data.length) this.setData(data);
    }

    setData(data) {
        if (!this.series || !data.length) return;
        this.currentData = data;

        const formatted = data.map(d => {
            if (this.chartType === 'candlestick') {
                return { time: d.time, open: d.open, high: d.high, low: d.low, close: d.close };
            }
            return { time: d.time, value: d.close };
        });

        this.series.setData(formatted);
        this.chart.timeScale().fitContent();
    }

    updateLastCandle(quote) {
        if (!this.series || !this.currentData || !this.currentData.length) return;

        const lastCandle = this.currentData[this.currentData.length - 1];
        const updatedCandle = {
            time: lastCandle.time,
            open: lastCandle.open,
            high: Math.max(lastCandle.high, quote.c),
            low: Math.min(lastCandle.low, quote.c),
            close: quote.c
        };

        if (this.chartType === 'candlestick') {
            this.series.update(updatedCandle);
        } else {
            this.series.update({ time: lastCandle.time, value: quote.c });
        }
    }

    addMA(period, color) {
        if (!this.currentData || this.currentData.length < period) return;

        const maData = [];
        for (let i = period - 1; i < this.currentData.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += this.currentData[i - j].close;
            }
            maData.push({ time: this.currentData[i].time, value: sum / period });
        }

        const maSeries = this.chart.addLineSeries({ color, lineWidth: 1 });
        maSeries.setData(maData);
        this.indicators[`ma${period}`] = maSeries;
    }

    clearIndicators() {
        Object.values(this.indicators).forEach(s => this.chart.removeSeries(s));
        this.indicators = {};
    }

    resize() {
        if (this.chart && this.container) {
            this.chart.resize(this.container.clientWidth, this.container.clientHeight);
        }
    }
}

// ============ AI Council Manager ============
class AICouncilManager {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

        try {
            this.ws = new WebSocket(CONFIG.AI_COUNCIL_URL);

            this.ws.onopen = () => {
                console.log('AI Council connected');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.updateStatus(true);
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };

            this.ws.onclose = () => {
                console.log('AI Council disconnected');
                this.connected = false;
                this.updateStatus(false);
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('AI Council error:', error);
            };
        } catch (e) {
            console.error('Failed to connect to AI Council:', e);
            this.updateStatus(false);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), 3000 * this.reconnectAttempts);
        }
    }

    updateStatus(connected) {
        const statusEl = document.getElementById('council-status');
        const aiStatusEl = document.getElementById('ai-connection-status');

        if (statusEl) {
            const indicator = statusEl.querySelector('.status-indicator');
            indicator.className = `status-indicator ${connected ? 'online' : 'offline'}`;
            statusEl.querySelector('span:last-child').textContent =
                connected ? 'AI Council Ready' : 'AI Council Offline';
        }

        if (aiStatusEl) {
            aiStatusEl.classList.toggle('connected', connected);
            aiStatusEl.querySelector('.status-text').textContent =
                connected ? 'AI: Online' : 'AI: Offline';
        }
    }

    handleMessage(data) {
        const chatContainer = document.getElementById('chat-messages');
        if (!chatContainer) return;

        switch (data.type) {
            case 'model_status':
                console.log('Model status:', data.data);
                break;

            case 'council_started':
                this.addSystemMessage(chatContainer, data.message);
                break;

            case 'model_thinking':
                this.addThinkingMessage(chatContainer, data.model_name);
                break;

            case 'model_response':
                this.replaceThinkingWithResponse(chatContainer, data.data);
                break;

            case 'ranking_started':
            case 'synthesis_started':
                this.addSystemMessage(chatContainer, data.message);
                break;

            case 'synthesis_complete':
                this.addSynthesisMessage(chatContainer, data.data);
                break;

            case 'council_complete':
                this.addSystemMessage(chatContainer, data.message, 'success');
                break;

            case 'news_sentiment':
                this.handleNewsSentiment(data.data);
                break;

            case 'error':
                this.addSystemMessage(chatContainer, data.message, 'error');
                break;
        }

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    addSystemMessage(container, message, type = 'info') {
        const msg = document.createElement('div');
        msg.className = `chat-msg system-msg ${type}`;
        msg.innerHTML = `<div class="chat-content system">${message}</div>`;
        container.appendChild(msg);
    }

    addThinkingMessage(container, modelName) {
        const thinkingId = `thinking-${modelName.replace(/\s/g, '-')}`;
        const msg = document.createElement('div');
        msg.className = 'chat-msg thinking';
        msg.id = thinkingId;
        msg.innerHTML = `
            <div class="chat-msg-header">
                <div class="chat-avatar">🤖</div>
                <div><span class="chat-name">${modelName}</span></div>
            </div>
            <div class="chat-content">
                <span class="thinking-dots"><span></span><span></span><span></span></span> Analyzing...
            </div>
        `;
        container.appendChild(msg);
    }

    replaceThinkingWithResponse(container, data) {
        const thinkingId = `thinking-${data.model_name.replace(/\s/g, '-')}`;
        const thinkingEl = document.getElementById(thinkingId);

        const msg = document.createElement('div');
        msg.className = 'chat-msg';
        msg.innerHTML = `
            <div class="chat-msg-header">
                <div class="chat-avatar" style="background:${data.color || '#4ECDC4'}">
                    ${data.model_name.substring(0, 2)}
                </div>
                <div>
                    <span class="chat-name">${data.model_name}</span>
                    <span class="chat-specialty">${data.specialty || ''}</span>
                </div>
            </div>
            <div class="chat-content" style="border-color:${data.color || '#4ECDC4'}">
                ${this.formatResponse(data.response)}
            </div>
        `;

        if (thinkingEl) {
            thinkingEl.replaceWith(msg);
        } else {
            container.appendChild(msg);
        }
    }

    addSynthesisMessage(container, synthesis) {
        const msg = document.createElement('div');
        msg.className = 'chat-msg synthesis';
        msg.innerHTML = `
            <div class="chat-msg-header">
                <div class="chat-avatar" style="background:#FFD700">🏆</div>
                <div>
                    <span class="chat-name">Council Synthesis</span>
                    <span class="chat-specialty">Final Recommendation</span>
                </div>
            </div>
            <div class="chat-content" style="border-color:#FFD700; background: rgba(255,215,0,0.05);">
                ${this.formatResponse(synthesis)}
            </div>
        `;
        container.appendChild(msg);
    }

    formatResponse(text) {
        if (!text) return '';
        return text
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    askCouncil(question) {
        if (!this.connected) {
            this.addSystemMessage(
                document.getElementById('chat-messages'),
                'AI Council is not connected. Please start the server.',
                'error'
            );
            return;
        }

        // Clear welcome message if present
        const welcome = document.querySelector('.welcome-msg');
        if (welcome) welcome.remove();

        // Add user message
        const chatContainer = document.getElementById('chat-messages');
        const userMsg = document.createElement('div');
        userMsg.className = 'chat-msg user-msg';
        userMsg.innerHTML = `
            <div class="chat-content" style="border-color: #888; background: var(--bg-secondary);">
                <strong>You:</strong> ${this.escapeHtml(question)}
            </div>
        `;
        chatContainer.appendChild(userMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Send to council
        this.ws.send(JSON.stringify({
            action: 'start_council',
            question: question
        }));
    }

    getNewsSentiment(topic) {
        if (!this.connected) return;
        this.ws.send(JSON.stringify({
            action: 'get_news_sentiment',
            topic: topic
        }));
    }

    handleNewsSentiment(data) {
        if (!data) return;

        document.getElementById('bullish-pct').textContent = `${data.agree_pct || 0}%`;
        document.getElementById('bearish-pct').textContent = `${data.disagree_pct || 0}%`;
        document.getElementById('neutral-pct').textContent = `${data.neutral_pct || 0}%`;

        const fillPos = (data.agree_pct || 50);
        document.getElementById('sentiment-fill').style.left = `${fillPos - 8}%`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ============ Watchlist Manager ============
class WatchlistManager {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('watchlist') || '["AAPL", "NVDA", "BINANCE:BTCUSDT"]');
    }

    save() {
        localStorage.setItem('watchlist', JSON.stringify(this.items));
    }

    add(symbol) {
        if (!this.items.includes(symbol)) {
            this.items.push(symbol);
            this.save();
            return true;
        }
        return false;
    }

    remove(symbol) {
        this.items = this.items.filter(s => s !== symbol);
        this.save();
    }

    has(symbol) {
        return this.items.includes(symbol);
    }
}

// ============ Alerts Manager ============
class AlertsManager {
    constructor() {
        this.alerts = JSON.parse(localStorage.getItem('price_alerts') || '[]');
    }

    save() {
        localStorage.setItem('price_alerts', JSON.stringify(this.alerts));
    }

    add(symbol, condition, price) {
        this.alerts.push({
            id: Date.now(),
            symbol,
            condition,
            price,
            triggered: false,
            createdAt: new Date().toISOString()
        });
        this.save();
    }

    remove(id) {
        this.alerts = this.alerts.filter(a => a.id !== id);
        this.save();
    }

    check(symbol, currentPrice) {
        this.alerts.forEach(alert => {
            if (alert.symbol === symbol && !alert.triggered) {
                const triggered =
                    (alert.condition === 'above' && currentPrice >= alert.price) ||
                    (alert.condition === 'below' && currentPrice <= alert.price);

                if (triggered) {
                    alert.triggered = true;
                    this.showNotification(alert, currentPrice);
                    this.save();
                }
            }
        });
    }

    showNotification(alert, currentPrice) {
        if (Notification.permission === 'granted') {
            new Notification(`🔔 Price Alert: ${alert.symbol}`, {
                body: `Price is now $${currentPrice.toFixed(2)} (${alert.condition} $${alert.price})`
            });
        }

        // Also show in-app notification
        const alertsContainer = document.getElementById('alerts-list');
        if (alertsContainer) {
            const notification = document.createElement('div');
            notification.className = 'alert-notification triggered';
            notification.innerHTML = `
                <span class="alert-icon">🔔</span>
                <div class="alert-info">
                    <strong>${alert.symbol}</strong> reached $${currentPrice.toFixed(2)}
                    <span class="alert-time">Just now</span>
                </div>
            `;
            alertsContainer.prepend(notification);
        }
    }
}

// ============ News Manager ============
class NewsManager {
    constructor(api) {
        this.api = api;
    }

    async fetchNews(topic = 'stocks') {
        const container = document.getElementById('news-list');
        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const news = await this.api.getNews('general');
            if (news && news.length) {
                this.renderNews(news.slice(0, 20));
                return;
            }
        } catch (e) {
            console.error('News fetch error:', e);
        }

        container.innerHTML = '<p class="empty-msg">Unable to fetch news. Check API key.</p>';
    }

    renderNews(articles) {
        const container = document.getElementById('news-list');
        let bullish = 0, bearish = 0, neutral = 0;

        const html = articles.map(a => {
            const sentiment = SentimentAnalyzer.analyze(a.headline || a.title || '');
            if (sentiment === 'bullish') bullish++;
            else if (sentiment === 'bearish') bearish++;
            else neutral++;

            return `
                <div class="news-item" onclick="window.open('${a.url}', '_blank')">
                    <span class="news-sentiment ${sentiment}">
                        ${sentiment === 'bullish' ? '🐂' : sentiment === 'bearish' ? '🐻' : '⚖️'}
                    </span>
                    <div>
                        <div class="news-title">${a.headline || a.title}</div>
                        <div class="news-source">${a.source} • ${new Date(a.datetime * 1000).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html || '<p class="empty-msg">No news available.</p>';

        // Update sentiment summary
        const total = bullish + bearish + neutral;
        if (total > 0) {
            document.getElementById('bullish-pct').textContent = `${Math.round(bullish / total * 100)}%`;
            document.getElementById('bearish-pct').textContent = `${Math.round(bearish / total * 100)}%`;
            document.getElementById('neutral-pct').textContent = `${Math.round(neutral / total * 100)}%`;

            const fillPos = (bullish / total) * 100;
            document.getElementById('sentiment-fill').style.left = `${fillPos - 8}%`;
        }
    }
}

// ============ Main Application ============
class StockExchangeApp {
    constructor() {
        this.api = new FinnhubAPI();
        this.chart = new ChartManager('main-chart');
        this.watchlist = new WatchlistManager();
        this.alerts = new AlertsManager();
        this.aiCouncil = new AICouncilManager();
        this.news = new NewsManager(this.api);

        this.currentSymbol = CONFIG.DEFAULT_SYMBOL;
        this.currentCategory = 'stocks';
        this.currentPrice = 0;
        this.currentQuote = {};

        this.init();
    }

    async init() {
        // Check API key
        if (!CONFIG.FINNHUB_API_KEY) {
            document.getElementById('api-modal').style.display = 'flex';
        }

        this.bindEvents();
        this.chart.init();
        this.aiCouncil.connect();

        // Request notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Load initial data
        this.renderMarkets(this.currentCategory);
        await this.loadSymbol(this.currentSymbol);
        this.renderWatchlist();
        this.news.fetchNews();

        // Start polling for market data
        this.startMarketPolling();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        // Market category tabs
        document.querySelectorAll('.market-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.market-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderMarkets(btn.dataset.category);
            });
        });

        // Stock search
        const searchInput = document.getElementById('stock-search');
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        searchInput.addEventListener('focus', () => {
            if (searchInput.value) this.handleSearch(searchInput.value);
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                document.getElementById('search-results').classList.remove('active');
            }
        });

        // Chart controls
        document.querySelectorAll('.tf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadChart(btn.dataset.tf);
            });
        });

        document.querySelectorAll('.ct-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ct-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.chart.setChartType(btn.dataset.type);
            });
        });

        document.querySelectorAll('.ind-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                this.toggleIndicator(btn.dataset.indicator, btn.classList.contains('active'));
            });
        });

        // Watchlist
        document.getElementById('watchlist-btn').addEventListener('click', () => this.toggleWatchlist());
        document.getElementById('add-watchlist')?.addEventListener('click', () => this.promptAddWatchlist());
        document.getElementById('add-first-stock')?.addEventListener('click', () => this.promptAddWatchlist());

        // AI Council
        document.getElementById('ask-council').addEventListener('click', () => this.askAI());
        document.getElementById('ai-question').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.askAI();
        });
        document.querySelectorAll('.qa-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const questions = {
                    invest: `Is now a good time to invest in ${this.currentSymbol}? Analyze the current market conditions.`,
                    risk: `What are the main risks of investing in ${this.currentSymbol} right now?`,
                    target: `What is your price prediction for ${this.currentSymbol} in the next month?`,
                    analysis: `Provide a comprehensive trading analysis for ${this.currentSymbol}.`
                };
                document.getElementById('ai-question').value = questions[btn.dataset.question];
                this.askAI();
            });
        });

        document.getElementById('ai-analyze-btn')?.addEventListener('click', () => {
            document.getElementById('ai-question').value =
                `Should I invest in ${this.currentSymbol} at $${this.currentPrice.toFixed(2)}? Analyze the opportunity.`;
            this.askAI();
        });

        // Panel minimize buttons
        document.querySelectorAll('.minimize-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.closest('.panel, .collapsible');
                panel.classList.toggle('minimized');
                btn.textContent = panel.classList.contains('minimized') ? '+' : '−';
            });
        });

        // AI Panel toggle for minimized state
        document.getElementById('ai-toggle').addEventListener('click', () => {
            document.getElementById('ai-panel').classList.remove('minimized');
        });
        document.getElementById('minimize-ai').addEventListener('click', () => {
            document.getElementById('ai-panel').classList.toggle('minimized');
        });

        // News
        document.getElementById('refresh-news').addEventListener('click', () => {
            this.news.fetchNews(document.getElementById('news-topic').value);
        });

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => {
            document.getElementById('settings-finnhub-key').value = CONFIG.FINNHUB_API_KEY;
            document.getElementById('settings-council-url').value = CONFIG.AI_COUNCIL_URL;
            document.getElementById('settings-modal').style.display = 'flex';
        });
        document.getElementById('close-settings').addEventListener('click', () => {
            document.getElementById('settings-modal').style.display = 'none';
        });
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());

        // API modal
        document.getElementById('save-api-key').addEventListener('click', () => {
            const key = document.getElementById('finnhub-key-input').value.trim();
            if (key) {
                localStorage.setItem('finnhub_key', key);
                CONFIG.FINNHUB_API_KEY = key;
                document.getElementById('api-modal').style.display = 'none';
                this.startMarketPolling();
            }
        });

        // Alerts
        document.getElementById('add-alert-btn')?.addEventListener('click', () => {
            document.getElementById('alert-symbol').value = this.currentSymbol;
            document.getElementById('alert-modal').style.display = 'flex';
        });
        document.getElementById('close-alert-modal')?.addEventListener('click', () => {
            document.getElementById('alert-modal').style.display = 'none';
        });
        document.getElementById('cancel-alert')?.addEventListener('click', () => {
            document.getElementById('alert-modal').style.display = 'none';
        });
        document.getElementById('confirm-alert')?.addEventListener('click', () => this.createAlert());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('stock-search').focus();
            }
            if (e.key === 'Escape') {
                document.getElementById('settings-modal').style.display = 'none';
                document.getElementById('alert-modal').style.display = 'none';
            }
        });
    }

    renderMarkets(category) {
        this.currentCategory = category;
        const container = document.getElementById('indices-grid');
        const markets = MARKETS[category] || [];

        container.innerHTML = markets.map(m => `
            <div class="index-card ${m.symbol === this.currentSymbol ? 'active' : ''}" 
                 data-symbol="${m.symbol}" 
                 onclick="app.loadSymbol('${m.symbol}')">
                <span class="index-name">${m.display}</span>
                <span class="index-value" id="price-${m.symbol.replace(/[^a-zA-Z0-9]/g, '-')}">--</span>
                <span class="index-change" id="change-${m.symbol.replace(/[^a-zA-Z0-9]/g, '-')}">--</span>
            </div>
        `).join('');
    }

    startMarketPolling() {
        // Poll all market symbols
        this.api.startPolling(ALL_SYMBOLS, (symbol, quote) => {
            this.updateMarketCard(symbol, quote);

            // Update current symbol display if matches
            if (symbol === this.currentSymbol) {
                this.updatePrice(quote);
            }

            // Check alerts
            this.alerts.check(symbol, quote.c);
        });
    }

    updateMarketCard(symbol, quote) {
        const safeId = symbol.replace(/[^a-zA-Z0-9]/g, '-');
        const priceEl = document.getElementById(`price-${safeId}`);
        const changeEl = document.getElementById(`change-${safeId}`);

        if (priceEl && quote.c) {
            // Format price based on value
            const price = quote.c;
            let formattedPrice;
            if (price > 1000) {
                formattedPrice = `$${price.toFixed(0)}`;
            } else if (price > 10) {
                formattedPrice = `$${price.toFixed(2)}`;
            } else {
                formattedPrice = `$${price.toFixed(4)}`;
            }
            priceEl.textContent = formattedPrice;
        }

        if (changeEl && quote.dp !== undefined) {
            const change = quote.dp;
            changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            changeEl.className = `index-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
    }

    handleSearch(query) {
        if (!query || query.length < 1) {
            document.getElementById('search-results').classList.remove('active');
            return;
        }

        const results = ALL_SYMBOLS.filter(m =>
            m.display.toLowerCase().includes(query.toLowerCase()) ||
            m.name.toLowerCase().includes(query.toLowerCase()) ||
            m.symbol.toLowerCase().includes(query.toLowerCase())
        );

        const container = document.getElementById('search-results');

        if (results.length) {
            container.innerHTML = results.slice(0, 8).map(r => `
                <div class="search-result-item" data-symbol="${r.symbol}">
                    <div>
                        <strong>${r.display}</strong>
                        <span style="color:var(--text-muted);font-size:0.8rem;margin-left:8px;">${r.name}</span>
                    </div>
                    <span style="color:var(--text-muted);font-size:0.75rem;">${r.type}</span>
                </div>
            `).join('');

            container.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.loadSymbol(item.dataset.symbol);
                    container.classList.remove('active');
                    document.getElementById('stock-search').value = '';
                });
            });

            container.classList.add('active');
        } else {
            container.classList.remove('active');
        }
    }

    async loadSymbol(symbol) {
        this.currentSymbol = symbol;

        // Find market info
        const marketInfo = ALL_SYMBOLS.find(m => m.symbol === symbol);

        document.getElementById('current-symbol').textContent = marketInfo?.display || symbol;
        document.getElementById('current-name').textContent = marketInfo?.name || symbol;

        // Update active state in market cards
        document.querySelectorAll('.index-card').forEach(card => {
            card.classList.toggle('active', card.dataset.symbol === symbol);
        });

        // Get quote
        const quote = await this.api.getQuote(symbol);
        if (quote) {
            this.currentQuote = quote;
            this.currentPrice = quote.c;
            this.updatePrice(quote);
        }

        // Get profile for stocks
        if (marketInfo?.type === 'stock') {
            const profile = await this.api.getProfile(symbol);
            if (profile) {
                document.getElementById('stat-mktcap').textContent = profile.marketCapitalization
                    ? `$${(profile.marketCapitalization / 1000).toFixed(1)}B` : '--';
            }
        }

        // Update watchlist button
        document.getElementById('watchlist-btn').textContent =
            this.watchlist.has(symbol) ? '★ Watched' : '☆ Watch';

        // Load chart
        await this.loadChart('1W');
    }

    async loadChart(timeframe) {
        const now = Math.floor(Date.now() / 1000);
        let from, resolution;

        switch (timeframe) {
            case '1D': from = now - 86400; resolution = '5'; break;
            case '1W': from = now - 604800; resolution = '15'; break;
            case '1M': from = now - 2592000; resolution = '60'; break;
            case '3M': from = now - 7776000; resolution = 'D'; break;
            case '1Y': from = now - 31536000; resolution = 'D'; break;
            case '5Y': from = now - 157680000; resolution = 'W'; break;
            default: from = now - 604800; resolution = '15';
        }

        const candles = await this.api.getCandles(this.currentSymbol, resolution, from, now);

        if (candles && candles.s === 'ok' && candles.t) {
            const data = candles.t.map((t, i) => ({
                time: t,
                open: candles.o[i],
                high: candles.h[i],
                low: candles.l[i],
                close: candles.c[i],
                volume: candles.v[i]
            }));
            this.chart.setData(data);
        }
    }

    updatePrice(quote) {
        if (!quote || !quote.c) return;

        this.currentPrice = quote.c;
        const prevClose = quote.pc || quote.c;
        const change = quote.c - prevClose;
        const changePct = (change / prevClose) * 100;

        // Format price based on value
        let formattedPrice;
        if (quote.c > 1000) {
            formattedPrice = `$${quote.c.toFixed(0)}`;
        } else if (quote.c > 10) {
            formattedPrice = `$${quote.c.toFixed(2)}`;
        } else {
            formattedPrice = `$${quote.c.toFixed(4)}`;
        }

        document.getElementById('current-price').textContent = formattedPrice;

        const changeEl = document.getElementById('price-change');
        changeEl.textContent = `${change >= 0 ? '+' : ''}$${Math.abs(change).toFixed(2)} (${change >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`;
        changeEl.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;

        // Update stats
        if (quote.o) document.getElementById('stat-open').textContent = `$${quote.o.toFixed(2)}`;
        if (quote.h) document.getElementById('stat-high').textContent = `$${quote.h.toFixed(2)}`;
        if (quote.l) document.getElementById('stat-low').textContent = `$${quote.l.toFixed(2)}`;

        // Update chart with live data
        this.chart.updateLastCandle(quote);

        // Flash the refresh indicator
        const refreshIndicator = document.getElementById('refresh-indicator');
        refreshIndicator.classList.add('active');
        setTimeout(() => refreshIndicator.classList.remove('active'), 300);
    }

    toggleIndicator(indicator, active) {
        if (!active) {
            this.chart.clearIndicators();
            return;
        }

        switch (indicator) {
            case 'sma':
                this.chart.addMA(20, '#FFD700');
                this.chart.addMA(50, '#00D4FF');
                break;
        }
    }

    switchView(view) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');

        // Hide all views
        document.querySelector('.main-content').style.display = view === 'dashboard' ? 'grid' : 'none';
        document.getElementById('news-panel').style.display = view === 'dashboard' ? 'flex' : 'none';
        document.getElementById('alerts-view').style.display = view === 'alerts' ? 'block' : 'none';

        if (view === 'alerts') {
            this.renderAlerts();
        }

        if (view === 'news') {
            // Show full news view
            document.querySelector('.main-content').style.display = 'none';
            document.getElementById('news-panel').style.display = 'flex';
            document.getElementById('news-panel').classList.add('fullscreen');
        } else {
            document.getElementById('news-panel').classList.remove('fullscreen');
        }
    }

    renderWatchlist() {
        const container = document.getElementById('watchlist-container');

        if (!this.watchlist.items.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>📋</span>
                    <p>No items in watchlist</p>
                    <button class="btn btn-small" id="add-first-stock">Add Symbol</button>
                </div>`;
            document.getElementById('add-first-stock')?.addEventListener('click', () => this.promptAddWatchlist());
            return;
        }

        container.innerHTML = this.watchlist.items.map(symbol => {
            const marketInfo = ALL_SYMBOLS.find(m => m.symbol === symbol);
            return `
                <div class="watchlist-item" data-symbol="${symbol}">
                    <div>
                        <div class="symbol">${marketInfo?.display || symbol}</div>
                        <div class="name">${marketInfo?.name || '--'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="price" id="wl-price-${symbol.replace(/[^a-zA-Z0-9]/g, '-')}">--</div>
                        <div class="change" id="wl-change-${symbol.replace(/[^a-zA-Z0-9]/g, '-')}">--</div>
                    </div>
                    <button class="remove-btn" onclick="event.stopPropagation();app.removeFromWatchlist('${symbol}')">×</button>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.watchlist-item').forEach(item => {
            item.addEventListener('click', () => this.loadSymbol(item.dataset.symbol));

            // Fetch quote
            this.api.getQuote(item.dataset.symbol).then(q => {
                if (q) {
                    const safeId = item.dataset.symbol.replace(/[^a-zA-Z0-9]/g, '-');
                    const priceEl = document.getElementById(`wl-price-${safeId}`);
                    const changeEl = document.getElementById(`wl-change-${safeId}`);

                    if (priceEl) priceEl.textContent = `$${q.c?.toFixed(2) || '--'}`;
                    if (changeEl) {
                        const change = q.dp || 0;
                        changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                        changeEl.className = `change ${change >= 0 ? 'positive' : 'negative'}`;
                    }
                }
            });
        });
    }

    promptAddWatchlist() {
        const symbol = prompt('Enter symbol to watch (e.g., AAPL, BINANCE:BTCUSDT):');
        if (symbol) {
            this.addToWatchlist(symbol.toUpperCase());
        }
    }

    addToWatchlist(symbol) {
        if (this.watchlist.add(symbol)) {
            this.renderWatchlist();
        }
    }

    removeFromWatchlist(symbol) {
        this.watchlist.remove(symbol);
        this.renderWatchlist();
    }

    toggleWatchlist() {
        if (this.watchlist.has(this.currentSymbol)) {
            this.watchlist.remove(this.currentSymbol);
            document.getElementById('watchlist-btn').textContent = '☆ Watch';
        } else {
            this.watchlist.add(this.currentSymbol);
            document.getElementById('watchlist-btn').textContent = '★ Watched';
        }
        this.renderWatchlist();
    }

    renderAlerts() {
        const container = document.getElementById('alerts-list');

        if (!this.alerts.alerts.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>🔔</span>
                    <p>No alerts configured</p>
                    <p class="hint">Create alerts to get notified when prices reach your targets</p>
                </div>`;
            return;
        }

        container.innerHTML = this.alerts.alerts.map(alert => {
            const marketInfo = ALL_SYMBOLS.find(m => m.symbol === alert.symbol);
            return `
                <div class="alert-item ${alert.triggered ? 'triggered' : ''}">
                    <div class="alert-info">
                        <strong>${marketInfo?.display || alert.symbol}</strong>
                        <span>Price goes ${alert.condition} $${alert.price}</span>
                    </div>
                    <div class="alert-status">
                        ${alert.triggered ? '✅ Triggered' : '⏳ Active'}
                    </div>
                    <button class="remove-btn" onclick="app.removeAlert(${alert.id})">×</button>
                </div>
            `;
        }).join('');
    }

    createAlert() {
        const symbol = document.getElementById('alert-symbol').value.toUpperCase();
        const condition = document.getElementById('alert-condition').value;
        const price = parseFloat(document.getElementById('alert-price').value);

        if (symbol && condition && price) {
            this.alerts.add(symbol, condition, price);
            document.getElementById('alert-modal').style.display = 'none';
            this.renderAlerts();
        }
    }

    removeAlert(id) {
        this.alerts.remove(id);
        this.renderAlerts();
    }

    askAI() {
        const input = document.getElementById('ai-question');
        const question = input.value.trim();
        if (!question) return;

        input.value = '';
        this.aiCouncil.askCouncil(question);
    }

    saveSettings() {
        const finnhubKey = document.getElementById('settings-finnhub-key').value.trim();
        const councilUrl = document.getElementById('settings-council-url').value.trim();
        const refreshInterval = document.getElementById('settings-refresh-interval').value;

        if (finnhubKey) {
            localStorage.setItem('finnhub_key', finnhubKey);
            CONFIG.FINNHUB_API_KEY = finnhubKey;
        }
        if (councilUrl) {
            localStorage.setItem('council_url', councilUrl);
            CONFIG.AI_COUNCIL_URL = councilUrl;
        }
        if (refreshInterval) {
            localStorage.setItem('refresh_interval', refreshInterval * 1000);
            CONFIG.REFRESH_INTERVAL = parseInt(refreshInterval) * 1000;
        }

        document.getElementById('settings-modal').style.display = 'none';

        // Restart polling with new settings
        this.startMarketPolling();

        // Reconnect AI Council if URL changed
        this.aiCouncil.connect();

        alert('Settings saved!');
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new StockExchangeApp();
});
