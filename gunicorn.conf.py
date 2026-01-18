# Gunicorn Configuration for Production

workers = 4
worker_class = "sync"
worker_connections = 1000
bind = "0.0.0.0:5000"
timeout = 120
keepalive = 2
max_requests = 1000
max_requests_jitter = 100

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Server Mechanics
daemon = False
pidfile = None
umask = 0o022
user = None
group = None
tmp_upload_dir = None

# SSL Configuration (if needed)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"
# ca_certs = "/path/to/ca_certs"

# Server Hooks
def post_worker_init(worker):
    """Called after a worker has initialized."""
    pass

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass

def post_fork(server, worker):
    """Called just after a worker is forked."""
    pass

def when_ready(server):
    """Called when the server is ready."""
    server.log.info("Gunicorn server is ready. Spawning workers")

def worker_int(worker):
    """Called when a worker receives the SIGTERM signal."""
    worker.log.info("Worker received SIGTERM signal")
