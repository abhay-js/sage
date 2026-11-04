# Base camp and summit reference artwork

Source: the user-supplied `Base camp · before the start, Home theme` and
`Summit celebration · after the finish, Home theme` interactive HTML exports
in `claude design/`.

`scene.html` and `finale-scene.html` preserve the original SVG scenery layers.
The JPEGs are Chromium renders at 3× resolution (1170 × 1680 for the camp,
1170 × 1620 for the summit). This retains SVG turbulence, blur, displacement,
and blend modes that React Native SVG cannot reproduce consistently.

Only scenery is baked into the images. Headers, countdown, saved-profile
avatars, flame, confetti, results, controls and scrolling panels are native
components in `ChallengeLifecycleArt.tsx` and `ChallengeLifecycle.tsx`.
The four camp variants use the reference's morning, afternoon, evening and
night tint values. Athlete counts, ranks and rewards are supplied by app data.
