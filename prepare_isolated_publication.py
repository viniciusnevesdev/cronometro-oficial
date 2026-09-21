#!/usr/bin/env python3
"""Build e sincronização isolados dos pacotes público Beta e Oficial."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PureWindowsPath
import re
import shutil


ROOT = Path(__file__).resolve().parent
REMOTE_LAYERS = ('presentation-ui.js', 'presentation.css', 'analytics-ui.js', 'analytics.css')
PUBLIC_EXCLUDES = {'.git', '.github', '_source'}
PROTECTED_PUBLIC_NAMES = {
    '.codex-reports', '.git', '.github', '.official-assets.json',
    '_source', 'ambientes.json', 'beta', 'CNAME', 'diagnostico',
    'historico-versoes.html', 'menu', 'menu.html', 'simple', 'versoes',
    'beta-demo-data.json', 'beta-tools.js', 'beta-patches.js',
}
OFFICIAL_ASSET_SUFFIXES = {'.html', '.css', '.js', '.json', '.webmanifest', '.svg', '.png', '.txt'}


def write_json(path: Path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def resize_png(src: Path, dst: Path, size: int):
    from PIL import Image

    with Image.open(src) as image:
        image = image.convert('RGBA').resize((size, size), Image.Resampling.LANCZOS)
        image.save(dst, format='PNG', optimize=True)


def inject_icons(path: Path, icon192: str, touch180: str):
    if not path.exists():
        return
    text = path.read_text(encoding='utf-8')
    text = re.sub(r'\s*<link\s+rel=["\']apple-touch-icon["\'][^>]*>', '', text, flags=re.I)
    text = re.sub(r'\s*<link\s+rel=["\']icon["\'][^>]*>', '', text, flags=re.I)
    tags = (
        f'\n  <link rel="icon" type="image/png" sizes="192x192" href="{icon192}">\n'
        f'  <link rel="apple-touch-icon" sizes="180x180" href="{touch180}">\n'
    )
    path.write_text(text.replace('</head>', tags + '</head>', 1), encoding='utf-8')


def inject_boot(index_path: Path, release: str, beta_mode: bool):
    text = index_path.read_text(encoding='utf-8')
    inline = f'window.APP_RELEASE={json.dumps(release, ensure_ascii=False)};'
    if beta_mode:
        inline += 'window.__CRONOMETRO_DISABLE_SW__=true;'
        inline += "setTimeout(()=>{const t=(p,m)=>Promise.race([p,new Promise(r=>setTimeout(()=>r(null),m))]);(async()=>{try{const base=new URL('./',location.href).pathname;if('serviceWorker'in navigator){const regs=await t(navigator.serviceWorker.getRegistrations(),500);if(Array.isArray(regs))Promise.allSettled(regs.filter(x=>{try{return new URL(x.scope).pathname===base}catch(_){return false}}).map(x=>x.unregister()));}if('caches'in window){const keys=await t(caches.keys(),500);if(Array.isArray(keys))Promise.allSettled(keys.filter(k=>k.startsWith('cronometro-beta-')).map(k=>caches.delete(k)));}}catch(_){}})();},0);"
    text = re.sub(r'\s*<!-- cronometro-public-runtime -->.*?<!-- /cronometro-public-runtime -->\s*', '\n', text, flags=re.S)
    text = re.sub(r'\s*<script>window\.APP_RELEASE=.*?</script>\s*<script src="\./boot-resilient\.js"></script>', '', text, flags=re.S)
    runtime = (
        '\n  <!-- cronometro-public-runtime -->\n'
        f'  <script>{inline}</script>\n'
        '  <script src="./boot-resilient.js"></script>\n'
        '  <!-- /cronometro-public-runtime -->\n'
    )
    marker = '<script src="./cronometro-v080-01.js"></script>'
    if marker not in text:
        raise SystemExit(f'Primeiro script do motor não encontrado em {index_path}')
    index_path.write_text(text.replace(marker, runtime + '  ' + marker, 1), encoding='utf-8')


def build_manifest(path: Path, name: str, icon192: str, icon512: str):
    data = json.loads(path.read_text(encoding='utf-8'))
    data.update({'name': name, 'short_name': name, 'id': './', 'start_url': './', 'scope': './', 'display': 'standalone'})
    data['icons'] = [
        {'src': icon192, 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': icon512, 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
    ]
    write_json(path, data)


def root_assets(folder: Path, include_special: bool):
    allowed = {'.html', '.css', '.js', '.json', '.webmanifest', '.svg', '.png', '.txt'}
    items = ['./']
    for path in sorted(folder.iterdir(), key=lambda item: item.name):
        if path.is_file() and path.suffix.lower() in allowed and path.name != 'sw.js':
            items.append('./' + path.name)
    if include_special:
        if (folder / 'menu' / 'index.html').exists():
            items.append('./menu/index.html')
        if (folder / 'diagnostico' / 'index.html').exists():
            items.append('./diagnostico/index.html')
    return list(dict.fromkeys(items))


def service_worker_text(cache_name: str, assets, beta_mode: bool):
    return f"""'use strict';
const CACHE={json.dumps(cache_name)};
const BETA_MODE={'true' if beta_mode else 'false'};
const ASSETS={json.dumps(assets, ensure_ascii=False, indent=2)};
const SCOPE_PATH=new URL(self.registration.scope).pathname;

self.addEventListener('install',event=>{{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
}});
self.addEventListener('activate',event=>{{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>{{
      if(BETA_MODE)return key.startsWith('cronometro-beta-')&&key!==CACHE;
      return key.startsWith('cronometro-')&&!key.startsWith('cronometro-beta-')&&key!==CACHE;
    }}).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
}});

function relPath(url){{
  return url.pathname.startsWith(SCOPE_PATH)?url.pathname.slice(SCOPE_PATH.length):url.pathname;
}}
function isSpecialNavigation(url){{
  const rel=relPath(url);
  if(!BETA_MODE&&(rel.startsWith('beta/')||rel.startsWith('simple/')))return true;
  return rel==='menu.html'||rel.startsWith('menu/')||rel.startsWith('diagnostico/')||rel==='launch.html'||rel==='recover.html'||rel==='safe.html';
}}
async function networkFirst(request, fallbackIndex=false){{
  try{{
    const response=await fetch(request);
    if(response&&response.ok){{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{{}});
    }}
    return response;
  }}catch(error){{
    const hit=await caches.match(request,{{ignoreSearch:true}});
    if(hit)return hit;
    if(fallbackIndex){{
      const fallback=await caches.match('./index.html');
      if(fallback)return fallback;
    }}
    throw error;
  }}
}}
self.addEventListener('fetch',event=>{{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  const rel=relPath(url);
  if(!BETA_MODE&&rel.startsWith('beta/')){{
    event.respondWith(fetch(event.request));
    return;
  }}
  if(event.request.mode==='navigate'){{
    if(isSpecialNavigation(url)){{
      event.respondWith(networkFirst(event.request,false));
      return;
    }}
    event.respondWith(networkFirst(event.request,true));
    return;
  }}
  event.respondWith(networkFirst(event.request,false).catch(()=>caches.match(event.request,{{ignoreSearch:true}})));
}});
"""


def fresh_copy(source: Path, output: Path):
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(source, output)


def build_beta(source: Path, output: Path, release: str):
    fresh_copy(source, output)
    shutil.copy2(ROOT / 'app-icon-beta-192.png', output / 'app-icon-beta-192.png')
    resize_png(ROOT / 'app-icon-beta-192.png', output / 'app-icon-beta-512.png', 512)
    resize_png(ROOT / 'app-icon-beta-192.png', output / 'apple-touch-icon-beta.png', 180)
    shutil.copy2(ROOT / 'boot-resilient.js', output / 'boot-resilient.js')

    core = output / 'cronometro-v080-01.js'
    text = core.read_text(encoding='utf-8')
    official_db = "const DB_NAME='cronometro_local_v1';"
    if official_db not in text:
        raise SystemExit('DB_NAME Oficial não localizado para isolar a Beta')
    core.write_text(text.replace(official_db, "const DB_NAME='cronometro_beta_v1';", 1), encoding='utf-8')

    registration = output / 'cronometro-v080-09.js'
    text = registration.read_text(encoding='utf-8')
    old = "if('serviceWorker' in navigator){"
    new = "if('serviceWorker' in navigator&&!window.__CRONOMETRO_DISABLE_SW__){"
    if new not in text:
        if old not in text:
            raise SystemExit('Registro de Service Worker da Beta não localizado')
        registration.write_text(text.replace(old, new, 1), encoding='utf-8')

    (output / 'beta-tools.js').write_text((ROOT / 'beta-tools.js').read_text(encoding='utf-8').replace('__BETA_RELEASE__', release), encoding='utf-8')
    for name in ('beta-patches.js',):
        shutil.copy2(ROOT / name, output / name)
    for name in ('launch.html', 'recover.html', 'safe.html'):
        (output / name).write_text((ROOT / name).read_text(encoding='utf-8').replace('__RELEASE__', release), encoding='utf-8')

    index = output / 'index.html'
    text = index.read_text(encoding='utf-8').replace('<title>Cronômetro</title>', '<title>Cronômetro Beta</title>', 1)
    text = text.replace('content="Cronômetro"', 'content="Cronômetro Beta"')
    if 'name="robots"' not in text:
        text = text.replace('<meta charset="utf-8" />', '<meta charset="utf-8" />\n  <meta name="robots" content="noindex,nofollow" />', 1)
    if 'beta-tools.js' not in text:
        text = text.replace('</body>', f'  <script src="./beta-tools.js?v={release}" defer></script>\n  <script src="./beta-patches.js?v={release}" defer></script>\n</body>', 1)
    index.write_text(text, encoding='utf-8')
    inject_boot(index, release, True)
    for name in ('index.html', 'launch.html', 'recover.html', 'safe.html'):
        inject_icons(output / name, './app-icon-beta-192.png', './apple-touch-icon-beta.png')
    build_manifest(output / 'manifest.webmanifest', 'Cronômetro Beta', './app-icon-beta-192.png', './app-icon-beta-512.png')
    write_json(output / 'version.json', {'version': release})
    write_json(output / 'environment.json', {
        'environment': 'beta', 'release': release, 'branch': 'development',
        'database': 'cronometro_beta_v1', 'production_database': 'cronometro_local_v1',
        'writes_to_production': False, 'copy_direction': 'production-to-beta-only',
        'service_worker_registration': 'disabled-during-development',
    })
    (output / 'sw.js').write_text(service_worker_text(f'cronometro-beta-{release}-public-2', root_assets(output, False), True), encoding='utf-8')
    validate_beta(output)


def validate_beta(beta: Path):
    index = (beta / 'index.html').read_text(encoding='utf-8')
    core = (beta / 'cronometro-v080-01.js').read_text(encoding='utf-8')
    registration = (beta / 'cronometro-v080-09.js').read_text(encoding='utf-8')
    required = ('cronometro-v092-advanced-analytics.js', 'cronometro-v092-advanced-analytics.css', 'app-icon-beta-192.png', 'app-icon-beta-512.png', 'apple-touch-icon-beta.png')
    missing = [name for name in required if not (beta / name).is_file()]
    forbidden = [name for name in REMOTE_LAYERS if (beta / name).exists() or f'./{name}' in index]
    if missing or forbidden:
        raise SystemExit(f'Beta inválida; ausentes={missing}; camadas remotas={forbidden}')
    if "const DB_NAME='cronometro_beta_v1';" not in core or "const DB_NAME='cronometro_local_v1';" in core:
        raise SystemExit('Banco da Beta não está isolado')
    if '__CRONOMETRO_DISABLE_SW__=true' not in index or '!window.__CRONOMETRO_DISABLE_SW__' not in registration:
        raise SystemExit('Proteção de Service Worker da Beta ausente')


def copy_public_snapshot(public: Path, output: Path):
    if output.exists():
        shutil.rmtree(output)

    def ignore(directory, names):
        if Path(directory).resolve() == public.resolve():
            return [name for name in names if name in PUBLIC_EXCLUDES]
        return []

    shutil.copytree(public, output, ignore=ignore)


def is_allowed_official_asset(name: str):
    """Define o ownership Oficial: arquivo buildável top-level e não compartilhado."""
    if name in PROTECTED_PUBLIC_NAMES:
        return False
    if name == '.nojekyll':
        return True
    return Path(name).suffix.lower() in OFFICIAL_ASSET_SUFFIXES


def _manifest_error(message: str):
    raise SystemExit('Manifesto Oficial inválido: ' + message)


def _validate_official_asset_name(name, output: Path, public: Path | None = None):
    if not isinstance(name, str):
        _manifest_error('cada item de files deve ser string')
    if not name:
        _manifest_error('files não pode conter string vazia')
    if '/' in name or '\\' in name:
        _manifest_error(f'path deve ser basename top-level: {name!r}')
    if name in {'.', '..'} or Path(name).is_absolute() or PureWindowsPath(name).drive:
        _manifest_error(f'path absoluto ou de navegação proibido: {name!r}')
    path_name = Path(name)
    if path_name.name != name or path_name.parent != Path('.'):
        _manifest_error(f'path deve ser basename simples: {name!r}')
    if not is_allowed_official_asset(name):
        _manifest_error(f'asset fora da política de ownership Oficial: {name!r}')

    output_root = output.resolve(strict=False)
    target = output / name
    if target.is_symlink():
        _manifest_error(f'symlink não pode ser removido pelo manifesto: {name!r}')
    resolved_target = target.resolve(strict=False)
    if resolved_target.parent != output_root:
        _manifest_error(f'destino canônico não é filho direto da raiz Oficial: {name!r}')

    if public is not None:
        public_target = public / name
        if public_target.is_symlink():
            _manifest_error(f'symlink público não pode ser gerenciado pelo manifesto: {name!r}')
    return target


def validated_previous_official_assets(public: Path, output: Path):
    """Lê e valida o manifesto inteiro sem modificar public ou output."""
    manifest = public / '.official-assets.json'
    if not manifest.exists() and not manifest.is_symlink():
        return []
    if manifest.is_symlink() or not manifest.is_file():
        _manifest_error('.official-assets.json deve ser um arquivo regular')
    try:
        data = json.loads(manifest.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError, OSError) as error:
        _manifest_error(f'JSON ilegível ou malformado ({error})')
    if not isinstance(data, dict):
        _manifest_error('a raiz JSON deve ser um objeto')
    if 'files' not in data:
        _manifest_error('campo files ausente')
    files = data['files']
    if not isinstance(files, list):
        _manifest_error('campo files deve ser uma lista')

    validated = []
    seen = set()
    for name in files:
        _validate_official_asset_name(name, output, public)
        if name in seen:
            _manifest_error(f'files contém entrada duplicada: {name!r}')
        seen.add(name)
        validated.append(name)
    return validated


def remove_previous_official_assets(output: Path, names):
    """Resolve todos os destinos primeiro; só então remove arquivos validados."""
    targets = [_validate_official_asset_name(name, output) for name in names]
    for target in targets:
        if target.is_file():
            target.unlink()


def build_official(source: Path, public: Path, output: Path, release: str):
    previous_assets = validated_previous_official_assets(public, output)
    copy_public_snapshot(public, output)
    remove_previous_official_assets(output, previous_assets)

    source_files = []
    for path in source.iterdir():
        if path.is_file():
            shutil.copy2(path, output / path.name)
            source_files.append(path.name)
    for name in REMOTE_LAYERS:
        target = output / name
        if target.exists():
            target.unlink()

    shutil.copy2(ROOT / 'app-icon-192.png', output / 'app-icon-192.png')
    resize_png(ROOT / 'app-icon-192.png', output / 'app-icon-512.png', 512)
    resize_png(ROOT / 'app-icon-192.png', output / 'apple-touch-icon.png', 180)
    shutil.copy2(ROOT / 'boot-resilient.js', output / 'boot-resilient.js')
    for name in ('launch.html', 'recover.html', 'safe.html'):
        src = ROOT / name
        if src.exists():
            (output / name).write_text(src.read_text(encoding='utf-8').replace('__RELEASE__', release), encoding='utf-8')
    inject_boot(output / 'index.html', release, False)
    for name in ('index.html', 'launch.html', 'recover.html', 'safe.html'):
        inject_icons(output / name, './app-icon-192.png', './apple-touch-icon.png')
    build_manifest(output / 'manifest.webmanifest', 'Cronômetro', './app-icon-192.png', './app-icon-512.png')
    write_json(output / 'version.json', {'version': release})
    write_json(output / 'environment.json', {
        'environment': 'production', 'release': release, 'branch': 'stable',
        'database': 'cronometro_local_v1', 'stable': True, 'writes_to_beta': False,
    })
    (output / 'sw.js').write_text(service_worker_text(f'cronometro-official-{release}-public-3', root_assets(output, True), False), encoding='utf-8')
    official_files = sorted(set(source_files) | {'app-icon-192.png', 'app-icon-512.png', 'apple-touch-icon.png', 'boot-resilient.js', 'launch.html', 'recover.html', 'safe.html', 'version.json', 'environment.json', 'sw.js', '.nojekyll'})
    write_json(output / '.official-assets.json', {'release': release, 'files': official_files})
    validate_official(output)


def validate_official(site: Path):
    index = (site / 'index.html').read_text(encoding='utf-8')
    if "const DB_NAME='cronometro_local_v1';" not in (site / 'cronometro-v080-01.js').read_text(encoding='utf-8'):
        raise SystemExit('Banco Oficial não foi preservado')
    forbidden = [name for name in REMOTE_LAYERS if (site / name).exists() or f'./{name}' in index]
    if forbidden:
        raise SystemExit('Oficial ainda contém camadas remotas: ' + ', '.join(forbidden))


def file_map(root: Path, excluded=()):
    excluded = set(excluded)
    result = {}
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if relative.parts and relative.parts[0] in excluded:
            continue
        if path.is_file():
            result[relative.as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def sync_beta(built: Path, public: Path):
    validate_beta(built)
    before = file_map(public, {'beta', *PUBLIC_EXCLUDES})
    target = public / 'beta'
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(built, target)
    after = file_map(public, {'beta', *PUBLIC_EXCLUDES})
    if before != after:
        raise SystemExit('Sincronização Beta alterou arquivos fora de beta/')
    print(f'Beta sincronizada isoladamente: {len(file_map(target))} arquivos; Oficial byte a byte preservada.')


def sync_official(candidate: Path, public: Path):
    beta_before = file_map(public / 'beta') if (public / 'beta').exists() else {}
    beta_candidate = file_map(candidate / 'beta') if (candidate / 'beta').exists() else {}
    if beta_before != beta_candidate:
        raise SystemExit('Candidato Oficial não preservou beta/ byte a byte')

    excluded = {'beta', *PUBLIC_EXCLUDES}
    current = file_map(public, excluded)
    desired = file_map(candidate, excluded)
    for name in sorted(set(current) - set(desired)):
        (public / name).unlink()
    for name in sorted(desired):
        src, dst = candidate / name, public / name
        if current.get(name) != desired[name]:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
    for directory in sorted((path for path in public.rglob('*') if path.is_dir()), reverse=True):
        relative = directory.relative_to(public)
        if relative.parts and relative.parts[0] in excluded:
            continue
        if not any(directory.iterdir()):
            directory.rmdir()
    beta_after = file_map(public / 'beta') if (public / 'beta').exists() else {}
    if beta_before != beta_after:
        raise SystemExit('Sincronização Oficial alterou beta/')
    print(f'Oficial sincronizada isoladamente: {len(desired)} arquivos públicos verificados; Beta byte a byte preservada.')


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest='command', required=True)
    for command in ('build-beta', 'build-official'):
        sub = subparsers.add_parser(command)
        sub.add_argument('--source', type=Path, required=True)
        sub.add_argument('--output', type=Path, required=True)
        sub.add_argument('--release', required=True)
        if command == 'build-official':
            sub.add_argument('--public', type=Path, required=True)
    sync_beta_parser = subparsers.add_parser('sync-beta')
    sync_beta_parser.add_argument('--built', type=Path, required=True)
    sync_beta_parser.add_argument('--public', type=Path, required=True)
    sync_official_parser = subparsers.add_parser('sync-official')
    sync_official_parser.add_argument('--candidate', type=Path, required=True)
    sync_official_parser.add_argument('--public', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'build-beta':
        build_beta(args.source.resolve(), args.output.resolve(), args.release)
    elif args.command == 'build-official':
        build_official(args.source.resolve(), args.public.resolve(), args.output.resolve(), args.release)
    elif args.command == 'sync-beta':
        sync_beta(args.built.resolve(), args.public.resolve())
    else:
        sync_official(args.candidate.resolve(), args.public.resolve())


if __name__ == '__main__':
    main()
