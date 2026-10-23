import SwiftUI

@main
struct SageWatchApp: App {
    @StateObject private var workout = WatchWorkoutManager()

    var body: some Scene {
        WindowGroup { WatchWorkoutView().environmentObject(workout) }
    }
}
