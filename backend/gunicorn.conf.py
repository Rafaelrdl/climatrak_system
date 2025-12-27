"""
Gunicorn configuration with debug hooks
"""
import sys


def post_worker_init(worker):
    """Called after worker initialization"""
    print(f"✅ [GUNICORN] post_worker_init: Worker {worker.pid} pronto para processar requests!", file=sys.stderr, flush=True)


def pre_request(worker, req):
    """Called before each request"""
    print(f"🔵 [GUNICORN] pre_request: Worker {worker.pid} recebendo {req.method} {req.path}", file=sys.stderr, flush=True)


def post_request(worker, req, environ, resp):
    """Called after each request"""
    print(f"✅ [GUNICORN] post_request: Worker {worker.pid} respondeu {resp.status} para {req.path}", file=sys.stderr, flush=True)


def worker_int(worker):
    """Called when worker receives INT signal"""
    print(f"⚠️ [GUNICORN] worker_int: Worker {worker.pid} recebeu INT signal", file=sys.stderr, flush=True)


def worker_abort(worker):
    """Called when worker times out"""
    print(f"❌ [GUNICORN] worker_abort: Worker {worker.pid} TIMEOUT! Stack trace:", file=sys.stderr, flush=True)
    import traceback
    import threading
    for thread_id, stack in sys._current_frames().items():
        print(f"\n📍 Thread {thread_id}:", file=sys.stderr, flush=True)
        traceback.print_stack(stack, file=sys.stderr)
