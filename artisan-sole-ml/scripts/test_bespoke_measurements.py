"""
Synthetic end-to-end test for process_lidar.measure_foot incl. bespoke measures.

Builds a plausible right-foot surface point cloud (length 270mm, ball width
100mm) standing on a floor plane, embeds it in a rotated ARKit-style world
frame, and checks that all measurements come back in plausible ranges.
"""
import sys, json
import numpy as np

sys.path.insert(0, 'str(__import__("pathlib").Path(__file__).parent)')
from process_lidar import measure_foot

rng = np.random.default_rng(42)

L = 0.270          # foot length (m)
def half_width(t):
    """Foot half-width profile along normalized length t (0=heel, 1=toe)."""
    # heel ~33mm, waist ~38mm, ball ~50mm at t=0.68, toe taper
    return 0.001 * (33 + 22 * np.exp(-((t - 0.68) / 0.16) ** 2) - 28 * np.maximum(0, t - 0.85) * 10)

def dorsum_height(t):
    """Foot top height profile (m): heel 55mm, instep 62mm, toes 22mm."""
    h = 0.055 + 0.015 * np.exp(-((t - 0.45) / 0.18) ** 2) - 0.048 * np.maximum(0, t - 0.75) * 4
    return np.maximum(h, 0.018)

pts = []
# Foot surface: superellipse cross-sections (sides + top, no sole — occluded)
for t in np.linspace(0.01, 0.99, 220):
    a = half_width(t)
    b = dorsum_height(t)
    for th in np.linspace(0, np.pi, 60):   # upper half only (0..pi over the top)
        n = 2.4
        cy = np.sign(np.cos(th)) * abs(np.cos(th)) ** (2 / n)
        cz = abs(np.sin(th)) ** (2 / n)
        y = a * cy
        z = b * cz
        if z < 0.006:      # LiDAR sees nothing below ~6mm (floor cutoff)
            continue
        x = t * L
        pts.append([x, y, z])
# Ankle column above the heel (t 0.05..0.25 => x from heel), malleoli bumps
for t in np.linspace(0.04, 0.22, 40):
    x = t * L
    for h in np.linspace(0.055, 0.14, 30):
        r = 0.024 - 0.00004 * (h * 1000 - 55)
        for th in np.linspace(0, 2 * np.pi, 24, endpoint=False):
            y = r * np.cos(th)
            z = h
            # malleolus bumps: medial (+y) at 78mm, lateral (-y) at 62mm
            bump_m = 0.006 * np.exp(-(((h - 0.078) / 0.012) ** 2 + ((th - 0) / 0.5) ** 2))
            bump_l = 0.006 * np.exp(-(((h - 0.062) / 0.012) ** 2 + ((th - np.pi) / 0.5) ** 2))
            y = y + bump_m * (np.cos(th) > 0.7) - bump_l * (np.cos(th) < -0.7)
            pts.append([x, y, z])
# Floor plane ring around the foot (ARKit scans capture the floor densely)
for _ in range(25000):
    x = rng.uniform(-0.15, 0.45)
    y = rng.uniform(-0.20, 0.20)
    pts.append([x, y, 0.0])

pts = np.array(pts)
pts += rng.normal(0, 0.0007, pts.shape)      # 0.7mm sensor noise

# Embed in a rotated+translated ARKit world frame (Y-up)
theta = np.deg2rad(35)
Rz = np.array([[np.cos(theta), -np.sin(theta), 0], [np.sin(theta), np.cos(theta), 0], [0, 0, 1]])
world = pts @ Rz.T
world = world[:, [0, 2, 1]]                   # z-up -> Y-up (ARKit)
world += np.array([0.3, -0.8, 0.15])

cloud = [{"x": float(p[0]), "y": float(p[1]), "z": float(p[2])} for p in world]
result = measure_foot(cloud, side='right')
result.pop('point_cloud_mm', None)
result.pop('cross_sections', None)
result.pop('error_estimates', None)
print(json.dumps(result, indent=2))

# Plausibility assertions (ground truth: L=270, ball width ~100, heel width ~66)
def check(name, val, lo, hi):
    ok = val is not None and lo <= val <= hi
    print(f"{'OK ' if ok else 'FAIL'} {name:22s} = {val}  (expected {lo}–{hi})")
    return ok

ok = True
ok &= check('length',              result['length'],              248, 285)
ok &= check('ball_width',          result['ball_width'],           90, 112)
ok &= check('heel_width',          result['heel_width'],           55,  80)
ok &= check('heel_height',         result['heel_height'],          10,  60)
ok &= check('long_heel_girth',     result['long_heel_girth'],     240, 400)
ok &= check('ankle_width',         result['ankle_width'],          45,  75)
ok &= check('ankle_height_medial', result['ankle_height_medial'],  60, 100)
ok &= check('ankle_height_lateral',result['ankle_height_lateral'], 45,  85)
ok &= check('short_heel_girth',    result['short_heel_girth'],    220, 430)
ok &= check('ball_girth',          result['ball_girth'],          200, 280)
sys.exit(0 if ok else 1)
