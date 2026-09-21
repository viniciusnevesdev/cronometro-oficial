#!/usr/bin/env python3
"""Contratos de isolamento entre os pacotes públicos Beta e Oficial."""

from pathlib import Path
import hashlib
import importlib.util
import json
import shutil
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / '.github' / 'workflows' / 'pages.yml'
MODULE_PATH = ROOT / 'prepare_isolated_publication.py'


sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('isolated_publication', MODULE_PATH)
publication = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publication)


def write(path: Path, value: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding='utf-8')


def digest(root: Path):
    result = {}
    if not root.exists():
        return result
    for path in sorted(root.rglob('*')):
        if path.is_file():
            relative = path.relative_to(root).as_posix()
            result[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def fixture(root: Path):
    write(root / 'index.html', 'oficial-original')
    write(root / 'sw.js', 'sw-original')
    write(root / 'menu' / 'index.html', 'menu-original')
    write(root / 'beta' / 'index.html', 'beta-original')
    write(root / 'beta' / 'asset.js', 'beta-asset-original')
    write(root / '.github' / 'workflows' / 'pages.yml', 'workflow-main')


def test_beta(temporary: Path):
    public = temporary / 'development-main'
    built = temporary / 'built-beta'
    fixture(public)
    write(built / 'index.html', 'beta-nova')
    write(built / 'asset.js', 'beta-asset-novo')
    official_before = publication.file_map(public, {'beta', *publication.PUBLIC_EXCLUDES})
    validate_beta = publication.validate_beta
    publication.validate_beta = lambda _path: None
    try:
        publication.sync_beta(built, public)
        first = digest(public)
        publication.sync_beta(built, public)
    finally:
        publication.validate_beta = validate_beta
    assert digest(public) == first
    assert publication.file_map(public, {'beta', *publication.PUBLIC_EXCLUDES}) == official_before
    assert (public / 'beta' / 'index.html').read_text() == 'beta-nova'
    assert (public / 'index.html').read_text() == 'oficial-original'


def test_official(temporary: Path):
    public = temporary / 'stable-main'
    candidate = temporary / 'official-candidate'
    fixture(public)
    shutil.copytree(public, candidate)
    write(candidate / 'index.html', 'oficial-nova')
    write(candidate / 'sw.js', 'sw-novo')
    beta_before = digest(public / 'beta')
    publication.sync_official(candidate, public)
    first = digest(public)
    publication.sync_official(candidate, public)
    assert digest(public) == first
    assert digest(public / 'beta') == beta_before
    assert (public / 'index.html').read_text() == 'oficial-nova'
    assert (public / 'beta' / 'index.html').read_text() == 'beta-original'


def rejected_manifest(case_root: Path, files=None, raw=None):
    public = case_root / 'public'
    candidate = case_root / 'candidate'
    fixture(public)
    fixture(candidate)
    write(candidate / 'obsolete-official.js', 'obsolete')
    write(candidate / 'another-valid.js', 'another')
    write(case_root / 'escape.txt', 'external')
    write(case_root.parent / 'escape.txt', 'external-parent')
    if raw is None:
        raw = json.dumps({'release': 'test', 'files': files})
    write(public / '.official-assets.json', raw)
    before = digest(case_root.parent)
    try:
        publication.validated_previous_official_assets(public, candidate)
    except SystemExit as error:
        assert 'Manifesto Oficial inválido:' in str(error)
    else:
        raise AssertionError(f'Manifesto deveria ter sido rejeitado: {files!r}')
    assert digest(case_root.parent) == before
    assert (candidate / 'obsolete-official.js').read_text() == 'obsolete'
    assert (candidate / 'another-valid.js').read_text() == 'another'
    assert (candidate / 'menu' / 'index.html').read_text() == 'menu-original'
    assert (candidate / 'beta' / 'index.html').read_text() == 'beta-original'
    return public, candidate


def test_manifest_rejections(temporary: Path):
    invalid_entries = [
        '../escape.txt', '../../escape.txt', '/tmp/escape.txt', r'C:\arquivo.txt',
        'beta/index.html', 'menu/index.html', 'diagnostico/index.html',
        'menu.html', 'ambientes.json', 'historico-versoes.html',
        '.official-assets.json', '', '.', '..',
    ]
    for index, entry in enumerate(invalid_entries):
        rejected_manifest(temporary / f'invalid-entry-{index}', [entry])

    invalid_structures = [
        {'files': None}, {'files': {}}, {'files': 'arquivo.js'},
        {'files': [123]}, {'files': [None]}, {'files': ['a.js', 'a.js']},
        [], {},
    ]
    for index, value in enumerate(invalid_structures):
        rejected_manifest(
            temporary / f'invalid-structure-{index}',
            raw=json.dumps(value),
        )
    rejected_manifest(temporary / 'invalid-json', raw='{ "files": [')


def test_manifest_atomicity_and_symlink(temporary: Path):
    rejected_manifest(
        temporary / 'atomic',
        ['obsolete-official.js', '../escape.txt', 'another-valid.js'],
    )

    case_root = temporary / 'symlink'
    public = case_root / 'public'
    candidate = case_root / 'candidate'
    public.mkdir(parents=True)
    candidate.mkdir(parents=True)
    external = case_root / 'external.js'
    write(external, 'external')
    (public / 'linked.js').symlink_to(external)
    (candidate / 'linked.js').symlink_to(external)
    write(public / '.official-assets.json', json.dumps({'files': ['linked.js']}))
    try:
        publication.validated_previous_official_assets(public, candidate)
    except SystemExit:
        pass
    else:
        raise AssertionError('Symlink deveria ser rejeitado pelo manifesto')
    assert external.read_text() == 'external'
    assert (candidate / 'linked.js').is_symlink()


def test_valid_manifest_cleanup(temporary: Path):
    case_root = temporary / 'valid-cleanup'
    public = case_root / 'public'
    candidate = case_root / 'candidate'
    fixture(public)
    fixture(candidate)
    write(candidate / 'obsolete-official.js', 'obsolete')
    write(public / '.official-assets.json', json.dumps({
        'release': 'old',
        'files': ['index.html', 'sw.js', 'obsolete-official.js', '.nojekyll'],
    }))
    names = publication.validated_previous_official_assets(public, candidate)
    publication.remove_previous_official_assets(candidate, names)
    assert not (candidate / 'obsolete-official.js').exists()
    assert not (candidate / 'index.html').exists()
    assert (candidate / 'menu' / 'index.html').read_text() == 'menu-original'
    assert (candidate / 'beta' / 'index.html').read_text() == 'beta-original'
    publication.remove_previous_official_assets(candidate, names)
    assert (candidate / 'menu' / 'index.html').exists()

    no_manifest_public = case_root / 'first-public'
    no_manifest_candidate = case_root / 'first-candidate'
    fixture(no_manifest_public)
    fixture(no_manifest_candidate)
    assert publication.validated_previous_official_assets(no_manifest_public, no_manifest_candidate) == []


def test_sync_guards(temporary: Path):
    official_public = temporary / 'guard-official-public'
    official_candidate = temporary / 'guard-official-candidate'
    fixture(official_public)
    shutil.copytree(official_public, official_candidate)
    write(official_candidate / 'beta' / 'index.html', 'beta-adulterada')
    official_before = digest(official_public)
    try:
        publication.sync_official(official_candidate, official_public)
    except SystemExit as error:
        assert 'não preservou beta/' in str(error)
    else:
        raise AssertionError('Publicação Oficial deveria bloquear alteração da Beta')
    assert digest(official_public) == official_before

    beta_public = temporary / 'guard-beta-public'
    beta_built = temporary / 'guard-beta-built'
    fixture(beta_public)
    write(beta_built / 'index.html', 'beta-nova')
    original_copytree = publication.shutil.copytree
    original_validate = publication.validate_beta
    publication.validate_beta = lambda _path: None

    def tampering_copytree(source, target, *args, **kwargs):
        result = original_copytree(source, target, *args, **kwargs)
        write(beta_public / 'index.html', 'oficial-adulterada')
        return result

    publication.shutil.copytree = tampering_copytree
    try:
        try:
            publication.sync_beta(beta_built, beta_public)
        except SystemExit as error:
            assert 'fora de beta/' in str(error)
        else:
            raise AssertionError('Publicação Beta deveria bloquear alteração da Oficial')
    finally:
        publication.shutil.copytree = original_copytree
        publication.validate_beta = original_validate


def test_workflow_contract():
    text = WORKFLOW.read_text(encoding='utf-8')
    assert 'branches: ["development", "stable"]' in text
    assert 'development) echo "PUBLICATION_TARGET=beta"' in text
    assert 'stable) echo "PUBLICATION_TARGET=official"' in text
    assert 'prepare_environments.py' not in text
    assert 'find . -mindepth' not in text
    assert 'sync-beta' in text and 'sync-official' in text
    assert "not path.startswith('beta/')" in text
    assert "path.startswith('beta/')" in text


if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='cronometro-publication-isolation-') as directory:
        temporary = Path(directory)
        test_beta(temporary / 'basic-beta')
        test_official(temporary / 'basic-official')
        test_manifest_rejections(temporary / 'manifest-rejections')
        test_manifest_atomicity_and_symlink(temporary / 'manifest-safety')
        test_valid_manifest_cleanup(temporary / 'manifest-valid')
        test_sync_guards(temporary / 'sync-guards')
    test_workflow_contract()
    print('Isolamento de publicação Beta/Oficial: OK')
