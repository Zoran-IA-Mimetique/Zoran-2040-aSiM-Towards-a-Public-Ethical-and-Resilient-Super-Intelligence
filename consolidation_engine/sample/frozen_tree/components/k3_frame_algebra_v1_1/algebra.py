# Échantillon gelé — représentant de components/k3_frame_algebra_v1_1.
# Brique protégée (K3) : le moteur peut la contrôler mais jamais la réécrire.

FRAMES = ["local", "lower", "peer", "upper", "temporal", "global"]


def frame_min(scores):
    return min(scores[f] for f in FRAMES)
