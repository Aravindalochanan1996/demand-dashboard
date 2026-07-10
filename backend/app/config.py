from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "demand_dashboard"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    frontend_origin: str = "http://localhost:3000"

    # Used by the Resume Analyzer chatbot (and available for future AI features
    # in ATS Tracker / Resume Builder). Never exposed to the frontend.
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5"

    class Config:
        env_file = ".env"


settings = Settings()
