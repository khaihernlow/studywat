from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str
    MONGO_DB_NAME: str
    PINECONE_API_KEY: str
    PINECONE_INDEX_NAME: str

    class Config:
        env_file = ".env"

settings = Settings()