"""In-memory sliding-window rate limiter (per client key, e.g. IP).

Good for a single instance. For several replicas, implement the same
`hit()` interface on Redis.
"""

import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, key: str) -> bool:
        """Register a request. Returns False if the client is over the limit."""
        now = time.monotonic()
        q = self._hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.max_requests:
            return False
        q.append(now)
        return True
