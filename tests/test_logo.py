from app import logo


def test_angles_multiples_de_45():
    for ring, pie, _ in logo.LETTERS:
        assert all(a % 45 == 0 for a in (*ring, *pie))
        # le secteur est contenu dans l'anneau
        assert any(ring[0] <= pie[0] + k and pie[1] + k <= ring[1] for k in (0, 360))


def test_geometrie():
    g = logo.logo()
    assert len(g["letters"]) == 4 and g["ri"] == 36
    assert all(p["d"].startswith("M") for l in g["letters"] for p in l["parts"])
    assert g["viewbox"] == "0 0 430.0 150"           # 4 cases + 3 espaces ; g et n une demi-case plus bas
    assert [l["cy"] for l in g["letters"]] == [50, 50, 100, 100]


def test_secteur_vide():
    assert logo.sector(50, 50, 0, 50, 0, 0) == ""
