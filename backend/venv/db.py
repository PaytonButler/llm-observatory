from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

def save_log(data: dict):
    with engine.connect() as conn:
        conn.execute(text("""
            INSERT INTO llm_logs 
            (id, prompt, output, model, prompt_version, 
             latency_ms, tokens_in, tokens_out, cost_usd, quality_score, created_at)
            VALUES 
            (:id, :prompt, :output, :model, :prompt_version,
             :latency_ms, :tokens_in, :tokens_out, :cost_usd, :quality_score, NOW())
        """), data)
        conn.commit()

def get_logs():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, prompt, output, model, prompt_version,
                   latency_ms, tokens_in, tokens_out, cost_usd, quality_score, created_at
            FROM llm_logs
            ORDER BY created_at DESC
            LIMIT 100
        """))
        rows = result.mappings().all()
        return [dict(row) for row in rows]


def get_stats():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total_calls,
                ROUND(AVG(latency_ms)) as avg_latency_ms,
                ROUND(SUM(cost_usd)::numeric, 4) as total_cost,
                ROUND(AVG(quality_score)::numeric, 2) as avg_quality
            FROM llm_logs
            WHERE created_at > NOW() - INTERVAL '7 days'
        """))
        return dict(result.mappings().first())