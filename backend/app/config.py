from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "Enterprise RAG API"
    debug: bool = False
    allowed_origins: str = "*"

    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Cohere (embeddings)
    cohere_api_key: str = ""

    # Qdrant (vector store)
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    qdrant_collection: str = "enterprise_rag"

    # Redis (Upstash or local)
    redis_url: str = "redis://localhost:6379"
    session_ttl: int = 3600
    session_max_turns: int = 20

    # Keycloak
    keycloak_server_url: str = "http://localhost:8080"
    keycloak_realm: str = "enterprise-rag"
    keycloak_client_id: str = "rag-backend"

    # OpenTelemetry
    otel_endpoint: str = "http://localhost:4317"
    otel_service_name: str = "enterprise-rag-backend"
    otel_enabled: bool = True

    # Ingestion
    gcp_docs_base_url: str = "https://cloud.google.com/docs"
    max_crawl_pages: int = 100
    crawl_delay_seconds: float = 0.5

    # Google — API key for public folders, OAuth for private
    google_api_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/v1/drive/callback"
    frontend_url: str = "http://localhost:5173"

    # Chunking
    chunk_size: int = 512
    chunk_overlap: int = 64

    # Retrieval
    retrieval_top_k: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
