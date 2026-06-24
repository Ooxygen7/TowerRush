#!/usr/bin/env python3
"""Persistent leaderboard, replay, and LinuxDo OAuth service for the tower-defense game."""

from __future__ import annotations

import base64
import json
import os
import secrets
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HOST = os.getenv("TF_HOST", "127.0.0.1")
PORT = int(os.getenv("TF_PORT", "3947"))
DB_PATH = Path(os.getenv("TF_DB_PATH", "/var/lib/tf-leaderboard/leaderboard.db"))
BASE_URL = os.getenv("TF_BASE_URL", "https://game.unsnow.online").rstrip("/")
REDIRECT_URI = os.getenv("TF_OAUTH_REDIRECT_URI", f"{BASE_URL}/td/auth/linuxdo/callback")
CLIENT_ID = os.getenv("TF_LINUXDO_CLIENT_ID", "").strip()
CLIENT_SECRET = os.getenv("TF_LINUXDO_CLIENT_SECRET", "").strip()
SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
MAX_JSON_BYTES = 900_000
VALID_MAPS = {"MAP1", "MAP2", "MAP3", "MAP4", "MAP5", "MAP6"}


def now() -> int:
    return int(time.time())


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def _create_scores_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS scores (
            replay_id TEXT PRIMARY KEY REFERENCES replays(replay_id) ON DELETE CASCADE,
            map_id TEXT NOT NULL,
            subject TEXT NOT NULL REFERENCES users(subject) ON DELETE CASCADE,
            username TEXT NOT NULL,
            display_name TEXT NOT NULL,
            avatar_url TEXT,
            score INTEGER NOT NULL,
            speed_score INTEGER NOT NULL,
            base_score INTEGER NOT NULL,
            skill_multiplier REAL NOT NULL,
            updated_at INTEGER NOT NULL
        )
        """
    )


def _create_scores_index(conn: sqlite3.Connection) -> None:
    conn.execute("CREATE INDEX IF NOT EXISTS idx_scores_map_score ON scores(map_id, score DESC, updated_at ASC)")


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                subject TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                display_name TEXT NOT NULL,
                avatar_url TEXT,
                updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                subject TEXT NOT NULL REFERENCES users(subject) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
            CREATE TABLE IF NOT EXISTS oauth_states (
                state TEXT PRIMARY KEY,
                expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS replays (
                replay_id TEXT PRIMARY KEY,
                subject TEXT NOT NULL REFERENCES users(subject) ON DELETE CASCADE,
                map_id TEXT NOT NULL,
                score INTEGER NOT NULL,
                replay_json TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            """
        )
        # scores 表迁移：旧版主键为 (map_id, subject)（每用户每图仅一条最佳记录）。
        # 新版以 replay_id 为主键，允许同一用户在同一地图保留多条记录。
        row = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='scores'"
        ).fetchone()
        existing_sql = row["sql"] if row else None
        if existing_sql and "PRIMARY KEY (map_id, subject)" in existing_sql:
            conn.execute("DROP INDEX IF EXISTS idx_scores_map_score")
            conn.execute("ALTER TABLE scores RENAME TO scores_legacy")
            _create_scores_table(conn)
            conn.execute(
                """
                INSERT OR IGNORE INTO scores(replay_id, map_id, subject, username, display_name,
                    avatar_url, score, speed_score, base_score, skill_multiplier, updated_at)
                SELECT replay_id, map_id, subject, username, display_name,
                    avatar_url, score, speed_score, base_score, skill_multiplier, updated_at
                FROM scores_legacy
                """
            )
            conn.execute("DROP TABLE scores_legacy")
            _create_scores_index(conn)
            print("migrated scores table to per-replay primary key", flush=True)
        else:
            _create_scores_table(conn)
            _create_scores_index(conn)


def json_response(handler: BaseHTTPRequestHandler, payload: object, status: int = HTTPStatus.OK) -> None:
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(data)


def html_response(handler: BaseHTTPRequestHandler, title: str, message: str, status: int = HTTPStatus.BAD_REQUEST) -> None:
    body = f"""<!doctype html><meta charset=\"utf-8\"><title>{title}</title>
    <style>body{{font-family:system-ui,sans-serif;background:#1a1a1a;color:#eee;display:grid;place-items:center;min-height:100vh;margin:0}}main{{max-width:520px;padding:28px;border:1px solid #f0a048;background:#2c2c2c}}a{{color:#f0a048}}</style>
    <main><h1>{title}</h1><p>{message}</p><p><a href=\"/td/\">返回游戏</a></p></main>""".encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "text/html; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def redirect(handler: BaseHTTPRequestHandler, location: str, cookie: str | None = None) -> None:
    handler.send_response(HTTPStatus.FOUND)
    handler.send_header("Location", location)
    if cookie:
        handler.send_header("Set-Cookie", cookie)
    handler.send_header("Content-Length", "0")
    handler.end_headers()


def parse_json_body(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0 or length > MAX_JSON_BYTES:
        raise ValueError("请求体大小无效")
    value = json.loads(handler.rfile.read(length).decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError("请求体必须是对象")
    return value


def current_user(handler: BaseHTTPRequestHandler) -> dict | None:
    cookie = SimpleCookie(handler.headers.get("Cookie", ""))
    token = cookie.get("tf_leaderboard_session")
    if not token:
        return None
    with connect() as conn:
        row = conn.execute(
            """
            SELECT u.subject, u.username, u.display_name, u.avatar_url
            FROM sessions s JOIN users u ON u.subject = s.subject
            WHERE s.token = ? AND s.expires_at > ?
            """,
            (token.value, now()),
        ).fetchone()
    return dict(row) if row else None


def compact_user(user: dict) -> dict:
    return {
        "id": user["subject"],
        "username": user["username"],
        "name": user["display_name"],
        "avatarUrl": user.get("avatar_url"),
    }


def oauth_ready() -> bool:
    return bool(CLIENT_ID and CLIENT_SECRET)


def token_request(code: str) -> dict:
    form = urllib.parse.urlencode(
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
        }
    ).encode("utf-8")
    credentials = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode("utf-8")).decode("ascii")
    request = urllib.request.Request(
        "https://connect.linux.do/oauth2/token",
        data=form,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def userinfo_request(access_token: str) -> dict:
    request = urllib.request.Request(
        "https://connect.linux.do/api/user",
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


class LeaderboardHandler(BaseHTTPRequestHandler):
    server_version = "TfLeaderboard/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}", flush=True)

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Allow", "GET, POST, OPTIONS")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        try:
            if parsed.path == "/td/api/health":
                json_response(self, {"ok": True, "oauthReady": oauth_ready()})
                return
            if parsed.path == "/td/api/me":
                user = current_user(self)
                json_response(self, {"authenticated": bool(user), "user": compact_user(user) if user else None, "oauthReady": oauth_ready()})
                return
            if parsed.path == "/td/api/leaderboard":
                self.get_leaderboard(query)
                return
            if parsed.path.startswith("/td/api/replays/"):
                self.get_replay(parsed.path.rsplit("/", 1)[-1])
                return
            if parsed.path == "/td/auth/linuxdo/login":
                self.start_login()
                return
            if parsed.path == "/td/auth/linuxdo/callback":
                self.finish_login(query)
                return
            if parsed.path == "/td/auth/logout":
                self.logout()
                return
            json_response(self, {"error": "not_found"}, HTTPStatus.NOT_FOUND)
        except ValueError as exc:
            json_response(self, {"error": str(exc)}, HTTPStatus.BAD_REQUEST)
        except urllib.error.HTTPError as exc:
            html_response(self, "LinuxDo 登录失败", f"LinuxDo 返回了错误状态 {exc.code}。", HTTPStatus.BAD_GATEWAY)
        except Exception as exc:  # Keep request failures observable without leaking secrets.
            print(f"request error: {exc!r}", flush=True)
            json_response(self, {"error": "server_error"}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        try:
            if parsed.path == "/td/api/scores":
                self.submit_score()
                return
            json_response(self, {"error": "not_found"}, HTTPStatus.NOT_FOUND)
        except ValueError as exc:
            json_response(self, {"error": str(exc)}, HTTPStatus.BAD_REQUEST)
        except Exception as exc:
            print(f"request error: {exc!r}", flush=True)
            json_response(self, {"error": "server_error"}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def get_leaderboard(self, query: dict) -> None:
        map_id = (query.get("map", ["MAP1"])[0] or "MAP1").upper()
        if map_id not in VALID_MAPS:
            raise ValueError("未知地图")
        try:
            limit = max(1, min(100, int(query.get("limit", [50])[0])))
        except ValueError as exc:
            raise ValueError("limit 无效") from exc
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT s.username, s.display_name, s.avatar_url, s.score, s.speed_score, s.base_score,
                       s.skill_multiplier, s.replay_id, s.updated_at, r.replay_json
                FROM scores s
                LEFT JOIN replays r ON r.replay_id = s.replay_id
                WHERE s.map_id = ?
                ORDER BY s.score DESC, s.updated_at ASC LIMIT ?
                """,
                (map_id, limit),
            ).fetchall()
        entries = []
        for index, row in enumerate(rows, start=1):
            tower_pool = []
            replay_version = 1
            if row["replay_json"]:
                try:
                    replay = json.loads(row["replay_json"])
                    saved_pool = replay.get("towerPool", [])
                    replay_version = int(replay.get("version", 1))
                    if isinstance(saved_pool, list):
                        tower_pool = [tower for tower in saved_pool if isinstance(tower, str) and len(tower) <= 64][:7]
                except (TypeError, ValueError, json.JSONDecodeError):
                    tower_pool = []
                    replay_version = 1
            entries.append(
                {
                    "rank": index,
                    "username": row["username"],
                    "name": row["display_name"],
                    "avatarUrl": row["avatar_url"],
                    "score": row["score"],
                    "speedScore": row["speed_score"],
                    "baseScore": row["base_score"],
                    "skillMultiplier": row["skill_multiplier"],
                    "replayId": row["replay_id"],
                    "towerPool": tower_pool,
                    "replayVersion": replay_version,
                    "updatedAt": row["updated_at"],
                }
            )
        json_response(self, {"mapId": map_id, "entries": entries})

    def get_replay(self, replay_id: str) -> None:
        if not replay_id or len(replay_id) > 96:
            raise ValueError("回放 ID 无效")
        with connect() as conn:
            row = conn.execute(
                """
                SELECT r.replay_id, r.map_id, r.score, r.replay_json, r.created_at,
                       u.username, u.display_name
                FROM replays r JOIN users u ON u.subject = r.subject
                WHERE r.replay_id = ?
                """,
                (replay_id,),
            ).fetchone()
        if not row:
            json_response(self, {"error": "replay_not_found"}, HTTPStatus.NOT_FOUND)
            return
        json_response(
            self,
            {
                "replayId": row["replay_id"],
                "mapId": row["map_id"],
                "score": row["score"],
                "createdAt": row["created_at"],
                "player": {"username": row["username"], "name": row["display_name"]},
                "replay": json.loads(row["replay_json"]),
            },
        )

    def start_login(self) -> None:
        if not oauth_ready():
            html_response(self, "LinuxDo 登录尚未配置", "管理员尚未填写 Client ID 与 Client Secret，请稍后再试。", HTTPStatus.SERVICE_UNAVAILABLE)
            return
        state = secrets.token_urlsafe(32)
        with connect() as conn:
            conn.execute("DELETE FROM oauth_states WHERE expires_at <= ?", (now(),))
            conn.execute("INSERT INTO oauth_states(state, expires_at) VALUES (?, ?)", (state, now() + 600))
        params = urllib.parse.urlencode(
            {
                "client_id": CLIENT_ID,
                "redirect_uri": REDIRECT_URI,
                "response_type": "code",
                "scope": "openid profile",
                "state": state,
            }
        )
        redirect(self, f"https://connect.linux.do/oauth2/authorize?{params}")

    def finish_login(self, query: dict) -> None:
        if not oauth_ready():
            html_response(self, "LinuxDo 登录尚未配置", "管理员尚未填写 Client ID 与 Client Secret，请稍后再试。", HTTPStatus.SERVICE_UNAVAILABLE)
            return
        state = query.get("state", [""])[0]
        code = query.get("code", [""])[0]
        if not state or not code:
            html_response(self, "LinuxDo 登录失败", "缺少 OAuth 回调参数。")
            return
        with connect() as conn:
            state_row = conn.execute("SELECT expires_at FROM oauth_states WHERE state = ?", (state,)).fetchone()
            conn.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
        if not state_row or state_row["expires_at"] <= now():
            html_response(self, "LinuxDo 登录失败", "登录状态已过期，请回到游戏后重试。")
            return
        token = token_request(code)
        access_token = token.get("access_token")
        if not access_token:
            html_response(self, "LinuxDo 登录失败", "未能取得访问令牌。", HTTPStatus.BAD_GATEWAY)
            return
        profile = userinfo_request(access_token)
        subject = str(profile.get("sub") or "")
        username = str(profile.get("username") or profile.get("login") or subject)
        display_name = str(profile.get("name") or username)
        avatar_url = profile.get("avatar_url")
        if not subject or not username:
            html_response(self, "LinuxDo 登录失败", "LinuxDo 未返回可用账号信息。", HTTPStatus.BAD_GATEWAY)
            return
        created = now()
        session_token = secrets.token_urlsafe(40)
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO users(subject, username, display_name, avatar_url, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(subject) DO UPDATE SET username=excluded.username,
                    display_name=excluded.display_name, avatar_url=excluded.avatar_url, updated_at=excluded.updated_at
                """,
                (subject, username, display_name, avatar_url, created),
            )
            conn.execute("DELETE FROM sessions WHERE expires_at <= ?", (created,))
            conn.execute(
                "INSERT INTO sessions(token, subject, expires_at, created_at) VALUES (?, ?, ?, ?)",
                (session_token, subject, created + SESSION_TTL_SECONDS, created),
            )
        cookie = f"tf_leaderboard_session={session_token}; Path=/td/; Max-Age={SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax"
        redirect(self, "/td/?leaderboard=1&auth=success", cookie)

    def logout(self) -> None:
        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        token = cookie.get("tf_leaderboard_session")
        if token:
            with connect() as conn:
                conn.execute("DELETE FROM sessions WHERE token = ?", (token.value,))
        redirect(self, "/td/?leaderboard=1", "tf_leaderboard_session=; Path=/td/; Max-Age=0; HttpOnly; Secure; SameSite=Lax")

    def submit_score(self) -> None:
        user = current_user(self)
        if not user:
            json_response(self, {"error": "authentication_required"}, HTTPStatus.UNAUTHORIZED)
            return
        payload = parse_json_body(self)
        map_id = str(payload.get("mapId", "")).upper()
        if map_id not in VALID_MAPS:
            raise ValueError("未知地图")
        try:
            score = int(payload["score"])
            speed_score = int(payload["speedScore"])
            base_score = int(payload["baseScore"])
            skill_multiplier = float(payload["skillMultiplier"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("分数数据无效") from exc
        if not (0 <= score <= 2_000_000_000 and 0 <= speed_score <= 2_000_000_000 and 0 <= base_score <= 2_000_000_000):
            raise ValueError("分数超出允许范围")
        if not (1 <= skill_multiplier <= 2):
            raise ValueError("高手倍率无效")
        replay = payload.get("replay")
        if not isinstance(replay, dict) or replay.get("mapId") != map_id or not isinstance(replay.get("actions"), list):
            raise ValueError("回放数据无效")
        replay_json = json.dumps(replay, ensure_ascii=False, separators=(",", ":"))
        if len(replay_json.encode("utf-8")) > MAX_JSON_BYTES - 30_000 or len(replay["actions"]) > 12_000:
            raise ValueError("回放数据过大")
        created = now()
        with connect() as conn:
            # 每次上传都保留为独立记录（即使不是最佳）；排行榜可同时展示同一用户的多条记录。
            replay_id = secrets.token_urlsafe(18)
            conn.execute(
                "INSERT INTO replays(replay_id, subject, map_id, score, replay_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (replay_id, user["subject"], map_id, score, replay_json, created),
            )
            conn.execute(
                """
                INSERT INTO scores(replay_id, map_id, subject, username, display_name, avatar_url,
                    score, speed_score, base_score, skill_multiplier, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    replay_id,
                    map_id,
                    user["subject"],
                    user["username"],
                    user["display_name"],
                    user.get("avatar_url"),
                    score,
                    speed_score,
                    base_score,
                    skill_multiplier,
                    created,
                ),
            )
            rank = conn.execute("SELECT COUNT(*) + 1 AS rank FROM scores WHERE map_id = ? AND score > ?", (map_id, score)).fetchone()["rank"]
            best_row = conn.execute("SELECT MAX(score) AS best FROM scores WHERE map_id = ? AND subject = ?", (map_id, user["subject"])).fetchone()
            best = best_row["best"] if best_row and best_row["best"] is not None else score
        json_response(self, {"uploaded": True, "bestScore": best, "rank": rank, "replayId": replay_id})


if __name__ == "__main__":
    init_db()
    print(f"TF leaderboard service listening on http://{HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), LeaderboardHandler).serve_forever()
