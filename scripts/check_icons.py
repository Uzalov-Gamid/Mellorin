#!/usr/bin/env python3
"""Require 8-bit RGBA PNGs, including PNG payloads in ICO/ICNS files."""
import argparse
from pathlib import Path
import struct
import sys

PNG = b'\x89PNG\r\n\x1a\n'


def check_png(data, label):
    if (len(data) < 33 or data[:8] != PNG
            or data[8:16] != b'\x00\x00\x00\rIHDR'):
        raise ValueError(f'{label}: missing PNG IHDR')
    width, height, depth, color = struct.unpack('>IIBB', data[16:26])
    if not width or not height or (depth, color) != (8, 6):
        raise ValueError(f'{label}: expected 8-bit RGBA, got depth={depth}, color={color}')


def check_file(path):
    data = path.read_bytes()
    if path.suffix == '.png':
        check_png(data, path)
    elif path.suffix == '.ico':
        reserved, kind, count = struct.unpack_from('<HHH', data)
        if reserved or kind != 1 or not count:
            raise ValueError(f'{path}: invalid ICO header')
        for index in range(count):
            size, offset = struct.unpack_from('<II', data, 6 + index * 16 + 8)
            if offset + size > len(data):
                raise ValueError(f'{path}: truncated ICO entry')
            payload = data[offset:offset + size]
            if payload.startswith(PNG):
                check_png(payload, f'{path}: entry {index}')
    elif path.suffix == '.icns':
        if data[:4] != b'icns' or struct.unpack_from('>I', data, 4)[0] != len(data):
            raise ValueError(f'{path}: invalid ICNS header')
        offset = 8
        while offset < len(data):
            size = struct.unpack_from('>I', data, offset + 4)[0]
            if size < 8 or offset + size > len(data):
                raise ValueError(f'{path}: invalid ICNS chunk')
            payload = data[offset + 8:offset + size]
            if payload.startswith(PNG):
                check_png(payload, f'{path}: chunk {data[offset:offset + 4]!r}')
            offset += size


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', nargs='?', type=Path,
                        default=Path(__file__).resolve().parents[1] / 'src-tauri/icons')
    args = parser.parse_args()
    files = sorted(p for p in args.directory.rglob('*')
                   if p.suffix in {'.png', '.ico', '.icns'})
    if not any(p.suffix == '.png' for p in files):
        parser.error('no icon PNGs found')
    try:
        for path in files:
            check_file(path)
    except (ValueError, struct.error, OSError) as error:
        print(f'Icon check failed: {error}', file=sys.stderr)
        return 1
    print(f'Icon check passed ({len(files)} files)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
