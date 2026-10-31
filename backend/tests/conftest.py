
import pytest

from app.core.rate_limiter import limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Keep rate-limit counters isolated between tests."""

    limiter.reset()

    yield

    limiter.reset()
