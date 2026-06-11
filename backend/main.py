from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai, time, uuid, os
from dotenv import load_dotenv
from db import save_log, get_logs, get_stats

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str
    model: str = "gpt-4o-mini"
    prompt_version: str = "v1"

def score_output(prompt: str, output: str) -> float:
    judge_prompt = f"""
    You are evaluating an AI response. Score it from 0.0 to 1.0 based on:
    - Relevance to the prompt
    - Accuracy and coherence  
    - Conciseness

    Prompt: {prompt}
    Response: {output}

    Reply with ONLY a number between 0.0 and 1.0. Nothing else.
    """
    result = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": judge_prompt}]
    )
    try:
        return float(result.choices[0].message.content.strip())
    except:
        return 0.5

@app.post("/call")
async def call_llm(req: PromptRequest):
    start = time.time()
    response = openai.chat.completions.create(
        model=req.model,
        messages=[{"role": "user", "content": req.prompt}]
    )
    latency = round((time.time() - start) * 1000)
    output = response.choices[0].message.content
    tokens_in = response.usage.prompt_tokens
    tokens_out = response.usage.completion_tokens
    cost = (tokens_in * 0.00000015) + (tokens_out * 0.0000006)
    quality = score_output(req.prompt, output)
    log = {
        "id": str(uuid.uuid4()),
        "prompt": req.prompt,
        "output": output,
        "model": req.model,
        "prompt_version": req.prompt_version,
        "latency_ms": latency,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost_usd": cost,
        "quality_score": quality,
    }
    save_log(log)
    return log

@app.get("/logs")
async def logs():
    return get_logs()

@app.get("/stats")
async def stats():
    return get_stats()