from app import anatomie


def test_page(client):
    r = client.get("/anatomie")
    assert r.status_code == 200
    assert 'id="ana-canvas"' in r.text and 'hx-get="/anatomie/recherche"' in r.text
    assert "/static/anatomie/ecorche.glb?v=" in r.text and "/static/vendor/htmx.min.js?v=" in r.text
    assert "CC BY-SA 4.0" in r.text


def test_toutes_les_structures_ont_un_nom_francais():
    s = anatomie.structures()
    assert len(s) == 634 and len({x["key"] for x in s}) == 634
    kinds = {x["kind"] for x in s}
    assert {"os", "muscle", "tendon", "cartilage", "dent"} <= kinds


def test_recherche_sans_accents_et_cote():
    hits = anatomie.search("vertebre l5")
    assert [h["fr"] for h in hits] == ["Vertèbre L5"]
    hits = anatomie.search("grand fessier")
    assert [h["side"] for h in hits] == ["gauche", "droite"]
    assert hits[0]["key"] == "Left gluteus maximus"
    assert anatomie.search("ACHILLE")[0]["kind"] == "tendon"
    assert [h["fr"] for h in anatomie.search("cote")][:4] == ["1re côte", "1re côte", "2e côte", "2e côte"]


def test_route_recherche(client):
    r = client.get("/anatomie/recherche", params={"q": "biceps brachial"})
    assert r.status_code == 200 and r.text.count('class="ana-hit') == 4
    assert 'data-key="Left long head of biceps brachii"' in r.text or "biceps brachii" in r.text


def test_route_recherche_vide_et_sans_resultat(client):
    assert "ana-hit" not in client.get("/anatomie/recherche", params={"q": "  "}).text
    r = client.get("/anatomie/recherche", params={"q": "zzzz"})
    assert r.status_code == 200 and "Aucun résultat" in r.text
