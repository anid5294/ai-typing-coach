import pytest

# -------------------------------------------------------------------
# helper — now takes the `client` fixture instead of a global
def signup_and_get_token(client):
    # 1) Sign up a fresh user
    resp = client.post(
        "/auth/signup",
        json={"email": "test@example.com", "password": "pw123"},
    )
    assert resp.status_code == 201, resp.text
    user_id = resp.json()["id"]

    # 2) Log in to get bearer token
    resp = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "pw123"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data and data["token_type"] == "bearer"
    return data["access_token"], user_id


# -------------------------------------------------------------------
def test_typing_session(client):
    token, _ = signup_and_get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # start a session
    payload = {"prompt": "Test typing prompt"}
    resp = client.post("/typing/sessions/start", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
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
    assert resp.status_code == 200, resp.text
    assert resp.json()["count"] == len(dummy_events)

    # end session
    resp = client.post(f"/typing/sessions/{session_id}/end", headers=headers)
    assert resp.status_code == 200, resp.text
    assert "ended_at" in resp.json()


# -------------------------------------------------------------------
def test_session_summary(client):
    token, _ = signup_and_get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Create & populate a session
    payload = {"prompt": "Test typing prompt"}
    r = client.post("/typing/sessions/start", json=payload, headers=headers)
    sid = r.json()["session_id"]

    evs = [
        {"key": "a", "down_ts": 0.0, "up_ts": 0.1},
        {"key": "b", "down_ts": 0.2, "up_ts": 0.3},
    ]
    client.post(f"/typing/sessions/{sid}/keystrokes", json=evs, headers=headers)
    client.post(f"/typing/sessions/{sid}/end", headers=headers)

    # Fetch summary
    r = client.get(f"/typing/sessions/{sid}/summary", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["keystroke_count"] == 2
    # duration = last_up - first_down = 0.3
    assert pytest.approx(data["duration_secs"], rel=1e-2) == 0.3
    assert pytest.approx(data["avg_dwell_ms"], rel=1e-2) == ((0.1 + 0.1) / 2) * 1000


# -------------------------------------------------------------------
def test_start_session_includes_prompt(client):
    token, _ = signup_and_get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"prompt": "Hello, world!"}
    r = client.post("/typing/sessions/start", json=payload, headers=headers)
    # choose 200 or 201 to match your router’s status_code
    assert r.status_code in (200, 201), r.text

    data = r.json()
    assert data["prompt"] == payload["prompt"]
    assert "session_id" in data and "started_at" in data
