import math
from pathlib import Path
from typing import Literal

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, FiniteFloat


STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(title="Calculator API", version="1.0.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class CalculationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    a: FiniteFloat
    b: FiniteFloat
    operation: Literal["add", "subtract", "multiply", "divide"]


class CalculationResponse(BaseModel):
    result: FiniteFloat


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.post("/api/calc", response_model=CalculationResponse)
def calculate(request: CalculationRequest) -> CalculationResponse:
    if request.operation == "divide" and request.b == 0:
        raise HTTPException(status_code=422, detail="Cannot divide by zero.")

    match request.operation:
        case "add":
            result = request.a + request.b
        case "subtract":
            result = request.a - request.b
        case "multiply":
            result = request.a * request.b
        case "divide":
            result = request.a / request.b

    if not math.isfinite(result):
        raise HTTPException(
            status_code=422,
            detail="The result is outside the supported numeric range.",
        )

    return CalculationResponse(result=result)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)