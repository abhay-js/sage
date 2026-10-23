# Sage Apple Watch app

The native SwiftUI companion in `native/SageWatch/` records an outdoor run using
HealthKit and Core Location. It shows active duration, distance, average pace and
available heart rate; supports pause/resume, save and confirmed discard; and
saves the workout and its recorded route to Apple Health. No Sage credentials
or backend keys are stored on the Watch.

The paired iPhone must receive the workout through Apple's Health sync. Open
Sage on that iPhone, enable Apple Health imports and allow Workout Routes access
when viewing the run. Import is not immediate and does not run continuously
while the iPhone app is closed. Watch workouts use the existing Health import
IDs, so importing again updates the same activity. Admin review still applies.
This companion does not recover routes missing from Garmin's Health export.

## Native setup

Requirements: Xcode with the watchOS platform installed, watchOS 10 or later,
and a paired compatible Watch for real sensor testing. Generated `ios/` files
are ignored; rerun this after an Expo clean prebuild:

```sh
npm run ios:share
npm run ios:watch
```

The script is idempotent. It creates the SageWatch target and shared scheme,
copies native sources, reuses the Sage icon and theme accent, and sets HealthKit
and workout background capabilities. Ordinary iPhone builds remain independent
of Watch tooling. Once the Watch platform is installed and testing is possible,
opt into embedding with `npm run ios:watch -- --embed`. Running the command
without `--embed` again disables embedding.
It does not contain private account credentials.

Build the phone scheme using a destination, without a global `-sdk iphoneos`
override (the dependency graph contains both iOS and watchOS targets):

```sh
xcodebuild -workspace ios/Sage.xcworkspace -scheme Sage \
  -configuration Release -destination 'generic/platform=iOS' \
  -allowProvisioningUpdates build
```

For the Watch alone, use the SageWatch scheme with a watchOS destination.
Install through Xcode on a paired Watch. Installing the iPhone app does not
prove the Watch app installed or that sensor data works.

## Required real-device verification

1. Allow Health workout/route writes and relevant reads, plus Precise Location.
   Denying permissions must show a clear message without starting a workout.
2. Record an outdoor run with the wrist down; verify heart rate, distance and
   GPS acquisition. Indoor workouts intentionally are not offered in this version.
3. Pause, move, resume and finish; verify active duration excludes paused time.
4. Confirm the run and map appear in Apple's Fitness/Health apps, then import
   in Sage on the paired iPhone. Check distance, duration, route and HR graph.
5. Sync again and confirm there is one imported activity. Confirm discard
   leaves no saved workout. Test permission revocation and poor GPS reception.

Current validation: Swift source passes SDK type checks for arm64 and arm64_32;
the existing Health import regression suite also accepts a Sage Watch run.
The full package build is blocked because macOS refused to install the watchOS
simulator runtime due to insufficient internal disk space. No Watch app has
been installed or tested on a real Watch.

This first version has no implemented session recovery after a process crash,
no live iPhone mirroring, no direct cloud upload and no Watch challenge UI.
Do not call it production-ready until real-device checks pass.
