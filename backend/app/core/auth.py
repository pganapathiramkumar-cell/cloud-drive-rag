from functools import lru_cache

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

security = HTTPBearer(auto_error=False)

_DEV_USER = {"user_id": "dev-user", "email": "dev@localhost", "roles": ["admin", "user"]}


@lru_cache(maxsize=1)
def _jwks_uri() -> str:
    return (
        f"{settings.keycloak_server_url}/realms/{settings.keycloak_realm}"
        "/protocol/openid-connect/certs"
    )


# JWKS cached in-process; refreshed on 401 from Keycloak in production you'd
# add a periodic refresh. For now a module-level cache is sufficient.
_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(_jwks_uri(), timeout=5.0)
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    # Dev bypass: accept "dev-token" when DEBUG=true (never enable in production)
    if settings.debug:
        if credentials is None or credentials.credentials == "dev-token":
            return _DEV_USER

    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = credentials.credentials
    try:
        jwks = await _get_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return {
            "user_id": payload["sub"],
            "email": payload.get("email", ""),
            "roles": payload.get("realm_access", {}).get("roles", []),
        }
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc


def require_role(role: str):
    """FastAPI dependency factory — injects user and checks role."""

    async def _checker(user: dict = Depends(get_current_user)) -> dict:
        if role not in user["roles"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required.",
            )
        return user

    return _checker
