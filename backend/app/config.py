import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://whythis:whythis@localhost:5432/whythis"

    # Hugging Face Inference API (same convention as Startupvalidatior/Travel_Agent).
    huggingfacehub_api_token: str = Field(
        default_factory=lambda: os.getenv("HUGGINGFACEHUB_API_TOKEN") or os.getenv("HF_TOKEN") or ""
    )
    hf_provider: str = "auto"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    # Qwen2.5-7B-Instruct is no longer served by HF's serverless providers as of this writing;
    # 72B is, and it's the same model Startupvalidatior already uses as its REASONING_MODEL.
    chat_model: str = "Qwen/Qwen2.5-72B-Instruct"

    # GitHub/Slack/Jira credentials are per-client now (see Project in models.py) so one
    # deployment can serve multiple customers in isolation — set them via the dashboard's
    # Settings page (POST /projects, PATCH /projects/me/integrations), not here.


settings = Settings()
