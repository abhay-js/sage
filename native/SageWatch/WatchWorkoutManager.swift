import Foundation
import HealthKit
import CoreLocation

@MainActor
final class WatchWorkoutManager: NSObject, ObservableObject {
    enum Phase { case idle, authorizing, recording, paused, saving, saved, saveFailed }
    @Published private(set) var phase: Phase = .idle
    @Published private(set) var distance: Double = 0
    @Published private(set) var heartRate: Double?
    @Published private(set) var message: String?
    @Published private(set) var routeStatus = "Waiting for GPS…"

    private let health = HKHealthStore()
    private let location = CLLocationManager()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var route: HKWorkoutRouteBuilder?
    private var routeQueue: Task<Void, Never>?
    private var routeCount = 0
    private var routeFailed = false
    private var waitingForLocation = false
    private var discarded = false
    private var startDate: Date?
    private var endDate: Date?

    var isActive: Bool { [.recording, .paused, .saving].contains(phase) }
    var averagePace: String {
        guard distance > 0, let builder else { return "—" }
        let seconds = Int((builder.elapsedTime / (distance / 1000)).rounded())
        return "\(seconds / 60):\(String(format: "%02d", seconds % 60))"
    }

    override init() {
        super.init()
        location.delegate = self
        location.desiredAccuracy = kCLLocationAccuracyBest
        location.activityType = .fitness
        location.distanceFilter = 5
    }

    func elapsed(at date: Date) -> String {
        let seconds = Int(max(0, builder?.elapsedTime ?? 0))
        return seconds >= 3600
            ? String(format: "%d:%02d:%02d", seconds / 3600, seconds / 60 % 60, seconds % 60)
            : String(format: "%02d:%02d", seconds / 60, seconds % 60)
    }

    func start() {
        guard phase == .idle else { return }
        guard HKHealthStore.isHealthDataAvailable() else { message = "Health is unavailable on this Watch."; return }
        phase = .authorizing
        message = nil
        let types: Set<HKSampleType> = [HKObjectType.workoutType(), HKSeriesType.workoutRoute(), HKQuantityType(.heartRate), HKQuantityType(.distanceWalkingRunning), HKQuantityType(.activeEnergyBurned)]
        Task {
            do {
                try await health.requestAuthorization(toShare: types, read: Set(types.map { $0 as HKObjectType }))
                guard health.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized,
                      health.authorizationStatus(for: HKSeriesType.workoutRoute()) == .sharingAuthorized else {
                    throw WatchError("Allow Sage to save Workouts and Workout Routes in Health before recording.")
                }
                waitingForLocation = true
                switch location.authorizationStatus {
                case .authorizedAlways, .authorizedWhenInUse: begin()
                case .notDetermined: location.requestWhenInUseAuthorization()
                default: throw WatchError("Allow precise location for Sage in your Watch settings, then try again.")
                }
            } catch { failBeforeStart(error.localizedDescription) }
        }
    }

    private func begin() {
        guard waitingForLocation, phase == .authorizing else { return }
        waitingForLocation = false
        guard location.accuracyAuthorization == .fullAccuracy else {
            failBeforeStart("Enable Precise Location for Sage to record a run route."); return
        }
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .running
        configuration.locationType = .outdoor
        do {
            let session = try HKWorkoutSession(healthStore: health, configuration: configuration)
            let builder = session.associatedWorkoutBuilder()
            self.session = session
            self.builder = builder
            route = HKWorkoutRouteBuilder(healthStore: health, device: .local())
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: health, workoutConfiguration: configuration)
            session.delegate = self
            builder.delegate = self
            let now = Date()
            startDate = now
            session.startActivity(with: now)
            builder.beginCollection(withStart: now) { success, error in
                Task { @MainActor in
                    guard success, error == nil else {
                        self.discard(reason: error?.localizedDescription ?? "Could not start this workout.")
                        return
                    }
                    guard !self.discarded else { return }
                    self.phase = .recording
                    self.location.startUpdatingLocation()
                }
            }
        } catch { failBeforeStart(error.localizedDescription) }
    }

    func togglePause() {
        if phase == .recording { session?.pause() }
        else if phase == .paused { session?.resume() }
    }

    func finish() {
        guard phase == .recording || phase == .paused else { return }
        phase = .saving
        endDate = Date()
        location.stopUpdatingLocation()
        session?.end()
    }

    func discard(reason: String? = nil) {
        discarded = true
        location.stopUpdatingLocation()
        session?.end()
        builder?.discardWorkout()
        // Drain pending location writes before releasing the route builder.
        let pending = routeQueue
        phase = .saving
        Task {
            await pending?.value
            reset()
            message = reason
        }
    }

    func reset() {
        session?.delegate = nil
        builder?.delegate = nil
        session = nil; builder = nil; route = nil; routeQueue = nil
        distance = 0; heartRate = nil; routeCount = 0; routeFailed = false
        startDate = nil; endDate = nil; discarded = false; waitingForLocation = false
        message = nil; routeStatus = "Waiting for GPS…"; phase = .idle
    }

    private func failBeforeStart(_ text: String) {
        waitingForLocation = false
        phase = .idle
        message = text
    }

    private func save() async {
        guard !discarded, let builder, let endDate else { return }
        do {
            try await builder.endCollection(at: endDate)
            await routeQueue?.value
            guard !discarded else { return }
            guard let workout = try await builder.finishWorkout() else { throw WatchError("Health did not return a saved workout.") }
            // The workout is already saved: a route failure must never save it twice.
            if let route, routeCount >= 2 {
                do {
                    try await route.finishRoute(with: workout, metadata: nil)
                    message = routeFailed ? "Run saved. Some GPS samples could not be saved." : "Run and GPS route saved to Apple Health."
                } catch { message = "Run saved, but the GPS route could not be saved: \(error.localizedDescription)" }
            } else { message = "Run saved without a map. No usable GPS route was captured." }
            phase = .saved
        } catch {
            message = "Could not save the run: \(error.localizedDescription). Check Apple Health before recording again."
            phase = .saveFailed
        }
    }

    private struct WatchError: LocalizedError {
        let text: String
        init(_ text: String) { self.text = text }
        var errorDescription: String? { text }
    }
}

extension WatchWorkoutManager: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            guard self.waitingForLocation else { return }
            switch manager.authorizationStatus {
            case .authorizedAlways, .authorizedWhenInUse: self.begin()
            case .denied, .restricted: self.failBeforeStart("Location permission is required to record your GPS route.")
            default: break
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            guard self.phase == .recording, let route = self.route, let start = self.startDate else { return }
            let valid = locations.filter {
                CLLocationCoordinate2DIsValid($0.coordinate) && $0.horizontalAccuracy >= 0 && $0.horizontalAccuracy <= 50 && $0.timestamp >= start && abs($0.timestamp.timeIntervalSinceNow) <= 15
            }
            guard !valid.isEmpty else { return }
            let previous = self.routeQueue
            self.routeQueue = Task {
                await previous?.value
                do {
                    try await route.insertRouteData(valid)
                    self.routeCount += valid.count
                    self.routeStatus = "GPS recording · \(self.routeCount) points"
                } catch {
                    self.routeFailed = true
                    self.routeStatus = "GPS data could not be saved."
                }
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.routeStatus = "GPS unavailable. Move outdoors and check Location permissions." }
    }
}

extension WatchWorkoutManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
        Task { @MainActor in
            guard self.session === workoutSession, !self.discarded else { return }
            switch toState {
            case .paused:
                self.phase = .paused
                self.location.stopUpdatingLocation()
            case .running:
                if self.phase == .paused { self.phase = .recording; self.location.startUpdatingLocation() }
            case .ended:
                guard self.phase != .saved else { return }
                self.phase = .saving
                self.endDate = self.endDate ?? date
                self.location.stopUpdatingLocation()
                await self.save()
            default: break
            }
        }
    }

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        Task { @MainActor in
            guard self.session === workoutSession else { return }
            self.discard(reason: "Workout stopped: \(error.localizedDescription)")
        }
    }
}

extension WatchWorkoutManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        Task { @MainActor in
            guard self.builder === workoutBuilder else { return }
            for type in collectedTypes {
                guard let type = type as? HKQuantityType, let statistics = workoutBuilder.statistics(for: type) else { continue }
                switch type.identifier {
                case HKQuantityTypeIdentifier.heartRate.rawValue:
                    self.heartRate = statistics.mostRecentQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
                case HKQuantityTypeIdentifier.distanceWalkingRunning.rawValue:
                    self.distance = statistics.sumQuantity()?.doubleValue(for: .meter()) ?? 0
                default: break
                }
            }
        }
    }
}
