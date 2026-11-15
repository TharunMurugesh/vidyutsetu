"""UI and Static Asset Verification Tests for VidyutSetu."""

import re
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_dashboard_html_served():
    response = client.get("/")
    assert response.status_code == 200
    assert '<div id="root">' in response.text
    assert "VidyutSetu" in response.text


def test_static_assets_resolved():
    response = client.get("/")
    assert response.status_code == 200

    # Verify JS bundle
    js_match = re.search(r'src="(/static/assets/[^"]+\.js)"', response.text)
    assert js_match is not None, "JavaScript bundle script tag not found in index.html"
    js_res = client.get(js_match.group(1))
    assert js_res.status_code == 200
    assert len(js_res.content) > 10000

    # Verify CSS bundle
    css_match = re.search(r'href="(/static/assets/[^"]+\.css)"', response.text)
    assert css_match is not None, "CSS stylesheet link tag not found in index.html"
    css_res = client.get(css_match.group(1))
    assert css_res.status_code == 200
    assert len(css_res.content) > 1000


def test_ui_api_dependencies():
    # Verify health endpoint used by UI heartbeat
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"

    # Verify stats endpoint used by dashboard
    stats_res = client.get("/api/stats")
    assert stats_res.status_code == 200
    assert "total_test_runs" in stats_res.json()

    # Verify vendors endpoint used by adapters view
    vendors_res = client.get("/api/vendors")
    assert vendors_res.status_code == 200
    assert "alpha-hes" in vendors_res.json()

