#!/usr/bin/env python3
"""Inject runtime permissions/features into the Flutter-generated
AndroidManifest.xml after `flutter create`. Idempotent."""
import re
import sys

MANIFEST = "android/app/src/main/AndroidManifest.xml"

PERMS = [
    'android.permission.CAMERA',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.VIBRATE',
]
FEATURES = [
    ('android.hardware.camera', 'false'),
    ('android.hardware.camera.autofocus', 'false'),
]


def main() -> int:
    with open(MANIFEST, "r", encoding="utf-8") as fh:
        xml = fh.read()

    inject = []
    for p in PERMS:
        if p not in xml:
            inject.append(f'    <uses-permission android:name="{p}"/>')
    for name, req in FEATURES:
        if f'android:name="{name}"' not in xml:
            inject.append(
                f'    <uses-feature android:name="{name}" '
                f'android:required="{req}"/>'
            )

    if inject:
        block = "\n".join(inject) + "\n"
        # Insert right after the opening <manifest ...> tag.
        xml = re.sub(r"(<manifest[^>]*>\s*)", r"\1\n" + block, xml, count=1)

    with open(MANIFEST, "w", encoding="utf-8") as fh:
        fh.write(xml)

    print("Patched AndroidManifest.xml")
    print(xml)
    return 0


if __name__ == "__main__":
    sys.exit(main())
