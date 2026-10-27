"""Regenerate both upload packages and self-contained previews from shared source."""
from pathlib import Path
import subprocess
import sys
from themes import THEMES

root = Path(__file__).resolve().parent.parent
for theme in THEMES:
    for script in ['package.py', 'mobile-preview.py']:
        subprocess.run([sys.executable, str(root / 'tools' / script), '--theme', theme], cwd=root, check=True)
subprocess.run([sys.executable, str(root / 'tools/result-review.py')], cwd=root, check=True)
