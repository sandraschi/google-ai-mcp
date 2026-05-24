"""Pytest fixtures for Google AI MCP server tests."""
from __future__ import annotations

import pytest


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
