import SwiftUI

struct WatchWorkoutView: View {
    @EnvironmentObject private var workout: WatchWorkoutManager
    @State private var confirmFinish = false
    @State private var confirmDiscard = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("SAGE").font(.caption.bold()).foregroundStyle(Color("SageAccent"))
                Text(workout.isActive ? "Outdoor run" : "Your next run").font(.title3.bold())
                if workout.isActive || workout.phase == .saved {
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        Text(workout.elapsed(at: context.date)).font(.system(size: 34, weight: .semibold, design: .rounded)).monospacedDigit()
                    }
                    HStack {
                        metric("KM", String(format: "%.2f", workout.distance / 1000))
                        Spacer()
                        metric("BPM", workout.heartRate.map { String(Int($0.rounded())) } ?? "—")
                    }
                    metric("AVG / KM", workout.averagePace)
                    Text(workout.routeStatus).font(.caption2).foregroundStyle(.secondary)
                }
                if let message = workout.message {
                    Text(message).font(.caption).accessibilityLabel(message)
                }
                switch workout.phase {
                case .idle:
                    Text("Record GPS and heart rate on your Watch. Save to Apple Health, then open Sage on your paired iPhone to sync.").font(.caption).foregroundStyle(.secondary)
                    Button("Start outdoor run", systemImage: "figure.run") { workout.start() }.tint(Color("SageAccent"))
                case .authorizing:
                    ProgressView("Check permissions…")
                case .recording, .paused:
                    Button(workout.phase == .paused ? "Resume" : "Pause", systemImage: workout.phase == .paused ? "play.fill" : "pause.fill") { workout.togglePause() }
                    Button("Finish & save", systemImage: "stop.fill") { confirmFinish = true }.tint(Color("SageAccent"))
                    Button("Discard", role: .destructive) { confirmDiscard = true }
                case .saving:
                    ProgressView("Saving to Health…")
                case .saved:
                    Text("Open Sage on your iPhone after Apple Health syncs. Connect Apple Health in Sage to import this run for review.").font(.caption).foregroundStyle(.secondary)
                    Button("Done") { workout.reset() }
                case .saveFailed:
                    Text("This run has not been confirmed saved. Check the Health app on your iPhone.").font(.caption)
                    Button("Done") { workout.reset() }
                }
            }.padding(.horizontal, 4)
        }
        .confirmationDialog("Finish and save this run?", isPresented: $confirmFinish) {
            Button("Save run") { workout.finish() }
        }
        .confirmationDialog("Discard this run? This cannot be undone.", isPresented: $confirmDiscard) {
            Button("Discard run", role: .destructive) { workout.discard() }
        }
    }

    private func metric(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.caption2).foregroundStyle(.secondary)
            Text(value).font(.title2.bold()).monospacedDigit()
        }
    }
}
