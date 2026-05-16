from slowapi import Limiter
from slowapi.util import get_remote_address

# Keyed on client IP. In production, key on JWT sub for per-user limits.
limiter = Limiter(key_func=get_remote_address)
