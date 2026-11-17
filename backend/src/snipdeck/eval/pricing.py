"""Configurable pricing and cost calculation for HookScene.

Calculates estimated API costs using reported token counts and configurable
prices per million tokens ($/1M).
"""
from __future__ import annotations

from typing import Any

# Default model pricing rates in USD per 1 Million tokens (input, output)
DEFAULT_PRICING_PER_M: dict[str, dict[str, float]] = {
    # Google Gemini Models
    "gemini-flash-lite-latest": {"input": 0.10, "output": 0.40},
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    "gemini-2.0-flash-lite": {"input": 0.075, "output": 0.30},
    "gemini-3-flash-preview": {"input": 0.10, "output": 0.40},
    "gemini-3.1-flash-lite": {"input": 0.075, "output": 0.30},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
    # OpenAI Models
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 2.50, "output": 10.00},
    # Anthropic Models
    "claude-haiku-4-5": {"input": 0.80, "output": 4.00},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
    "claude-sonnet-4-5": {"input": 3.00, "output": 15.00},
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
    # Groq / OpenRouter / OSS
    "llama-3.3-70b-versatile": {"input": 0.59, "output": 0.79},
    "meta-llama/llama-3.3-70b-instruct": {"input": 0.59, "output": 0.79},
}


def get_model_pricing(model_name: str, config: dict[str, Any] | None = None) -> tuple[float, float] | None:
    """Retrieve (input_price_per_m, output_price_per_m) for a given model.
    
    Checks config['pricing'] first, then falls back to DEFAULT_PRICING_PER_M.
    Returns None if model pricing is not configured.
    """
    if not model_name:
        return None

    # Check user-configured pricing in config
    if config and isinstance(config.get("pricing"), dict):
        cfg_pricing = config["pricing"].get(model_name)
        if cfg_pricing and isinstance(cfg_pricing, dict):
            inp = cfg_pricing.get("input_per_m") or cfg_pricing.get("input")
            out = cfg_pricing.get("output_per_m") or cfg_pricing.get("output")
            if inp is not None and out is not None:
                return float(inp), float(out)

    # Check default pricing table
    if model_name in DEFAULT_PRICING_PER_M:
        entry = DEFAULT_PRICING_PER_M[model_name]
        return entry["input"], entry["output"]

    # Fuzzy match / alias (e.g. model with version tag)
    for known_model, rates in DEFAULT_PRICING_PER_M.items():
        if known_model in model_name or model_name in known_model:
            return rates["input"], rates["output"]

    return None


def calculate_call_cost(
    prompt_tokens: int | None,
    completion_tokens: int | None,
    model_name: str,
    config: dict[str, Any] | None = None,
) -> float | None:
    """Calculate estimated cost in USD for a single LLM call.
    
    Formula: (prompt_tokens / 1,000,000) * input_rate + (completion_tokens / 1,000,000) * output_rate
    
    Returns None if tokens or model pricing are unavailable (never fabricate costs).
    """
    if prompt_tokens is None or completion_tokens is None:
        return None

    rates = get_model_pricing(model_name, config)
    if rates is None:
        return None

    input_rate, output_rate = rates
    cost = (prompt_tokens / 1_000_000.0) * input_rate + (completion_tokens / 1_000_000.0) * output_rate
    return round(cost, 6)


def get_all_configured_pricing(config: dict[str, Any] | None = None) -> dict[str, dict[str, float]]:
    """Return dictionary of all available pricing configurations."""
    pricing_map = {k: dict(v) for k, v in DEFAULT_PRICING_PER_M.items()}
    if config and isinstance(config.get("pricing"), dict):
        for model, rates in config["pricing"].items():
            if isinstance(rates, dict):
                pricing_map[model] = {
                    "input": float(rates.get("input_per_m", rates.get("input", 0.0))),
                    "output": float(rates.get("output_per_m", rates.get("output", 0.0))),
                }
    return pricing_map
