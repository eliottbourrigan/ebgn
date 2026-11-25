from app.routes import public


def test_home(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Eliott Bourrigan" in r.text and "ebgn" in r.text
    assert 'href="/cv"' in r.text
    for name, *_ in public.PROJECTS:
        assert name in r.text
    assert "default-src 'self'" in r.headers["content-security-policy"]
    assert 'id="intro"' in r.text and "/static/js/app.js?v=" in r.text


def test_static_versioned_and_immutable(client):
    r = client.get("/")
    assert "/static/css/app.css?v=" in r.text
    r = client.get("/static/fonts/inter.woff2?v=x")
    assert r.status_code == 200 and "immutable" in r.headers["cache-control"]


def test_cv_absent(client, tmp_path, monkeypatch):
    monkeypatch.setattr(public, "CV", tmp_path / "absent.pdf")
    assert client.get("/cv").status_code == 404


def test_cv_present(client, tmp_path, monkeypatch):
    pdf = tmp_path / "cv.pdf"
    pdf.write_bytes(b"%PDF-1.4\n")
    monkeypatch.setattr(public, "CV", pdf)
    r = client.get("/cv")
    assert r.status_code == 200 and r.headers["content-type"] == "application/pdf"


def test_404(client):
    r = client.get("/nope")
    assert r.status_code == 404 and "Rien ici" in r.text


def test_health(client, tmp_path):
    assert client.get("/healthz").json() == {"ok": True}
    assert client.get("/healthz/lb").status_code == 200
    from app import config
    (tmp_path / f"drain-{config.PORT}").touch()
    assert client.get("/healthz/lb").status_code == 503
    assert client.get("/healthz").status_code == 200


def test_robots(client):
    assert "Allow: /" in client.get("/robots.txt").text
