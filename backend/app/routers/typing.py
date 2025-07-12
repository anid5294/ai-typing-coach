from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from ..dependencies import get_current_user
from app import models, schemas
from datetime import datetime, timezone
import difflib
from collections import defaultdict

def calculate_accuracy(target_text: str, user_input: str) -> float:
    """Calculate typing accuracy as percentage of correct characters."""
    if not target_text:
        return 100.0
    
    correct_chars = 0
    total_chars = len(target_text)
    
    for i in range(min(len(target_text), len(user_input))):
        if target_text[i] == user_input[i]:
            correct_chars += 1
    
    # Penalize for missing characters or extra characters
    if len(user_input) < len(target_text):
        # Missing characters are errors
        pass  # already accounted for in total_chars
    elif len(user_input) > len(target_text):
        # Extra characters are errors, but don't increase total_chars
        pass
    
    accuracy = (correct_chars / total_chars) * 100 if total_chars > 0 else 100.0
    return min(100.0, accuracy)

def analyze_errors(target_text: str, user_input: str) -> dict:
    """Analyze typing errors in detail."""
    if not target_text:
        return {
            'total_errors': 0,
            'substitutions': [],
            'insertions': [],
            'deletions': [],
            'error_positions': [],
            'problematic_characters': {},
            'accuracy_by_position': []
        }
    
    # Use difflib to find differences
    matcher = difflib.SequenceMatcher(None, target_text, user_input)
    opcodes = matcher.get_opcodes()
    
    substitutions = []
    insertions = []
    deletions = []
    error_positions = []
    problematic_chars = defaultdict(int)
    
    total_errors = 0
    
    for tag, i1, i2, j1, j2 in opcodes:
        if tag == 'replace':  # Substitution
            for i, j in zip(range(i1, i2), range(j1, j2)):
                target_char = target_text[i] if i < len(target_text) else ''
                user_char = user_input[j] if j < len(user_input) else ''
                substitutions.append({
                    'position': i,
                    'expected': target_char,
                    'actual': user_char
                })
                problematic_chars[target_char] += 1
                error_positions.append(i)
                total_errors += 1
                
        elif tag == 'delete':  # Missing characters (deletions)
            for i in range(i1, i2):
                deletions.append({
                    'position': i,
                    'expected': target_text[i],
                    'actual': ''
                })
                problematic_chars[target_text[i]] += 1
                error_positions.append(i)
                total_errors += 1
                
        elif tag == 'insert':  # Extra characters (insertions)
            for j in range(j1, j2):
                insertions.append({
                    'position': i1,  # Position in target where extra char was inserted
                    'expected': '',
                    'actual': user_input[j]
                })
                error_positions.append(i1)
                total_errors += 1
    
    # Calculate accuracy by position (for identifying problem areas)
    accuracy_by_position = []
    for i, char in enumerate(target_text):
        if i < len(user_input):
            accuracy_by_position.append(1 if target_text[i] == user_input[i] else 0)
        else:
            accuracy_by_position.append(0)  # Missing character
    
    return {
        'total_errors': total_errors,
        'substitutions': substitutions,
        'insertions': insertions,
        'deletions': deletions,
        'error_positions': error_positions,
        'problematic_characters': dict(problematic_chars),
        'accuracy_by_position': accuracy_by_position,
        'error_rate': (total_errors / len(target_text)) * 100 if target_text else 0
    }

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
        models.KeystrokeEvent(
            session_id=sid, 
            key=e.key, 
            down_ts=e.down_ts, 
            up_ts=e.up_ts,
            target_char=e.target_char,
            position_in_text=e.position_in_text,
            is_correction=e.is_correction,
            is_error=e.is_error
        )
        for e in events
    ]
    db.bulk_save_objects(objs)
    db.commit()
    return {"count": len(objs)}

@router.post("/sessions/{sid}/input")
def upload_user_input(
    sid: int,
    payload: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    session = db.get(models.Session, sid)
    if not session or session.user_id != user.id:
        raise HTTPException(404, "Session not found")

    session.user_input = payload.get("user_input")
    db.commit()
    return {"message": "User input saved"}

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

    # 3) Analyze errors and compute comprehensive metrics
    target_text = sess.target_text
    user_input = sess.user_input or ""
    
    # Error analysis using string comparison
    accuracy_percentage = calculate_accuracy(target_text, user_input)
    error_analysis = analyze_errors(target_text, user_input)
    
    # Count keystrokes by type
    correction_count = len([e for e in events if e.is_correction])
    error_events = [e for e in events if e.is_error]
    
    # Basic timing metrics
    count = len(events)
    
    if count == 0:
        duration = 0
        wpm = 0
        avg_dwell = 0
        avg_flight = 0
    else:
        first_down = events[0].down_ts
        last_up = events[-1].up_ts
        duration = last_up - first_down
        
        # Calculate WPM based on characters typed (more accurate)
        chars_typed = len(user_input)
        wpm = (chars_typed / 5) / (duration / 60) if duration > 0 else 0

        dwells = [(e.up_ts - e.down_ts)*1000 for e in events]
        flights = [
            (events[i].down_ts - events[i-1].up_ts)*1000
            for i in range(1, count)
        ]
        avg_dwell = sum(dwells) / len(dwells) if dwells else 0
        avg_flight = sum(flights)/ len(flights) if flights else 0

    # Update session with computed metrics
    sess.accuracy_percentage = accuracy_percentage
    sess.error_count = error_analysis['total_errors']
    sess.correction_count = correction_count
    sess.words_per_minute = wpm
    sess.characters_per_minute = chars_typed / (duration / 60) if duration > 0 else 0
    db.commit()
    
    # 4) Return the enhanced summary
    return {
        "session_id": sid,
        "duration_secs": duration,
        "keystroke_count": count,
        "wpm": wpm,
        "avg_dwell_ms": avg_dwell,
        "avg_flight_ms": avg_flight,
        "accuracy_percentage": accuracy_percentage,
        "error_count": error_analysis['total_errors'],
        "correction_count": correction_count,
        "error_details": error_analysis,
        "user_input": user_input,
        "target_text": target_text,
    }
