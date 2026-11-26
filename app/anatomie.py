"""Anatomie 3D : noms français des 634 structures du modèle Écorché et recherche.

Modèle : Écorché (github.com/Charleeh/ecorche), CC BY-SA 4.0, d'après BodyParts3D (DBCLS, CC BY 4.0)
et Z-Anatomy (Gauthier Kervyn, CC BY-SA 4.0). Les noms anglais viennent des `extras` du glb.
"""
import json
import re
import struct
import unicodedata
from functools import cache

from app.web import STATIC

GLB = STATIC / "anatomie/ecorche.glb"

ORD = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6, "seventh": 7,
       "eighth": 8, "ninth": 9, "tenth": 10, "eleventh": 11, "twelfth": 12}
VERT = {"cervical": "C", "thoracic": "T", "lumbar": "L"}
NEXT = {"C7": "T1", "T12": "L1", "L5": "S1"}
FINGER = {"thumb": "du pouce", "index finger": "de l'index", "middle finger": "du majeur",
          "ring finger": "de l'annulaire", "little finger": "de l'auriculaire", "big toe": "du gros orteil",
          "second toe": "du 2e orteil", "third toe": "du 3e orteil", "fourth toe": "du 4e orteil",
          "little toe": "du petit orteil"}
PHAL = {"Distal": "distale", "Middle": "moyenne", "Proximal": "proximale"}
TOOTH = {"central secondary incisor": "Incisive centrale", "lateral secondary incisor": "Incisive latérale",
         "secondary canine": "Canine", "first secondary premolar": "1re prémolaire",
         "second secondary premolar": "2e prémolaire", "first secondary molar": "1re molaire",
         "second secondary molar": "2e molaire"}

# noms sans motif régulier (côté retiré)
FR = {
    # os
    "Atlas": "Atlas (C1)", "Axis": "Axis (C2)", "Body of sternum": "Corps du sternum", "Manubrium": "Manubrium sternal",
    "Xiphoid process": "Processus xiphoïde", "Sacrum": "Sacrum", "Ethmoid": "Ethmoïde", "Frontal bone": "Os frontal",
    "Occipital bone": "Os occipital", "Sphenoid bone": "Sphénoïde", "Vomer": "Vomer", "Mandible": "Mandibule",
    "Navicular bone of foot": "Os naviculaire (scaphoïde tarsien)", "calcaneus": "Calcanéus",
    "capitate": "Capitatum (grand os)", "clavicle": "Clavicule", "cuboid bone": "Cuboïde", "femur": "Fémur",
    "fibula": "Fibula (péroné)", "hamate": "Hamatum (os crochu)", "hip bone": "Os coxal", "humerus": "Humérus",
    "inferior nasal concha": "Cornet nasal inférieur", "intermediate cuneiform bone": "Cunéiforme intermédiaire",
    "lacrimal bone": "Os lacrymal", "lateral cuneiform bone": "Cunéiforme latéral", "lunate": "Lunatum (semi-lunaire)",
    "maxilla": "Maxillaire", "medial cuneiform bone": "Cunéiforme médial", "nasal bone": "Os nasal",
    "palatine bone": "Os palatin", "parietal bone": "Os pariétal", "patella": "Patella (rotule)",
    "pisiform": "Pisiforme", "radius": "Radius", "scaphoid": "Scaphoïde", "scapula": "Scapula (omoplate)",
    "talus": "Talus (astragale)", "temporal bone": "Os temporal", "tibia": "Tibia",
    "trapezium": "Trapèze (os)", "trapezoid": "Trapézoïde", "ulna": "Ulna (cubitus)", "zygomatic bone": "Os zygomatique",
    # cartilages, œil, oreille
    "Septal nasal cartilage": "Cartilage septal du nez", "lateral nasal cartilage": "Cartilage latéral du nez",
    "major alar cartilage": "Grand cartilage alaire", "External ear": "Oreille externe (pavillon)",
    "cornea": "Cornée", "sclera": "Sclère (blanc de l'œil)",
    # tendons, fascias
    "calcaneal tendon": "Tendon calcanéen (tendon d'Achille)", "iliotibial tract": "Tractus ilio-tibial (bandelette de Maissiat)",
    "Linea alba": "Ligne blanche", "posterior layer of thoracolumbar fascia": "Fascia thoraco-lombaire (feuillet postérieur)",
    "Flexor retinaculum of wrist": "Rétinaculum des fléchisseurs du poignet",
    # muscles
    "Abdominal part of pectoralis major": "Grand pectoral, partie abdominale",
    "Clavicular part of pectoralis major": "Grand pectoral, partie claviculaire",
    "Sternocostal part of pectoralis major": "Grand pectoral, partie sterno-costale",
    "Abductor digiti minimi of foot": "Abducteur du petit orteil", "Abductor digiti minimi of hand": "Abducteur du petit doigt",
    "Flexor digiti minimi brevis of foot": "Court fléchisseur du petit orteil",
    "Flexor digiti minimi brevis of hand": "Court fléchisseur du petit doigt",
    "Opponens digiti minimi of foot": "Opposant du petit orteil", "Opponens digiti minimi of hand": "Opposant du petit doigt",
    "Acromial part of deltoid": "Deltoïde, partie acromiale (moyenne)", "Clavicular part of deltoid": "Deltoïde, partie claviculaire (antérieure)",
    "Spinal part of deltoid": "Deltoïde, partie spinale (postérieure)",
    "Ascending part of trapezius": "Trapèze, partie ascendante (inférieure)",
    "Descending part of trapezius": "Trapèze, partie descendante (supérieure)",
    "Transverse part of trapezius": "Trapèze, partie transverse (moyenne)",
    "External intercostal muscle": "Muscles intercostaux externes",
    "Humeral head of flexor carpi ulnaris": "Fléchisseur ulnaire du carpe, chef huméral",
    "Ulnar head of flexor carpi ulnaris": "Fléchisseur ulnaire du carpe, chef ulnaire",
    "Humeral head of pronator teres": "Rond pronateur, chef huméral", "Ulnar head of pronator teres": "Rond pronateur, chef ulnaire",
    "Lateral head of flexor hallucis brevis": "Court fléchisseur de l'hallux, chef latéral",
    "Medial head of flexor hallucis brevis": "Court fléchisseur de l'hallux, chef médial",
    "Lateral head of gastrocnemius": "Gastrocnémien latéral (jumeau externe)",
    "Medial head of gastrocnemius": "Gastrocnémien médial (jumeau interne)",
    "Lateral head of triceps brachii": "Triceps brachial, chef latéral (vaste externe)",
    "Long head of triceps brachii": "Triceps brachial, chef long",
    "Medial head of triceps brachii": "Triceps brachial, chef médial (vaste interne)",
    "Long head of biceps brachii": "Biceps brachial, chef long", "Short head of biceps brachii": "Biceps brachial, chef court",
    "Long head of biceps femoris": "Biceps fémoral, chef long", "Short head of biceps femoris": "Biceps fémoral, chef court",
    "Oblique head of adductor hallucis": "Adducteur de l'hallux, chef oblique",
    "Transverse head of adductor hallucis": "Adducteur de l'hallux, chef transverse",
    "Oblique head of adductor pollicis": "Adducteur du pouce, chef oblique",
    "Transverse head of adductor pollicis": "Adducteur du pouce, chef transverse",
    "Set of dorsal interossei of hand": "Interosseux dorsaux de la main", "Set of lumbricals of hand": "Lombricaux de la main",
    "Set of palmar interossei of hand": "Interosseux palmaires de la main",
    "abductor hallucis": "Abducteur de l'hallux", "abductor pollicis brevis": "Court abducteur du pouce",
    "abductor pollicis longus": "Long abducteur du pouce", "adductor brevis": "Court adducteur",
    "adductor longus": "Long adducteur", "adductor magnus": "Grand adducteur", "adductor minimus": "Petit adducteur (adductor minimus)",
    "anconeus": "Anconé", "brachialis": "Brachial (brachial antérieur)", "brachioradialis": "Brachio-radial (long supinateur)",
    "coracobrachialis": "Coracobrachial", "corrugator supercilii": "Corrugateur du sourcil",
    "deep part of masseter": "Masséter, partie profonde", "superficial part of masseter": "Masséter, partie superficielle",
    "depressor anguli oris": "Abaisseur de l'angle de la bouche", "depressor labii inferioris": "Abaisseur de la lèvre inférieure",
    "extensor carpi radialis brevis": "Court extenseur radial du carpe", "extensor carpi radialis longus": "Long extenseur radial du carpe",
    "extensor carpi ulnaris": "Extenseur ulnaire du carpe", "extensor digiti minimi": "Extenseur du petit doigt",
    "extensor digitorum": "Extenseur des doigts", "extensor digitorum longus": "Long extenseur des orteils",
    "extensor hallucis brevis": "Court extenseur de l'hallux", "extensor hallucis longus": "Long extenseur de l'hallux",
    "extensor indicis": "Extenseur de l'index", "extensor pollicis brevis": "Court extenseur du pouce",
    "extensor pollicis longus": "Long extenseur du pouce", "external oblique": "Oblique externe de l'abdomen (grand oblique)",
    "fibularis brevis": "Court fibulaire (court péronier)", "fibularis longus": "Long fibulaire (long péronier)",
    "fibularis tertius": "Troisième fibulaire (péronier antérieur)", "flexor carpi radialis": "Fléchisseur radial du carpe (grand palmaire)",
    "flexor digitorum brevis": "Court fléchisseur des orteils", "flexor digitorum longus": "Long fléchisseur des orteils",
    "flexor digitorum profundus": "Fléchisseur profond des doigts", "flexor digitorum superficialis": "Fléchisseur superficiel des doigts",
    "flexor hallucis longus": "Long fléchisseur de l'hallux", "flexor pollicis brevis": "Court fléchisseur du pouce",
    "flexor pollicis longus": "Long fléchisseur du pouce", "frontalis": "Frontal (muscle)",
    "gemellus inferior": "Jumeau inférieur", "gemellus superior": "Jumeau supérieur",
    "gluteus maximus": "Grand fessier", "gluteus medius": "Moyen fessier", "gluteus minimus": "Petit fessier",
    "gracilis": "Gracile (droit interne)", "iliacus": "Iliaque", "iliocostalis cervicis": "Ilio-costal du cou",
    "iliocostalis lumborum": "Ilio-costal des lombes", "iliocostalis thoracis": "Ilio-costal du thorax",
    "inferior head of lateral pterygoid": "Ptérygoïdien latéral, chef inférieur",
    "superior head of lateral pterygoid": "Ptérygoïdien latéral, chef supérieur",
    "infraspinatus muscle": "Infra-épineux (sous-épineux)", "internal oblique": "Oblique interne de l'abdomen (petit oblique)",
    "latissimus dorsi": "Grand dorsal", "levator labii superioris": "Releveur de la lèvre supérieure",
    "levator scapulae": "Élévateur de la scapula (angulaire)", "longissimus capitis": "Longissimus de la tête (petit complexus)",
    "longissimus cervicis": "Longissimus du cou", "longissimus thoracis": "Longissimus du thorax (long dorsal)",
    "medial pterygoid": "Ptérygoïdien médial", "mentalis": "Mentonnier", "multifidus cervicis": "Multifide du cou",
    "multifidus lumborum": "Multifide des lombes", "multifidus thoracis": "Multifide du thorax", "nasalis": "Nasal (muscle)",
    "obliquus capitis inferior": "Oblique inférieur de la tête", "obliquus capitis superior": "Oblique supérieur de la tête",
    "obturator externus": "Obturateur externe", "obturator internus": "Obturateur interne", "omohyoid": "Omo-hyoïdien",
    "opponens pollicis": "Opposant du pouce", "orbicularis oris": "Orbiculaire de la bouche",
    "orbital part of orbicularis oculi": "Orbiculaire de l'œil, partie orbitaire",
    "palpebral part of orbicularis oculi": "Orbiculaire de l'œil, partie palpébrale",
    "palmaris longus": "Long palmaire", "pectineus": "Pectiné", "pectoralis minor": "Petit pectoral", "piriformis": "Piriforme (pyramidal)",
    "plantaris": "Plantaire (grêle)", "popliteus": "Poplité", "procerus": "Procérus", "pronator quadratus": "Carré pronateur",
    "psoas major": "Grand psoas", "quadratus femoris": "Carré fémoral", "quadratus lumborum": "Carré des lombes",
    "rectus abdominis": "Droit de l'abdomen (grand droit)", "rectus capitis posterior major": "Grand droit postérieur de la tête",
    "rectus capitis posterior minor": "Petit droit postérieur de la tête", "rectus femoris": "Droit fémoral (droit antérieur)",
    "rhomboid major": "Grand rhomboïde", "rhomboid minor": "Petit rhomboïde", "risorius": "Risorius", "rotatores": "Rotateurs (du dos)",
    "sartorius": "Sartorius (couturier)", "scalenus anterior": "Scalène antérieur", "scalenus medius": "Scalène moyen",
    "scalenus posterior": "Scalène postérieur", "semimembranosus": "Semi-membraneux", "semispinalis capitis": "Semi-épineux de la tête (grand complexus)",
    "semispinalis cervicis": "Semi-épineux du cou", "semispinalis thoracis": "Semi-épineux du thorax", "semitendinosus": "Semi-tendineux",
    "serratus anterior": "Dentelé antérieur (grand dentelé)", "serratus posterior inferior": "Dentelé postéro-inférieur",
    "serratus posterior superior": "Dentelé postéro-supérieur", "soleus": "Soléaire", "spinalis thoracis": "Épineux du thorax",
    "splenius capitis": "Splénius de la tête", "splenius cervicis": "Splénius du cou", "sternocleidomastoid": "Sterno-cléido-mastoïdien",
    "sternohyoid": "Sterno-hyoïdien", "sternothyroid": "Sterno-thyroïdien", "subclavius": "Subclavier (sous-clavier)",
    "subscapularis": "Subscapulaire (sous-scapulaire)", "supinator": "Supinateur (court supinateur)", "supraspinatus": "Supra-épineux (sus-épineux)",
    "temporalis": "Temporal (muscle)", "tensor fasciae latae": "Tenseur du fascia lata", "teres major": "Grand rond", "teres minor": "Petit rond",
    "thyrohyoid": "Thyro-hyoïdien", "tibialis anterior": "Tibial antérieur (jambier antérieur)",
    "tibialis posterior": "Tibial postérieur (jambier postérieur)", "transversus abdominis": "Transverse de l'abdomen",
    "vastus intermedius": "Vaste intermédiaire (crural)", "vastus lateralis": "Vaste latéral (vaste externe)",
    "vastus medialis": "Vaste médial (vaste interne)", "zygomaticus major": "Grand zygomatique", "zygomaticus minor": "Petit zygomatique",
}
KIND = {"bone": "os", "cartilage": "cartilage", "tooth": "dent", "eye": "œil"}
KIND_NAME = {"calcaneal tendon": "tendon", "iliotibial tract": "fascia", "Linea alba": "aponévrose",
             "posterior layer of thoracolumbar fascia": "fascia", "Flexor retinaculum of wrist": "rétinaculum"}
SIDE = {"left": "gauche", "right": "droite"}


def nth(n: int, fem: bool) -> str:
    return f"{n}{'re' if fem else 'er'}" if n == 1 else f"{n}e"


def french(base: str) -> str:
    """Nom anglais sans côté → nom français."""
    if base in FR:
        return FR[base]
    w = base.split()
    if m := re.fullmatch(r"(\w+) (cervical|thoracic|lumbar) vertebra", base):
        return f"Vertèbre {VERT[m[2]]}{ORD[m[1].lower()]}"
    if m := re.fullmatch(r"Intervertebral disk of (axis|(\w+) (cervical|thoracic|lumbar) vertebra)", base):
        v = "C2" if m[1] == "axis" else f"{VERT[m[3]]}{ORD[m[2]]}"
        return f"Disque intervertébral {v}-{NEXT.get(v, v[0] + str(int(v[1:]) + 1))}"
    if m := re.fullmatch(r"(Distal|Middle|Proximal) phalanx of (.+)", base):
        return f"Phalange {PHAL[m[1]]} {FINGER[m[2]]}"
    if m := re.fullmatch(r"(upper|lower) (.+) tooth", base):
        return f"{TOOTH[m[2]]} {'supérieure' if m[1] == 'upper' else 'inférieure'}"
    if m := re.fullmatch(r"(\w+) (rib|costal cartilage|metacarpal bone|metatarsal bone)", base):
        n = ORD[m[1]]
        return {"rib": f"{nth(n, True)} côte", "costal cartilage": f"{nth(n, False)} cartilage costal",
                "metacarpal bone": f"{nth(n, False)} métacarpien", "metatarsal bone": f"{nth(n, False)} métatarsien"}[m[2]]
    if m := re.fullmatch(r"(\w+) (lumbrical|plantar interosseous) of foot", base):
        return f"{nth(ORD[m[1].lower()], False)} {'lombrical' if m[2] == 'lumbrical' else 'interosseux plantaire'} du pied"
    raise KeyError(base)  # un nom du modèle sans traduction : le test le signale


def fold(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


@cache
def structures() -> list[dict]:
    """Une entrée par mesh : clé (nom anglais du glb), nom français, nature, côté."""
    b = GLB.read_bytes()
    gltf = json.loads(b[20:20 + struct.unpack("<I", b[12:16])[0]])
    out = []
    for n in gltf["nodes"]:
        if "mesh" not in n:
            continue
        e = n["extras"]
        en = e["name"]
        base = re.sub(r"\b[Ll]eft |\b[Rr]ight ", "", en).replace(" (2)", "")
        base = base[0].upper() + base[1:] if base[0].upper() + base[1:] in FR else base
        fr = french(base)
        fr = fr[0].upper() + fr[1:] + (" (2e partie)" if en.endswith("(2)") else "")
        kind = KIND_NAME.get(base) or KIND.get(e.get("tissue"), "muscle")
        out.append({"key": en, "fr": fr, "kind": kind, "side": SIDE.get(e["side"], ""),
                    "fold": fold(f"{fr} {kind} {SIDE.get(e['side'], '')} {en}")})
    return out


def search(q: str, limit: int = 40) -> list[dict]:
    words = fold(q).split()
    if not words:
        return []
    hits = [s for s in structures() if all(w in s["fold"] for w in words)]
    # les noms qui commencent par le premier mot d'abord
    nat = lambda t: re.sub(r"\d+", lambda m: m[0].zfill(3), fold(t))
    hits.sort(key=lambda s: (not fold(s["fr"]).startswith(words[0]), nat(s["fr"]), s["side"] != "gauche"))
    return hits[:limit]
