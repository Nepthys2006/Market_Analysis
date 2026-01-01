"""
Stock Exchange Pro - AI Trading Council Server
==============================================
A FastAPI server that:
1. Serves the Stock Exchange Pro frontend
2. Provides AI Trading Council via WebSocket
3. Fetches news sentiment analysis

Run with: python server.py
Or: uvicorn server:app --reload --host 0.0.0.0 --port 8000
"""

import asyncio
import json
import httpx
import requests
import xml.etree.ElementTree as ET
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
from datetime import datetime
import random
import os

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="Stock Exchange Pro - AI Trading Council")

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ======== News Sentiment Analysis ========
class SentimentAnalyzer:
    BULLISH_KEYWORDS = [
        'surge', 'soar', 'rally', 'bull', 'bullish', 'gain', 'gains', 'rises', 'rising',
        'jumps', 'jump', 'spikes', 'spike', 'climbs', 'climb', 'hits high', 'all-time high',
        'ath', 'breakout', 'momentum', 'buy', 'buying', 'accumulate', 'accumulation',
        'uptrend', 'positive', 'optimistic', 'optimism', 'profit', 'profits', 'profitable',
        'boom', 'booming', 'explode', 'explodes', 'moon', 'mooning', 'pump', 'pumping',
        'strong', 'strength', 'outperform', 'outperforms', 'record', 'breakthrough',
        'adoption', 'institutional', 'etf approved', 'approval', 'upgrade', 'upgraded',
        'support', 'demand', 'growth', 'growing', 'recover', 'recovery', 'rebound'
    ]
    
    BEARISH_KEYWORDS = [
        'crash', 'crashes', 'plunge', 'plunges', 'fall', 'falls', 'falling', 'drop',
        'drops', 'dropping', 'decline', 'declines', 'declining', 'bear', 'bearish',
        'sell', 'selling', 'selloff', 'sell-off', 'dump', 'dumping', 'tank', 'tanks',
        'collapse', 'collapses', 'slump', 'slumps', 'tumble', 'tumbles', 'sink', 'sinks',
        'downtrend', 'negative', 'pessimistic', 'pessimism', 'loss', 'losses', 'lost',
        'risk', 'risky', 'danger', 'dangerous', 'warning', 'warn', 'warns', 'caution',
        'concern', 'concerns', 'worried', 'worry', 'fear', 'fears', 'panic', 'volatile'
    ]
    
    def analyze(self, text):
        text_lower = text.lower()
        bullish_score = 0
        bearish_score = 0
        
        for keyword in self.BULLISH_KEYWORDS:
            if keyword in text_lower:
                bullish_score += 1
                
        for keyword in self.BEARISH_KEYWORDS:
            if keyword in text_lower:
                bearish_score += 1
        
        if bullish_score > bearish_score:
            return 'bullish'
        elif bearish_score > bullish_score:
            return 'bearish'
        else:
            return 'neutral'


class NewsAgent:
    def __init__(self, topic="Bitcoin"):
        self.topic = topic
        self.base_url = "https://news.google.com/rss/search"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        self.sentiment_analyzer = SentimentAnalyzer()

    def fetch_news(self, days_ago=1, max_articles=100):
        time_query = f"when:{days_ago}d"
        full_query = f"{self.topic} {time_query}"
        
        params = {
            'q': full_query,
            'hl': 'en-US',
            'gl': 'US',
            'ceid': 'US:en'
        }

        try:
            response = requests.get(self.base_url, params=params, headers=self.headers, timeout=15)
            response.raise_for_status()
            articles = self._parse_xml(response.content)
            return articles[:max_articles]
        except Exception as e:
            print(f"News fetch error: {e}")
            return []

    def _parse_xml(self, xml_content):
        articles = []
        try:
            root = ET.fromstring(xml_content)
            for item in root.findall('./channel/item'):
                title = item.find('title').text if item.find('title') is not None else "No Title"
                link = item.find('link').text if item.find('link') is not None else "No Link"
                pub_date = item.find('pubDate').text if item.find('pubDate') is not None else "Unknown Date"
                source = item.find('source').text if item.find('source') is not None else "Unknown Source"
                articles.append({
                    'title': title,
                    'link': link,
                    'pub_date': pub_date,
                    'source': source
                })
        except ET.ParseError:
            pass
        return articles

    def analyze_sentiment(self, articles):
        results = {
            'total': len(articles),
            'agree': 0,
            'disagree': 0,
            'neutral': 0,
            'articles': []
        }
        
        for article in articles:
            sentiment = self.sentiment_analyzer.analyze(article['title'])
            
            if sentiment == 'bullish':
                results['agree'] += 1
                vote = 'AGREE'
            elif sentiment == 'bearish':
                results['disagree'] += 1
                vote = 'DISAGREE'
            else:
                results['neutral'] += 1
                vote = 'NEUTRAL'
            
            results['articles'].append({
                **article,
                'sentiment': sentiment,
                'vote': vote
            })
        
        return results

    def get_sentiment_summary(self):
        articles = self.fetch_news(days_ago=1, max_articles=100)
        if not articles:
            return None
        
        results = self.analyze_sentiment(articles)
        total = results['total']
        agree = results['agree']
        disagree = results['disagree']
        neutral = results['neutral']
        
        if total == 0:
            return None
        
        agree_pct = (agree / total) * 100
        disagree_pct = (disagree / total) * 100
        neutral_pct = (neutral / total) * 100
        
        if agree > disagree:
            recommendation = 'BULLISH'
            confidence = (agree - disagree) / total * 100
        elif disagree > agree:
            recommendation = 'BEARISH'
            confidence = (disagree - agree) / total * 100
        else:
            recommendation = 'NEUTRAL'
            confidence = 0
        
        return {
            'topic': self.topic,
            'date': datetime.now().strftime("%d/%m/%Y"),
            'total': total,
            'agree': agree,
            'disagree': disagree,
            'neutral': neutral,
            'agree_pct': round(agree_pct, 1),
            'disagree_pct': round(disagree_pct, 1),
            'neutral_pct': round(neutral_pct, 1),
            'recommendation': recommendation,
            'confidence': round(confidence, 1),
            'top_articles': results['articles'][:10]
        }


# ======== In-Memory Conversation Database ========
class ConversationDatabase:
    def __init__(self, max_history: int = 50):
        self.conversations: List[Dict] = []
        self.max_history = max_history
    
    def add_conversation(self, question: str, responses: List[Dict], synthesis: str, rankings: List[Dict] = None):
        entry = {
            "id": len(self.conversations) + 1,
            "timestamp": datetime.now().isoformat(),
            "question": question,
            "responses": [
                {
                    "model_name": r.get("model_name", "Unknown"),
                    "specialty": r.get("specialty", "Unknown"),
                    "response": r.get("response", "")[:500]
                }
                for r in responses
            ],
            "synthesis": synthesis[:1000] if synthesis else "",
            "rankings": rankings or []
        }
        self.conversations.append(entry)
        
        if len(self.conversations) > self.max_history:
            self.conversations = self.conversations[-self.max_history:]
    
    def get_context_summary(self, max_entries: int = 5) -> str:
        if not self.conversations:
            return ""
        
        recent = self.conversations[-max_entries:]
        context_parts = ["=== PREVIOUS COUNCIL DISCUSSIONS ===\n"]
        
        for conv in recent:
            context_parts.append(f"\n[Session #{conv['id']}]")
            context_parts.append(f"USER QUESTION: {conv['question']}")
            context_parts.append(f"SYNTHESIS: {conv['synthesis'][:200]}...")
        
        return "\n".join(context_parts)
    
    def get_all_conversations(self) -> List[Dict]:
        return self.conversations
    
    def get_conversation_count(self) -> int:
        return len(self.conversations)
    
    def clear_history(self):
        self.conversations = []


conversation_db = ConversationDatabase()

# Ollama API endpoint
OLLAMA_BASE_URL = "http://localhost:11434"

# AI Council Members - Each model with a persona
AI_COUNCIL = [
    {"id": "nemotron-3-nano:30b-cloud", "name": "Nemotron", "color": "#FF6B6B", "specialty": "Technical Analysis"},
    {"id": "deepseek-v3.2:cloud", "name": "DeepSeek V3.2", "color": "#4ECDC4", "specialty": "Market Sentiment"},
    {"id": "minimax-m2:cloud", "name": "MiniMax M2", "color": "#45B7D1", "specialty": "Risk Management"},
    {"id": "gemini-3-pro-preview:latest", "name": "Gemini Pro", "color": "#96CEB4", "specialty": "Macro Economics"},
    {"id": "kimi-k2:1t-cloud", "name": "Kimi K2", "color": "#FFEAA7", "specialty": "Price Action"},
    {"id": "glm-4.6:cloud", "name": "GLM 4.6", "color": "#DDA0DD", "specialty": "Quantitative Analysis"},
    {"id": "qwen3-vl:235b-cloud", "name": "Qwen3 VL", "color": "#98D8C8", "specialty": "Pattern Recognition"},
    {"id": "deepseek-v3.1:671b-cloud", "name": "DeepSeek V3.1", "color": "#F7DC6F", "specialty": "Trend Following"},
    {"id": "gpt-oss:120b-cloud", "name": "GPT-OSS 120B", "color": "#BB8FCE", "specialty": "Fundamental Analysis"},
    {"id": "gpt-oss:20b-cloud", "name": "GPT-OSS 20B", "color": "#85C1E9", "specialty": "Swing Trading"},
    {"id": "qwen3-coder:480b-cloud", "name": "Qwen3 Coder", "color": "#F1948A", "specialty": "Algorithmic Strategies"},
]

# System prompt for senior forex expert persona
SENIOR_EXPERT_PROMPT = """You are a highly respected senior forex trading expert with over 20 years of experience in the global currency markets. You have:
- Managed multi-million dollar portfolios for major investment banks
- Developed proprietary trading strategies that have consistently outperformed the market
- Mentored hundreds of junior traders who have gone on to successful careers
- Published research papers on market microstructure and algorithmic trading

Your specialty is: {specialty}

You are part of an elite AI Trading Council where the world's best trading minds collaborate. You take pride in your expertise and always aim to provide the most valuable insights.

{conversation_context}

When responding:
1. Be confident but humble - acknowledge when others have valid points
2. Share specific, actionable insights based on your expertise
3. Reference technical concepts and real-world trading scenarios
4. Keep responses focused and professional (3-5 paragraphs max)
5. Your specialty is {specialty}, so emphasize insights from that perspective
6. If the user references a previous question, use the conversation history above to provide context-aware responses

Respond as a senior expert would - with authority and depth."""

# Ranking prompt for AIs to evaluate other responses
RANKING_PROMPT = """You are a senior forex trading expert evaluating responses from your colleagues on the AI Trading Council.

The original question was:
"{question}"

Here are the responses from other council members:
{responses}

Rate EACH response on a scale of 1-10 based on:
- Accuracy of forex/trading knowledge (30%)
- Actionability of advice (25%)
- Depth of insight (25%)
- Clarity of explanation (20%)

Respond in this EXACT JSON format only (no other text):
{{
  "rankings": [
    {{"model_name": "NAME", "score": X, "reason": "brief reason"}}
  ],
  "best_insight": "The most valuable insight from the discussion"
}}"""

# Collaboration synthesis prompt
COLLABORATION_PROMPT = """You are the senior moderator of an elite AI Trading Council. Your job is to synthesize the best ideas from all council members into a cohesive trading strategy recommendation.

The original question was:
"{question}"

Here are all the expert responses:
{responses}

Here are the rankings from the council:
{rankings}

Create a synthesis that:
1. Identifies the consensus view (if any)
2. Highlights the most valuable unique insights
3. Provides a clear, actionable recommendation
4. Notes any important disagreements or risks

Keep your synthesis to 4-6 paragraphs. Be authoritative and professional."""


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass


manager = ConnectionManager()


async def query_ollama(model_id: str, prompt: str, system: str = "") -> Optional[str]:
    """Query a specific Ollama model"""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            payload = {
                "model": model_id,
                "prompt": prompt,
                "system": system,
                "stream": False
            }
            response = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
            if response.status_code == 200:
                return response.json().get("response", "")
    except Exception as e:
        print(f"Error querying {model_id}: {e}")
    return None


async def get_council_response(model: dict, question: str) -> dict:
    """Get response from a single council member"""
    context = conversation_db.get_context_summary()
    context_text = context if context else "This is the first question in this session."
    
    system_prompt = SENIOR_EXPERT_PROMPT.format(
        specialty=model["specialty"],
        conversation_context=context_text
    )
    response = await query_ollama(model["id"], question, system_prompt)
    
    return {
        "model_id": model["id"],
        "model_name": model["name"],
        "color": model["color"],
        "specialty": model["specialty"],
        "response": response if response else "Unable to generate response at this time.",
        "success": response is not None
    }


async def synthesize_responses(question: str, responses: list[dict], rankings_text: str = "") -> str:
    """Create a synthesis of all council responses using COLLABORATION_PROMPT"""
    responses_text = "\n\n".join([
        f"**{r['model_name']}** ({r['specialty']}): {r['response']}"
        for r in responses
    ])
    
    synthesis_prompt = COLLABORATION_PROMPT.format(
        question=question,
        responses=responses_text,
        rankings=rankings_text if rankings_text else "No rankings available."
    )
    
    # Use the last model (Qwen3 Coder) as moderator
    moderator = AI_COUNCIL[-1]
    system = "You are the senior moderator synthesizing insights from the AI Trading Council. Be authoritative and professional."
    result = await query_ollama(moderator["id"], synthesis_prompt, system)
    
    return result if result else "Unable to synthesize responses at this time."


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Send initial status
    await websocket.send_json({
        "type": "model_status",
        "data": [{"name": m["name"], "specialty": m["specialty"], "online": True} for m in AI_COUNCIL]
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("action") == "start_council":
                question = data.get("question", "")
                
                if not question:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Please provide a question for the council."
                    })
                    continue
                
                await websocket.send_json({
                    "type": "council_started",
                    "message": f"Council convened to discuss: {question[:100]}..."
                })
                
                # Gather responses from all council members
                responses = []
                for model in AI_COUNCIL[:-1]:  # Skip the Strategist for now
                    await websocket.send_json({
                        "type": "model_thinking",
                        "model_id": model["id"],
                        "model_name": model["name"]
                    })
                    
                    response = await get_council_response(model, question)
                    responses.append(response)
                    
                    await websocket.send_json({
                        "type": "model_response",
                        "data": response
                    })
                
                # Synthesize responses
                await websocket.send_json({
                    "type": "synthesis_started",
                    "message": "Synthesizing council insights..."
                })
                
                synthesis = await synthesize_responses(question, responses)
                
                await websocket.send_json({
                    "type": "synthesis_complete",
                    "data": synthesis
                })
                
                # Save to database
                conversation_db.add_conversation(
                    question=question,
                    responses=responses,
                    synthesis=synthesis
                )
                
                await websocket.send_json({
                    "type": "council_complete",
                    "message": f"Council session #{conversation_db.get_conversation_count()} complete!"
                })
            
            elif data.get("action") == "get_news_sentiment":
                topic = data.get("topic", "Bitcoin")
                await websocket.send_json({
                    "type": "news_fetching",
                    "message": f"Fetching news sentiment for {topic}..."
                })
                
                news_agent = NewsAgent(topic)
                sentiment_data = news_agent.get_sentiment_summary()
                
                if sentiment_data:
                    await websocket.send_json({
                        "type": "news_sentiment",
                        "data": sentiment_data
                    })
                else:
                    await websocket.send_json({
                        "type": "news_error",
                        "message": f"Unable to fetch news for {topic}"
                    })
            
            elif data.get("action") == "clear_history":
                conversation_db.clear_history()
                await websocket.send_json({
                    "type": "history_cleared",
                    "message": "Conversation history has been cleared."
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# News sentiment endpoint
@app.get("/api/news/{topic}")
async def get_news_sentiment(topic: str = "Bitcoin"):
    news_agent = NewsAgent(topic)
    sentiment_data = news_agent.get_sentiment_summary()
    
    if sentiment_data:
        return sentiment_data
    return {"error": f"Unable to fetch news for {topic}"}


# Serve static files
app.mount("/static", StaticFiles(directory=SCRIPT_DIR), name="static")


@app.get("/")
async def root():
    return FileResponse(os.path.join(SCRIPT_DIR, "index.html"))


@app.get("/{filename}")
async def serve_file(filename: str):
    filepath = os.path.join(SCRIPT_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath)
    return {"error": "File not found"}


if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 60)
    print("  STOCK EXCHANGE PRO - AI TRADING COUNCIL SERVER")
    print("=" * 60)
    print(f"\n  AI Council Members: {len(AI_COUNCIL)} models")
    for m in AI_COUNCIL:
        print(f"    - {m['name']}: {m['specialty']}")
    print("\n  Starting server at http://localhost:8000")
    print("  Make sure Ollama is running with cloud models!")
    print("\n  Endpoints:")
    print("    - Frontend: http://localhost:8000")
    print("    - WebSocket: ws://localhost:8000/ws")
    print("    - Health: http://localhost:8000/api/health")
    print("\n" + "=" * 60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
