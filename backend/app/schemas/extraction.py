from pydantic import BaseModel

class ExtractionRequest(BaseModel):
    file_url: str
