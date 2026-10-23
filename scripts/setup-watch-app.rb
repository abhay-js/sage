require 'xcodeproj'
require 'fileutils'
require 'json'

root = File.expand_path('..', __dir__)
config = JSON.parse(File.read(File.join(root, 'app.json')))['expo']
bundle = config['ios']['bundleIdentifier']
project = Xcodeproj::Project.open(File.join(root, 'ios/Sage.xcodeproj'))
main = project.targets.find { |t| t.name == 'Sage' }
raise 'Missing Sage iOS target' unless main
team = main.build_configurations.map { |c| c.build_settings['DEVELOPMENT_TEAM'] }.compact.first
folder = File.join(root, 'ios/SageWatch')
FileUtils.mkdir_p(folder)
Dir.glob(File.join(root, 'native/SageWatch/*.swift')).each { |f| FileUtils.cp(f, folder) }
Xcodeproj::Plist.write_to_path({
  'CFBundleDisplayName' => 'Sage', 'CFBundleExecutable' => '$(EXECUTABLE_NAME)',
  'CFBundleIdentifier' => '$(PRODUCT_BUNDLE_IDENTIFIER)', 'CFBundleName' => '$(PRODUCT_NAME)',
  'CFBundlePackageType' => 'APPL', 'CFBundleShortVersionString' => config['version'], 'CFBundleVersion' => '1',
  'WKApplication' => true, 'WKCompanionAppBundleIdentifier' => bundle,
  'WKWatchOnly' => false, 'WKRunsIndependentlyOfCompanionApp' => true,
  'WKBackgroundModes' => ['workout-processing'],
  'NSHealthShareUsageDescription' => 'Sage reads your live workout, distance and heart rate to display run metrics.',
  'NSHealthUpdateUsageDescription' => 'Sage saves runs and GPS routes to Apple Health so your paired iPhone can import them.',
  'NSLocationWhenInUseUsageDescription' => 'Sage records the GPS route during your outdoor run.'
}, File.join(folder, 'Info.plist'))
Xcodeproj::Plist.write_to_path({ 'com.apple.developer.healthkit' => true, 'com.apple.developer.healthkit.access' => [] }, File.join(folder, 'SageWatch.entitlements'))

# Reuse the app theme, with watchOS system backgrounds for OLED readability.
accent = File.read(File.join(root, 'lib/theme.cjs')).match(/orange: '(#[0-9a-f]+)'/)[1]
assets = File.join(folder, 'Assets.xcassets')
color = File.join(assets, 'SageAccent.colorset')
FileUtils.mkdir_p(color)
rgb = accent.delete_prefix('#').scan(/../).map { |v| format('%.6f', v.to_i(16) / 255.0) }
File.write(File.join(assets, 'Contents.json'), JSON.pretty_generate({ 'info' => { 'author' => 'xcode', 'version' => 1 } }))
File.write(File.join(color, 'Contents.json'), JSON.pretty_generate({
  'info' => { 'author' => 'xcode', 'version' => 1 },
  'colors' => [{ 'idiom' => 'universal', 'color' => { 'color-space' => 'srgb', 'components' => { 'red' => rgb[0], 'green' => rgb[1], 'blue' => rgb[2], 'alpha' => '1.000000' } } }]
}))
icon = File.join(assets, 'AppIcon.appiconset')
FileUtils.mkdir_p(icon)
FileUtils.cp(File.join(root, 'assets/icon.png'), File.join(icon, 'AppIcon.png'))
File.write(File.join(icon, 'Contents.json'), JSON.pretty_generate({
  'info' => { 'author' => 'xcode', 'version' => 1 },
  'images' => [{ 'filename' => 'AppIcon.png', 'idiom' => 'universal', 'platform' => 'watchos', 'size' => '1024x1024' }]
}))

target = project.targets.find { |t| t.name == 'SageWatch' } || project.new_target(:application, 'SageWatch', :watchos, '10.0')
group = project.main_group.find_subpath('SageWatch', true)
group.set_source_tree('<group>'); group.set_path('SageWatch')
%w[SageWatchApp.swift WatchWorkoutView.swift WatchWorkoutManager.swift Info.plist SageWatch.entitlements Assets.xcassets].each do |file|
  ref = group.files.find { |f| f.path == file } || group.new_file(file)
  phase = file.end_with?('.swift') ? target.source_build_phase : file.end_with?('.xcassets') ? target.resources_build_phase : nil
  phase.add_file_reference(ref, true) if phase && !phase.files_references.include?(ref)
end
target.add_system_framework(%w[SwiftUI HealthKit CoreLocation])
target.build_configurations.each do |c|
  c.build_settings.merge!({
    'PRODUCT_NAME' => 'SageWatch', 'PRODUCT_BUNDLE_IDENTIFIER' => bundle + '.watchkitapp',
    'DEVELOPMENT_TEAM' => team, 'CODE_SIGN_STYLE' => 'Automatic',
    'CODE_SIGN_ENTITLEMENTS' => 'SageWatch/SageWatch.entitlements', 'INFOPLIST_FILE' => 'SageWatch/Info.plist',
    'SDKROOT' => 'watchos', 'SUPPORTED_PLATFORMS' => 'watchos watchsimulator',
    'WATCHOS_DEPLOYMENT_TARGET' => '10.0', 'TARGETED_DEVICE_FAMILY' => '4',
    'SWIFT_VERSION' => '5.0', 'GENERATE_INFOPLIST_FILE' => 'NO', 'SKIP_INSTALL' => 'YES',
    'CURRENT_PROJECT_VERSION' => '1', 'MARKETING_VERSION' => config['version'],
    'LD_RUNPATH_SEARCH_PATHS' => '$(inherited) @executable_path/Frameworks',
    'ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME' => 'SageAccent',
    'ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES' => 'YES'
  })
end
if ARGV.include?('--embed')
  main.add_dependency(target) unless main.dependencies.any? { |d| d.target == target }
  phase = main.copy_files_build_phases.find { |p| p.name == 'Embed Watch Content' } || main.new_copy_files_build_phase('Embed Watch Content')
  phase.dst_subfolder_spec = '16'; phase.dst_path = '$(CONTENTS_FOLDER_PATH)/Watch'
  unless phase.files_references.include?(target.product_reference)
    file = phase.add_file_reference(target.product_reference, true)
    file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  end
else
  # Keep ordinary iPhone builds working on Macs without the Watch platform.
  main.dependencies.select { |d| d.target == target }.each(&:remove_from_project)
  main.copy_files_build_phases.select { |p| p.name == 'Embed Watch Content' }.each(&:remove_from_project)
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.save_as(File.join(root, 'ios/Sage.xcodeproj'), 'SageWatch', true)
puts "Configured SageWatch (watchOS 10+). Embedded in iPhone app: #{ARGV.include?('--embed')}."
