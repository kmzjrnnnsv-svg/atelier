"""
FootShapeNet — Avatar3D-inspiriertes Fußvermessungs-Modell mit PCA Shape Model.

Architektur:
  4 × EfficientNet-B0 Encoder → k PCA-Koeffizienten
  → decode_shape() → (B, N_VERTS, 3) Vertex-Positionen
  → extract_measurements() → (B, 16) mm-Werte

Outputs (16 Maße = 8 je Fuß × 2 Füße):
  right: length, ball_width, ball_girth, instep_girth, heel_girth,
         arch_height, waist_girth, ankle_girth
  left:  (gleiche 8 Maße)
"""

import torch
import torch.nn as nn
import numpy as np

try:
    import timm
    HAS_TIMM = True
except ImportError:
    HAS_TIMM = False
    print('[WARNING] timm nicht installiert. Bitte: pip install timm')


# ── Measurement indices ───────────────────────────────────────────────────────
N_MEASUREMENTS = 16
MEAS_NAMES = [
    'right_length', 'right_ball_width', 'right_ball_girth',
    'right_instep_girth', 'right_heel_girth', 'right_arch_height',
    'right_waist_girth', 'right_ankle_girth',
    'left_length', 'left_ball_width', 'left_ball_girth',
    'left_instep_girth', 'left_heel_girth', 'left_arch_height',
    'left_waist_girth', 'left_ankle_girth',
]

MM_DEFAULTS = {  # Typical adult foot (EU 42)
    'right_length': 261.0, 'right_ball_width': 96.0, 'right_ball_girth': 236.0,
    'right_instep_girth': 248.0, 'right_heel_girth': 308.0, 'right_arch_height': 14.0,
    'right_waist_girth': 230.0, 'right_ankle_girth': 220.0,
    'left_length': 259.0, 'left_ball_width': 95.0, 'left_ball_girth': 234.0,
    'left_instep_girth': 246.0, 'left_heel_girth': 306.0, 'left_arch_height': 13.0,
    'left_waist_girth': 228.0, 'left_ankle_girth': 218.0,
}


class _Encoder(nn.Module):
    """EfficientNet-B0 Feature Extractor (ohne Klassifikations-Head)."""

    def __init__(self, pretrained: bool = True):
        super().__init__()
        if not HAS_TIMM:
            raise ImportError('Bitte timm installieren: pip install timm')
        self.net = timm.create_model(
            'efficientnet_b0',
            pretrained=pretrained,
            num_classes=0,
            global_pool='avg',
        )
        self.out_dim = self.net.num_features  # 1280

    def forward(self, x):
        return self.net(x)

    def freeze(self):
        for p in self.parameters():
            p.requires_grad = False

    def unfreeze(self):
        for p in self.parameters():
            p.requires_grad = True


class FootShapeNet(nn.Module):
    """
    Vollständiges Fußvermessungs-Modell mit PCA Shape Model.

    Input:  4 Tensoren je (B, 3, 224, 224)
    Output: (B, 16) in mm
    """

    def __init__(
        self,
        n_pca_components: int = 32,
        pretrained:        bool = True,
        dropout:           float = 0.3,
        hidden_dims:       list[int] | None = None,
        shape_model_dir:   str | None = None,
    ):
        super().__init__()
        if hidden_dims is None:
            hidden_dims = [1024, 256]

        self.n_pca  = n_pca_components
        self.top_encoder  = _Encoder(pretrained)
        self.side_encoder = _Encoder(pretrained)
        feat_dim = self.top_encoder.out_dim * 4  # 5120

        # Fusion MLP → PCA coefficients
        layers = []
        in_dim = feat_dim
        for h_dim in hidden_dims:
            layers += [
                nn.Linear(in_dim, h_dim),
                nn.BatchNorm1d(h_dim),
                nn.GELU(),
                nn.Dropout(dropout),
            ]
            in_dim = h_dim
        layers.append(nn.Linear(in_dim, n_pca_components))
        self.fusion_head = nn.Sequential(*layers)

        # PCA Shape Model buffers (loaded from data/shape_model/)
        # mean_shape: (N_VERTS, 3)  components: (k, N_VERTS*3)
        self.register_buffer('pca_mean',       torch.zeros(1))  # placeholder, overwritten on load
        self.register_buffer('pca_components', torch.zeros(1))
        self.register_buffer('pca_std',        torch.ones(n_pca_components))

        # Label stats for direct regression fallback
        self.register_buffer('label_mean', torch.tensor(list(MM_DEFAULTS.values()), dtype=torch.float32))
        self.register_buffer('label_std',  torch.ones(N_MEASUREMENTS) * 20.0)

        self._shape_loaded = False
        if shape_model_dir is not None:
            self.load_shape_model(shape_model_dir)

    def load_shape_model(self, shape_model_dir: str):
        """Lädt PCA-Modell aus .npy Dateien."""
        import numpy as np
        from pathlib import Path
        d = Path(shape_model_dir)

        mean_np  = np.load(d / 'mean_shape.npy').astype(np.float32)        # (N_VERTS, 3)
        comp_np  = np.load(d / 'components.npy').astype(np.float32)        # (k, N_VERTS*3)
        expl_np  = np.load(d / 'explained_variance.npy').astype(np.float32) # (k,)

        k = min(self.n_pca, comp_np.shape[0])
        self.n_pca = k

        # Whiten: std = sqrt(explained_variance)
        pca_std = np.sqrt(expl_np[:k])

        self.pca_mean       = torch.from_numpy(mean_np.flatten())           # (N_VERTS*3,)
        self.pca_components = torch.from_numpy(comp_np[:k])                 # (k, N_VERTS*3)
        self.pca_std        = torch.from_numpy(pca_std)                     # (k,)
        self.n_verts        = mean_np.shape[0]

        self._shape_loaded = True
        print(f'[FootShapeNet] PCA geladen: {k} Komponenten, {self.n_verts} Vertices')

    def decode_shape(self, z: torch.Tensor) -> torch.Tensor:
        """
        Dekodiert PCA-Koeffizienten zu Vertex-Positionen.
        z: (B, k) — whitened PCA coefficients
        Returns: (B, N_VERTS, 3)
        """
        # Un-whiten
        z_unwhite = z * self.pca_std.unsqueeze(0)          # (B, k)
        # Decode: mean + components @ z^T → (B, N_VERTS*3)
        verts_flat = self.pca_mean.unsqueeze(0) + z_unwhite @ self.pca_components  # (B, N_VERTS*3)
        n_verts = self.pca_mean.shape[0] // 3
        return verts_flat.view(-1, n_verts, 3)              # (B, N_VERTS, 3)

    def extract_measurements(self, verts: torch.Tensor) -> torch.Tensor:
        """
        Berechnet alle 8 Maße analytisch aus Vertex-Positionen.
        verts: (B, N_VERTS, 3) — X=Breite, Y=Höhe, Z=Länge
        Returns: (B, 8) mm-Werte für EINEN Fuß
        """
        B = verts.shape[0]
        x, y, z = verts[:, :, 0], verts[:, :, 1], verts[:, :, 2]

        z_min = z.min(dim=1, keepdim=True).values  # (B,1)
        z_max = z.max(dim=1, keepdim=True).values
        length = (z_max - z_min).squeeze(1)        # (B,)

        # Ball width (~28% Z)
        z_ball = z_min + 0.28 * length.unsqueeze(1)
        z_tol  = length.unsqueeze(1) * 0.05
        ball_mask = (z - z_ball).abs() < z_tol     # (B, N)
        # Max X - Min X in ball region
        x_ball = x.clone()
        x_ball[~ball_mask] = float('nan')
        # Compute nanmax/nanmin via masking with large values
        x_ball_max = x.masked_fill(~ball_mask, -1e6).max(dim=1).values
        x_ball_min = x.masked_fill(~ball_mask,  1e6).min(dim=1).values
        ball_width = x_ball_max - x_ball_min       # (B,)

        # Arch height: min Y in medial midfoot (30–65% Z, medial half)
        mid_mask = (z >= z_min + 0.30 * length.unsqueeze(1)) & \
                   (z <= z_min + 0.65 * length.unsqueeze(1))
        y_mid = y.masked_fill(~mid_mask, 1e6).min(dim=1).values
        arch_height = y_mid  # (B,)

        # Girth measurements via cross-section perimeter (differentiable approx)
        def cross_section_perimeter_approx(z_frac: float) -> torch.Tensor:
            """
            Approximiert den Querschnitt-Umfang bei Z-Fraktion.
            Differenzierbare Näherung: perimeter ≈ π * sqrt(2*(a²+b²))
            wobei a=halbe_X_ausdehnung, b=halbe_Y_ausdehnung (Ellipsen-Approximation)
            """
            z_target = z_min + z_frac * length.unsqueeze(1)
            z_t      = length.unsqueeze(1) * 0.04
            mask     = (z - z_target).abs() < z_t

            x_c = x.masked_fill(~mask, -1e6).max(dim=1).values - \
                  x.masked_fill(~mask,  1e6).min(dim=1).values
            y_c = y.masked_fill(~mask, -1e6).max(dim=1).values - \
                  y.masked_fill(~mask,  1e6).min(dim=1).values

            a = x_c / 2.0
            b = y_c / 2.0
            # Ramanujan's ellipse circumference approximation
            h = ((a - b) / (a + b + 1e-6)) ** 2
            perim = torch.pi * (a + b) * (1 + 3 * h / (10 + torch.sqrt(4 - 3 * h + 1e-6)))
            return perim

        ball_girth   = cross_section_perimeter_approx(0.28)
        instep_girth = cross_section_perimeter_approx(0.45)
        heel_girth   = cross_section_perimeter_approx(0.08)
        waist_girth  = cross_section_perimeter_approx(0.50)
        ankle_girth  = cross_section_perimeter_approx(0.10) * 1.05

        return torch.stack([
            length, ball_width, ball_girth, instep_girth,
            heel_girth, arch_height, waist_girth, ankle_girth,
        ], dim=1)  # (B, 8)

    def forward(
        self,
        right_top:  torch.Tensor,
        right_side: torch.Tensor,
        left_top:   torch.Tensor,
        left_side:  torch.Tensor,
    ) -> torch.Tensor:
        # Encode
        f_rt = self.top_encoder(right_top)
        f_rs = self.side_encoder(right_side)
        f_lt = self.top_encoder(left_top)
        f_ls = self.side_encoder(left_side)

        fused = torch.cat([f_rt, f_rs, f_lt, f_ls], dim=1)  # (B, 5120)

        # PCA coefficients (whitened)
        pca_pred = self.fusion_head(fused)  # (B, k)

        if self._shape_loaded:
            # Decode to 3D shape
            verts = self.decode_shape(pca_pred)  # (B, N_VERTS, 3)

            # Split into right/left halves (by X coordinate — left foot has negative X relative to right)
            # Convention: verts is the mean shape, scaled by foot; right foot = positive X half
            # In practice both feet are measured from same vertex set oriented the same way
            # We use the same vertices for both feet, as the model has shared-weight encoders
            mm_right = self.extract_measurements(verts)  # (B, 8)
            mm_left  = self.extract_measurements(verts)  # (B, 8) — left uses same shape (symmetric)

            out = torch.cat([mm_right, mm_left], dim=1)  # (B, 16)
        else:
            # Fallback: direct regression from PCA coefficients
            # PCA space → mm via linear projection
            out_norm = pca_pred[:, :N_MEASUREMENTS] if self.n_pca >= N_MEASUREMENTS else \
                       torch.cat([pca_pred, torch.zeros(pca_pred.shape[0], N_MEASUREMENTS - self.n_pca,
                                                        device=pca_pred.device)], dim=1)
            out = out_norm * self.label_std + self.label_mean

        return out  # (B, 16)

    def get_pca_coefficients(
        self,
        right_top:  torch.Tensor,
        right_side: torch.Tensor,
        left_top:   torch.Tensor,
        left_side:  torch.Tensor,
    ) -> torch.Tensor:
        """Gibt nur PCA-Koeffizienten zurück (für Training mit Dual-Loss)."""
        f_rt = self.top_encoder(right_top)
        f_rs = self.side_encoder(right_side)
        f_lt = self.top_encoder(left_top)
        f_ls = self.side_encoder(left_side)
        fused = torch.cat([f_rt, f_rs, f_lt, f_ls], dim=1)
        return self.fusion_head(fused)

    def freeze_encoders(self):
        self.top_encoder.freeze()
        self.side_encoder.freeze()
        print('[FootShapeNet] Encoder eingefroren')

    def unfreeze_all(self):
        self.top_encoder.unfreeze()
        self.side_encoder.unfreeze()
        print('[FootShapeNet] Alle Parameter entsperrt')

    def set_label_stats(self, mean: torch.Tensor, std: torch.Tensor):
        self.label_mean.copy_(mean)
        self.label_std.copy_(std.clamp(min=1.0))

    @property
    def n_params(self):
        return sum(p.numel() for p in self.parameters())


if __name__ == '__main__':
    model = FootShapeNet(n_pca_components=32, pretrained=False)
    print(f'Parameter: {model.n_params:,}')
    B = 2
    dummy = [torch.randn(B, 3, 224, 224)] * 4
    out = model(*dummy)
    print(f'Output shape: {out.shape}')  # (2, 16)
    print(f'Messwerte: {out[0].tolist()}')
