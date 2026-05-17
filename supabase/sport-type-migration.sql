-- Normalize Strava detailed sport types → broad categories used by race.sport_types
-- Run this BEFORE re-syncing so existing rows are corrected too

UPDATE activity_logs SET sport_type = 'Run'  WHERE sport_type IN ('TrailRun','VirtualRun','Treadmill');
UPDATE activity_logs SET sport_type = 'Ride' WHERE sport_type IN ('VirtualRide','EBikeRide','MountainBikeRide','GravelRide','Handcycle');
UPDATE activity_logs SET sport_type = 'Swim' WHERE sport_type IN ('OpenWaterSwim');
