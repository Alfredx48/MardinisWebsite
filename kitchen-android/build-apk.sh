#!/usr/bin/env bash
# Builds the Kitchen app for Android.
#
#   ./build-apk.sh                 signed release APK (loads https://mardinismenlopark.com/kitchen)
#   ./build-apk.sh --install       ...and installs it on the tablet plugged into Windows by USB
#   KITCHEN_URL=https://<id>.ngrok-free.app/kitchen ./build-apk.sh --dev [--install]
#                                  "Kitchen Dev" APK against your local server, installed next to the real app
#
# The APK lands in kitchen-android/dist/. Release signing reads ~/keys/mardinis-kitchen.properties
# (or $KITCHEN_KEYSTORE_PROPERTIES). Needs JDK 21 and the Android SDK; the defaults below are
# where they were installed on this machine.
set -euo pipefail
cd "$(dirname "$0")"

export JAVA_HOME="${JAVA_HOME:-$HOME/.local/share/jdk/jdk-21.0.12.1+1}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/.local/share/android-sdk}"
export PATH="$JAVA_HOME/bin:$PATH"
ADB="${ADB:-/mnt/c/Users/Alfred/AppData/Local/Android/platform-tools/adb.exe}"

dev=false
install=false
for arg in "$@"; do
	case "$arg" in
		--dev) dev=true ;;
		--install) install=true ;;
		*) echo "Unknown option: $arg" >&2; exit 1 ;;
	esac
done

if $dev; then
	if [[ -z "${KITCHEN_URL:-}" ]]; then
		echo "--dev needs KITCHEN_URL, e.g. KITCHEN_URL=https://abc123.ngrok-free.app/kitchen" >&2
		exit 1
	fi
	task=assembleDebug
	built=android/app/build/outputs/apk/debug/app-debug.apk
	out=dist/kitchen-dev.apk
else
	if [[ -n "${KITCHEN_URL:-}" ]]; then
		echo "KITCHEN_URL is set; a release APK always loads the live site. Unset it, or use --dev." >&2
		exit 1
	fi
	props="${KITCHEN_KEYSTORE_PROPERTIES:-$HOME/keys/mardinis-kitchen.properties}"
	if [[ ! -f "$props" ]]; then
		echo "Missing $props (the signing keystore details). See ANDROID-PLAN.md / HANDOFF.md." >&2
		exit 1
	fi
	task=assembleRelease
	built=android/app/build/outputs/apk/release/app-release.apk
	out=dist/kitchen.apk
fi

[[ -d node_modules ]] || npm ci
# Writes capacitor.config.json (with the URL to load) into the Android project.
npx cap sync android
(cd android && ./gradlew --quiet "$task")

mkdir -p dist
cp "$built" "$out"
echo "Built $out"

if $install; then
	# Windows adb sees the USB tablet; it needs a Windows path to the APK.
	"$ADB" install -r "$(wslpath -w "$out")"
fi
