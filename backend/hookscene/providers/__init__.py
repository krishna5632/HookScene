"""Model clients: one generic OpenAI-compatible client (base.py) used for every provider in config.yaml, including
Google Gemini, Groq, OpenRouter, OpenAI, Anthropic (via its OpenAI-compatible endpoint) and any company gateway.
anthropic_compat.py documents and helps build the handful of provider-level settings Anthropic's endpoint needs.
"""
from .anthropic_compat import DEFAULT_BASE_URL as ANTHROPIC_BASE_URL
from .anthropic_compat import provider_block as anthropic_provider_block
from .base import (FatalProviderError, HTTPError, LLM, apply_profile, load_config, load_env_file, run_sync)

__all__ = ["LLM", "HTTPError", "FatalProviderError", "load_config", "apply_profile", "load_env_file", "run_sync",
           "anthropic_provider_block", "ANTHROPIC_BASE_URL"]
