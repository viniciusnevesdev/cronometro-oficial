#!/usr/bin/env python3
"""Contratos do release autocontido; usa somente /tmp e a árvore versionada."""

from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / 'prepare_release.py'
INDEX = ROOT / 'index.html'
REMOTE_LAYERS = ('presentation-ui.js', 'presentation.css', 'analytics-ui.js', 'analytics.css')


def local_references(text):
    return re.findall(r'(?:src|href)=["\']\./([^"\'#?]+)', text)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def source_contract():
    release_text = RELEASE.read_text(encoding='utf-8')
    for forbidden in ('urllib', 'urlopen', 'raw.githubusercontent.com', *REMOTE_LAYERS):
        require(forbidden not in release_text, f'prepare_release.py não pode depender de {forbidden}')

    index_text = INDEX.read_text(encoding='utf-8')
    for asset in local_references(index_text):
        require((ROOT / asset).is_file(), f'asset local ausente no index: {asset}')
    require('./cronometro-v092-advanced-analytics.js' in index_text, 'v092 JS precisa carregar na fonte')
    require('./cronometro-v092-advanced-analytics.css' in index_text, 'v092 CSS precisa carregar na fonte')
    for layer in REMOTE_LAYERS:
        require(f'./{layer}' not in index_text, f'camada remota não pode estar no index: {layer}')

    scripts = re.findall(r'<script\s+src=["\']([^"\']+)', index_text)
    v092_position = scripts.index('./cronometro-v092-advanced-analytics.js')
    require(v092_position > scripts.index('./cronometro-v091-client-directory.js'), 'v092 deve carregar após v091')
    require(not any('analytics-ui' in script for script in scripts[v092_position + 1:]), 'nenhum analytics externo pode sobrescrever v092')

    environments = (ROOT / 'prepare_environments.py').read_text(encoding='utf-8')
    require("const DB_NAME='cronometro_local_v1';" in environments, 'pipeline deve reconhecer banco Oficial')
    require("const DB_NAME='cronometro_beta_v1';" in environments, 'pipeline deve manter banco Beta separado')


def output_contract():
    with tempfile.TemporaryDirectory(prefix='cronometro-release-') as temporary:
        output = Path(temporary) / 'package'
        subprocess.run([sys.executable, str(RELEASE), str(ROOT), str(output), '0.0.0-test'], check=True)
        index_text = (output / 'index.html').read_text(encoding='utf-8')
        for asset in local_references(index_text):
            require((output / asset).is_file(), f'asset ausente no pacote: {asset}')
        for layer in REMOTE_LAYERS:
            require(not (output / layer).exists(), f'camada remota entrou no pacote: {layer}')
            require(f'./{layer}' not in index_text, f'index do pacote referencia camada remota: {layer}')
        require((output / 'cronometro-v092-advanced-analytics.js').is_file(), 'pacote development deve conter v092 JS')
        require((output / 'cronometro-v092-advanced-analytics.css').is_file(), 'pacote development deve conter v092 CSS')
        require('UZE' not in index_text and 'demonstração' not in index_text.lower(), 'index normal não pode receber texto da demonstração')

        sw_text = (output / 'sw.js').read_text(encoding='utf-8')
        for asset in re.findall(r"['\']\./([^'\']+)['\']", sw_text):
            require((output / asset).is_file(), f'pré-cache referencia asset ausente: {asset}')


if __name__ == '__main__':
    source_contract()
    output_contract()
    print('Integridade do release autocontido: OK')
