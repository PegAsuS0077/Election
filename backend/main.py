import asyncio
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import (
    init_db,
    get_constituencies,
    get_constituency_by_id,
    get_parties,
    get_candidate_by_id,
    get_candidates,
    get_latest_snapshot,
    save_constituency_results,
    save_snapshot,
)
from scraper import scrape_results

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "election.db")
SCRAPE_URL = os.getenv("SCRAPE_URL", "https://result.election.gov.np")
SCRAPE_INTERVAL = int(os.getenv("SCRAPE_INTERVAL_SECONDS", "30"))

# Comma-separated list of allowed CORS origins; defaults to localhost dev server.
_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,https://nepalvotes.live")
CORS_ORIGINS: list[str] = [o.strip() for o in _cors_env.split(",") if o.strip()]


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)

    async def broadcast(self, data: dict) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


def create_app(db=None, start_scraper: bool = True) -> FastAPI:
    """
    Factory so tests can inject an in-memory db and skip the scraper loop.
    """
    if db is None:
        db = init_db(DB_PATH)

    manager = ConnectionManager()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator:
        task = None
        if start_scraper:
            task = asyncio.create_task(_scraper_loop(db, manager))
        yield
        if task:
            task.cancel()

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/snapshot")
    def snapshot():
        return get_latest_snapshot(db)

    @app.get("/api/constituencies")
    def constituencies():
        return get_constituencies(db)

    @app.get("/api/constituencies/{code:path}")
    def constituency_detail(code: str):
        result = get_constituency_by_id(db, code)
        if result is None:
            raise HTTPException(status_code=404, detail="Constituency not found")
        return result

    @app.get("/api/parties")
    def parties():
        return get_parties(db)

    @app.get("/api/candidates")
    def candidates_list(
        party: str | None = Query(default=None),
        constituency: str | None = Query(default=None),
        q: str | None = Query(default=None),
        page: int = Query(default=1, ge=1),
    ):
        return get_candidates(db, party=party, constituency=constituency, q=q, page=page)

    @app.get("/api/candidates/{candidate_id}")
    def candidate_detail(candidate_id: int):
        result = get_candidate_by_id(db, candidate_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return result

    @app.websocket("/ws")
    async def websocket_endpoint(ws: WebSocket):
        await manager.connect(ws)
        try:
            # Push current state immediately on connect
            await ws.send_json({"type": "snapshot",      "data": get_latest_snapshot(db)})
            await ws.send_json({"type": "constituencies", "data": get_constituencies(db)})
            while True:
                await ws.receive_text()  # keep-alive; client can send pings
        except WebSocketDisconnect:
            manager.disconnect(ws)

    return app


async def _scraper_loop(db, manager: ConnectionManager) -> None:
    """Run scraper every SCRAPE_INTERVAL seconds and broadcast results."""
    while True:
        try:
            constituencies, snapshot = await scrape_results(SCRAPE_URL)
            save_snapshot(db, snapshot)
            save_constituency_results(db, constituencies)
            await manager.broadcast({"type": "snapshot",      "data": get_latest_snapshot(db)})
            await manager.broadcast({"type": "constituencies", "data": get_constituencies(db)})
        except Exception as exc:
            print(f"[scraper] error: {exc}")
        await asyncio.sleep(SCRAPE_INTERVAL)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(create_app(), host="0.0.0.0", port=8000, reload=False)
