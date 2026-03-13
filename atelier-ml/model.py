"""
FootMeasurementNet — Neuronales Netz für Fußvermessung aus 4 Smartphone-Fotos.

Architektur:
  - 4 × EfficientNet-B0 Encoder (ImageNet pretrained, geteilte Weights für Top-Views,
    separate Weights für Side-Views)
  - Feature Fusion: Concatenation → MLP Regression Head
  - Output: 6 Messwerte [right_length, right_width, right_arch,
                          left_length,  left_width,  left_arch]  (in mm)

Technische Details:
  - EfficientNet-B0 Feature-Dim: 1280
  - 4 Encoder → 4 × 1280 = 5120 Features
  - Fusion MLP: 5120 → 1024 → 256 → 6
  - Dropout: 0.3 nach jedem Hidden Layer
  - Gesamt Parameter: ~21M (davon ~17M frozen beim ersten Training)

Training-Strategie (empfohlen):
  Phase 1: Encoder frozen, nur Fusion-MLP trainieren (20 Epochs)
  Phase 2: Alle Layer unfrozen, kleinere LR (30 Epochs)
"""

import torch
import torch.nn as nn

try:
    import timm
    HAS_TIMM = True
except ImportError:
    HAS_TIMM = False
    print('[WARNING] timm nicht installiert. Bitte: pip install timm')


class _Encoder(nn.Module):
    """EfficientNet-B0 Feature Extractor (ohne Klassifikations-Head)."""

    def __init__(self, pretrained: bool = True):
        super().__init__()
        if not HAS_TIMM:
            raise ImportError('Bitte timm installieren: pip install timm')
        self.net = timm.create_model(
            'efficientnet_b0',
            pretrained=pretrained,
            num_classes=0,       # Entfernt den Classifizier-Head
            global_pool='avg',   # Global Average Pooling → (B, 1280)
        )
        self.out_dim = self.net.num_features  # 1280

    def forward(self, x):
        return self.net(x)  # (B, 1280)

    def freeze(self):
        for p in self.parameters():
            p.requires_grad = False

    def unfreeze(self):
        for p in self.parameters():
            p.requires_grad = True


class FootMeasurementNet(nn.Module):
    """
    Vollständiges Fußvermessungs-Modell.

    Input:  4 Tensoren je (B, 3, 224, 224)
            right_top, right_side, left_top, left_side
    Output: (B, 6) in mm
            [right_length, right_width, right_arch,
             left_length,  left_width,  left_arch]

    Shared Encoders:
      - top_encoder:  für right_top + left_top (geteilte Gewichte)
      - side_encoder: für right_side + left_side (geteilte Gewichte)
    → 4 × 1280 = 5120 Features
    """

    N_OUTPUTS = 6  # right_length, right_width, right_arch, left_length, left_width, left_arch

    def __init__(
        self,
        pretrained: bool = True,
        dropout: float = 0.3,
        hidden_dims: list[int] | None = None,
    ):
        super().__init__()
        if hidden_dims is None:
            hidden_dims = [1024, 256]

        self.top_encoder  = _Encoder(pretrained)   # shared für top-views
        self.side_encoder = _Encoder(pretrained)   # shared für side-views
        feat_dim = self.top_encoder.out_dim * 4    # 1280 × 4 = 5120

        # Fusion MLP
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
        layers.append(nn.Linear(in_dim, self.N_OUTPUTS))
        self.fusion_head = nn.Sequential(*layers)

        # Label normalization (wird in train.py gesetzt)
        self.register_buffer('label_mean', torch.zeros(self.N_OUTPUTS))
        self.register_buffer('label_std',  torch.ones(self.N_OUTPUTS))

    def forward(
        self,
        right_top: torch.Tensor,
        right_side: torch.Tensor,
        left_top: torch.Tensor,
        left_side: torch.Tensor,
    ) -> torch.Tensor:
        # Encode — shared weights for same view type
        f_rt = self.top_encoder(right_top)   # (B, 1280)
        f_rs = self.side_encoder(right_side)  # (B, 1280)
        f_lt = self.top_encoder(left_top)     # (B, 1280)
        f_ls = self.side_encoder(left_side)   # (B, 1280)

        # Concatenate all features
        fused = torch.cat([f_rt, f_rs, f_lt, f_ls], dim=1)  # (B, 5120)

        # Regression → normalized output
        out_norm = self.fusion_head(fused)  # (B, 6)

        # Denormalize to mm
        out_mm = out_norm * self.label_std + self.label_mean
        return out_mm  # (B, 6)

    def freeze_encoders(self):
        """Phase 1: nur Fusion-Head trainieren."""
        self.top_encoder.freeze()
        self.side_encoder.freeze()
        print('[Model] Encoder eingefroren — nur Fusion-Head wird trainiert')

    def unfreeze_all(self):
        """Phase 2: alle Parameter trainieren."""
        self.top_encoder.unfreeze()
        self.side_encoder.unfreeze()
        print('[Model] Alle Parameter entsperrt (Fine-Tuning)')

    def set_label_stats(self, mean: torch.Tensor, std: torch.Tensor):
        """Setzt Label-Normalisierung (aus Trainingsdaten berechnet)."""
        self.label_mean.copy_(mean)
        self.label_std.copy_(std.clamp(min=1.0))

    @property
    def n_params(self):
        return sum(p.numel() for p in self.parameters())

    @property
    def n_trainable(self):
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


if __name__ == '__main__':
    model = FootMeasurementNet(pretrained=False)
    print(f'Parameter gesamt:    {model.n_params:,}')
    print(f'Trainierbar (Start): {model.n_trainable:,}')

    # Test forward pass
    B = 2
    dummy = [torch.randn(B, 3, 224, 224)] * 4
    out = model(*dummy)
    print(f'Output shape: {out.shape}')  # (2, 6)
    print(f'Output (mm):  {out}')
