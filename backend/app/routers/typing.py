from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from ..dependencies import get_current_user
from app import models, schemas
from datetime import datetime, timezone

router = APIRouter(
    prefix="/typing",
    tags=["typing"],
    dependencies=[Depends(get_current_user)],
)

@router.post("/sessions/start", response_model=schemas.SessionStartOut)
def start_session(
    payload: schemas.SessionStartIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    # create a new Session row tied to the current_user
    session = models.Session(user_id=user.id, target_text = payload.prompt)
    db.add(session)

    # commit it so it gets an ID & started_at timestamp
    db.commit()
    db.refresh(session)  # populate session.id and session.started_at
    
    # return these fields to the client
    return {"session_id": session.id, "started_at": session.started_at, "prompt": session.target_text}

@router.post("/sessions/{sid}/keystrokes", response_model=schemas.KeystrokesUploadOut)
def upload_keystrokes(
    sid: int,
    events: list[schemas.KeystrokeEventIn],
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    session = db.get(models.Session, sid)
    if not session or session.user_id != user.id:
        raise HTTPException(404, "Session not found")

    objs = [
        models.KeystrokeEvent(session_id=sid, key=e.key, down_ts=e.down_ts, up_ts=e.up_ts)
        for e in events
    ]
    db.bulk_save_objects(objs)
    db.commit()
    return {"count": len(objs)}

@router.post("/sessions/{sid}/end")
def end_session(
    sid: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    session = db.get(models.Session, sid)
    if not session or session.user_id != user.id:
        raise HTTPException(404, "Session not found")

    session.ended_at = datetime.now(timezone.utc)
    db.commit()
    return {"ended_at": session.ended_at}

@router.get("/sessions/{sid}/summary", response_model=schemas.SessionSummary)
def summarize_session(
    sid: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # 1) Fetch & authorize
    sess = db.get(models.Session, sid)
    if not sess or sess.user_id != user.id or not sess.ended_at:
        raise HTTPException(404, "Completed session not found")

    # 2) Load events sorted by timestamp
    events = (
        db.query(models.KeystrokeEvent)
          .filter_by(session_id=sid)
          .order_by(models.KeystrokeEvent.down_ts)
          .all()
    )

    # 3) Compute metrics
    # duration = (sess.ended_at - sess.started_at).total_seconds()
    first_down = events[0].down_ts
    last_up = events[-1].up_ts
    duration = last_up - first_down
    
    count    = len(events)
    wpm      = (count / 5) / (duration / 60) if duration > 0 else 0

    dwells   = [(e.up_ts - e.down_ts)*1000 for e in events]
    flights  = [
        (events[i].down_ts - events[i-1].up_ts)*1000
        for i in range(1, count)
    ]
    avg_dwell  = sum(dwells) / len(dwells) if dwells else 0
    avg_flight = sum(flights)/ len(flights) if flights else 0

    # 4) Return the summary
    return {
        "session_id": sid,
        "duration_secs": duration,
        "keystroke_count": count,
        "wpm": wpm,
        "avg_dwell_ms": avg_dwell,
        "avg_flight_ms": avg_flight,
    }
