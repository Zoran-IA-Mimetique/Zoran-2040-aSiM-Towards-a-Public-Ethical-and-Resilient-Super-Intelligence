#!/usr/bin/env python3
"""Patch the Flutter-generated Android project after `flutter create`:
- inject runtime permissions/features into AndroidManifest.xml
- pin compileSdk/minSdk in app/build.gradle[.kts] so plugins that require
  compileSdk >= 34 (geocoding, ml kit, etc.) build cleanly.
Idempotent."""
import os
import re
import sys

MANIFEST = "android/app/src/main/AndroidManifest.xml"
GRADLE_KTS = "android/app/build.gradle.kts"
GRADLE_GROOVY = "android/app/build.gradle"
ROOT_KTS = "android/build.gradle.kts"
ROOT_GROOVY = "android/build.gradle"

COMPILE_SDK = 36
MIN_SDK = 23

ZRN_MARKER = "ZRN: force plugin subprojects compileSdk"

ROOT_BLOCK_KTS = f"""

// {ZRN_MARKER}
subprojects {{
    afterEvaluate {{
        extensions.findByName("android")?.withGroovyBuilder {{
            "compileSdkVersion"({COMPILE_SDK})
        }}
    }}
}}
"""

ROOT_BLOCK_GROOVY = f"""

// {ZRN_MARKER}
subprojects {{
    afterEvaluate {{ proj ->
        if (proj.hasProperty('android')) {{
            proj.android {{
                compileSdkVersion {COMPILE_SDK}
            }}
        }}
    }}
}}
"""

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


def patch_gradle() -> None:
    """Replace `flutter.compileSdkVersion`/`minSdkVersion` references with
    explicit values, in either the Kotlin or Groovy Gradle DSL."""
    path = GRADLE_KTS if os.path.exists(GRADLE_KTS) else GRADLE_GROOVY
    if not os.path.exists(path):
        print(f"WARNING: no gradle file found ({GRADLE_KTS} / {GRADLE_GROOVY})")
        return
    with open(path, "r", encoding="utf-8") as fh:
        g = fh.read()

    subs = [
        # Kotlin DSL: `compileSdk = flutter.compileSdkVersion`
        (r"compileSdk\s*=\s*flutter\.compileSdkVersion",
         f"compileSdk = {COMPILE_SDK}"),
        (r"minSdk\s*=\s*flutter\.minSdkVersion",
         f"minSdk = {MIN_SDK}"),
        # Groovy DSL: `compileSdk flutter.compileSdkVersion`
        (r"compileSdkVersion\s+flutter\.compileSdkVersion",
         f"compileSdk {COMPILE_SDK}"),
        (r"compileSdk\s+flutter\.compileSdkVersion",
         f"compileSdk {COMPILE_SDK}"),
        (r"minSdkVersion\s+flutter\.minSdkVersion",
         f"minSdk {MIN_SDK}"),
        (r"minSdk\s+flutter\.minSdkVersion",
         f"minSdk {MIN_SDK}"),
    ]
    for pat, repl in subs:
        g = re.sub(pat, repl, g)

    with open(path, "w", encoding="utf-8") as fh:
        fh.write(g)
    print(f"Patched {path} (compileSdk={COMPILE_SDK}, minSdk={MIN_SDK})")
    print(g)


def patch_root_gradle() -> None:
    """Append a subprojects block to the ROOT gradle file forcing every
    plugin module (geocoding_android, etc.) to compile against a recent SDK.
    Some plugins pin an old compileSdk (e.g. 33) internally, which fails
    AGP's strict dependency check. Idempotent."""
    if os.path.exists(ROOT_KTS):
        path, block = ROOT_KTS, ROOT_BLOCK_KTS
    elif os.path.exists(ROOT_GROOVY):
        path, block = ROOT_GROOVY, ROOT_BLOCK_GROOVY
    else:
        print(f"WARNING: no root gradle file ({ROOT_KTS} / {ROOT_GROOVY})")
        return

    with open(path, "r", encoding="utf-8") as fh:
        content = fh.read()
    if ZRN_MARKER in content:
        print(f"Root gradle already patched ({path})")
        return

    snippet = block.strip() + "\n\n"
    # Our afterEvaluate hooks must be registered BEFORE Flutter's
    # `subprojects { project.evaluationDependsOn(":app") }` block forces
    # evaluation; otherwise Gradle throws "project is already evaluated".
    idx = content.find("evaluationDependsOn")
    if idx != -1:
        sub_idx = content.rfind("subprojects", 0, idx)
        if sub_idx == -1:
            sub_idx = idx
        content = content[:sub_idx] + snippet + content[sub_idx:]
    else:
        content = content + "\n" + snippet

    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)
    print(f"Patched root {path} (subprojects compileSdk={COMPILE_SDK})")


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

    patch_gradle()
    patch_root_gradle()
    return 0


if __name__ == "__main__":
    sys.exit(main())
