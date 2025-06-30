import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def signup_and_get_token():
    # sign up
    resp = client.post(
        "/auth/signup",
        json = {"email": "test@example.com", "password": "pw123"}
    )

    assert resp.status_code == 201
    user_id = resp.json()["id"]

    resp = client.post(
        "/auth/login",
        data = {"username": "test@example.com", "password": "pw123"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data and data["token_type"] == "bearer"
    return data["access_token"], user_id

def test_typing_session():

    # get valid JWT token
    token, user_id = signup_and_get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # start a session
    resp = client.post("/typing/sessions/start", headers=headers)
    assert resp.status_code == 200
    payload = resp.json()
    assert "session_id" in payload and "started_at" in payload
    session_id = payload["session_id"]

    # upload dummy keystrokes
    dummy_events = [
        {"key": "a", "down_ts": 0.0, "up_ts": 0.1},
        {"key": "b", "down_ts": 0.2, "up_ts": 0.3},
    ]
    resp = client.post(
        f"/typing/sessions/{session_id}/keystrokes",
        json=dummy_events,
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["count"] == len(dummy_events)

    # end session
    resp = client.post(f"/typing/sessions/{session_id}/end", headers=headers)
    assert resp.status_code == 200
    assert "ended_at" in resp.json()

def test_session_summary():
    token, user_id = signup_and_get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create a session…
    r = client.post("/typing/sessions/start", headers=headers)
    sid = r.json()["session_id"]

    # Upload two events 100ms apart…
    evs = [
      {"key":"a","down_ts":0.0,"up_ts":0.1},
      {"key":"b","down_ts":0.2,"up_ts":0.3},
    ]
    client.post(f"/typing/sessions/{sid}/keystrokes", json=evs, headers=headers)

    # End session at t=0.4
    client.post(f"/typing/sessions/{sid}/end", headers=headers)

    # Fetch summary
    r = client.get(f"/typing/sessions/{sid}/summary", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["keystroke_count"] == 2
    assert pytest.approx(data["duration_secs"], rel=1e-2) == 0.3
    assert pytest.approx(data["avg_dwell_ms"], rel=1e-2) == ((0.1+0.1)/2)*1000
