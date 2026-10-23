# Activity charts

Open Activity and select a workout. The existing Sage theme now includes a workout overview, tappable heart-rate chart, pace (run/walk/hike/swim) or speed (cycling), elevation and GPS-derived splits. Existing map and challenge scoring breakdowns remain available.

Heart-rate samples are queried from Apple Health over the precise workout time window. GPS route timestamps, speed and altitude supply the other charts. The data stays on the athlete’s iPhone; no database migration or new native dependency is required. Web and non-Health imports retain summary metrics with an explanation that detailed samples are unavailable.

Average pace is duration divided by recorded distance, in min/km or min/100m. Speed is km/h. Splits interpolate distance boundaries along contiguous GPS points and include elapsed time. Missing route intervals end a partial split; stopped pace segments are omitted. An average heart rate or distance total alone is never expanded into an invented graph.

Validation: TypeScript and static web export pass. `scripts/test-activity-metrics.cjs` checks time bounds, invalid/outside/duplicate heart-rate samples, speed/pace conversion, split interpolation, stationary segments and route gaps. Real Health permissions and samples require verification on the athlete’s iPhone.
