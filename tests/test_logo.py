from app import logo


def test_angles_multiples_de_45():
    for ring, pie in logo.LETTERS:
        assert all(a % 45 == 0 for a in (*ring, *pie))
        # le secteur est contenu dans l'anneau
        assert any(ring[0] <= pie[0] + k and pie[1] + k <= ring[1] for k in (0, 360))


def test_geometrie():
    g = logo.logo(t=0.3, sp=0.3)
    assert len(g["letters"]) == 4 and g["ri"] == 35
    assert all(p["d"].startswith("M") for l in g["letters"] for p in l["parts"])
    assert g["viewbox"] == "0 0 445.0 100"
    assert not g["letters"][0]["rays"]
    assert len(logo.logo(guides=True)["letters"][0]["rays"]) == 8


def test_secteur_vide():
    assert logo.sector(50, 0, 50, 0, 0) == ""
