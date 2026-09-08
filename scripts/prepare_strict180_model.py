#!/usr/bin/env python3
"""Package the frozen NumPy model for Workers, retaining every native numeric bit.

Run with the handoff's NumPy requirement installed. The checked-in output means
normal frontend/Worker builds do not need Python. Arrays share one aligned buffer
so the Worker can view float32 jackknives without expanding them to float64.
"""
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'starseed_s4_web_handoff_v4_1_min'
spec = importlib.util.spec_from_file_location('frozen_scorer', SOURCE / 'scorer_v4_1.py')
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)
model, arrays = reference.load_model()
asset_path = '/model/s4-v4.1-f4521622d070.bin'
data = bytearray()
layout = {}
for name in arrays.files:
    array = np.ascontiguousarray(arrays[name])
    assert array.dtype in (np.dtype('float32'), np.dtype('float64'))
    data.extend(b'\0' * (-len(data) % 8))
    layout[name] = {'offset': len(data), 'shape': list(array.shape), 'dtype': str(array.dtype)}
    data.extend(array.astype(array.dtype.newbyteorder('<'), copy=False).tobytes())
metadata = {key: model[key] for key in (
    'model_version', 'coordinate_count', 'items', 'lineages', 'tie_order',
    'scoring', 'pair_boundary_metrics',
)}
metadata.update(asset_path=asset_path, byte_length=len(data), arrays=layout,
                bws_states=reference.BWS_ST.tolist(), cross_states=reference.CROSS_ST.tolist())
output = ROOT / 'public' / asset_path.lstrip('/')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_bytes(data)
(ROOT / 'worker' / 'scoring-model.json').write_text(
    json.dumps(metadata, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
(ROOT / 'worker' / 'model-hashes.json').write_text(
    json.dumps({name: hashlib.sha256((SOURCE / name).read_bytes()).hexdigest() for name in (
        'model_v4_1_arrays.npz', 'model_v4_1.json', 'quiz.zh-Hant.json',
    )}, indent=2) + '\n', encoding='utf-8')
print(f'{output.relative_to(ROOT)}: {len(data):,} bytes (native precision retained)')
