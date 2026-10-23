require 'xcodeproj'
require 'fileutils'
require 'json'
root=File.expand_path('..',__dir__)
config=JSON.parse(File.read(File.join(root,'app.json')))['expo']
bundle=config['ios']['bundleIdentifier']
project=Xcodeproj::Project.open(File.join(root,'ios/Sage.xcodeproj'))
main=project.targets.find{|t|t.name=='Sage'}
team=main.build_configurations.map{|c|c.build_settings['DEVELOPMENT_TEAM']}.compact.first || 'F6AFK24ZXK'
folder=File.join(root,'ios/SageShare');FileUtils.mkdir_p(folder)
FileUtils.cp(File.join(root,'native/SageShare/SAGEShareViewController.m'),folder)
env={};File.readlines(File.join(root,'.env.local')).each{|line|key,value=line.strip.split('=',2);env[key]=value.to_s.gsub(/\A["']|["']\z/,'') if key}
url=env.fetch('EXPO_PUBLIC_SUPABASE_URL');anon=env.fetch('EXPO_PUBLIC_SUPABASE_ANON_KEY')
project_ref=url.sub('https://','').split('.').first
theme=File.read(File.join(root,'lib/theme.cjs'));accent=theme.match(/orange: '(#[0-9a-f]+)'/)[1];rgb=accent.delete_prefix('#').scan(/../).map{|v|v.to_i(16)/255.0}
File.write(File.join(folder,'SageShareConfig.h'),"#define SAGE_SHARE_TINT [UIColor colorWithRed:#{rgb[0]} green:#{rgb[1]} blue:#{rgb[2]} alpha:1]
#define SAGE_SUPABASE_URL @#{url.to_json}\n#define SAGE_SUPABASE_ANON_KEY @#{anon.to_json}\n#define SAGE_AUTH_STORAGE_KEY @\"sb-#{project_ref}-auth-token\"\n")
Xcodeproj::Plist.write_to_path({'CFBundleDisplayName'=>'Sage','CFBundleExecutable'=>'$(EXECUTABLE_NAME)','CFBundleIdentifier'=>'$(PRODUCT_BUNDLE_IDENTIFIER)','CFBundleName'=>'$(PRODUCT_NAME)','CFBundlePackageType'=>'XPC!','CFBundleShortVersionString'=>'1.0.0','CFBundleVersion'=>'1','NSExtension'=>{'NSExtensionPointIdentifier'=>'com.apple.share-services','NSExtensionPrincipalClass'=>'SAGEShareViewController','NSExtensionAttributes'=>{'NSExtensionActivationRule'=>{'NSExtensionActivationSupportsWebURLWithMaxCount'=>1,'NSExtensionActivationSupportsText'=>true}}}},File.join(folder,'Info.plist'))
Xcodeproj::Plist.write_to_path({'keychain-access-groups'=>["$(AppIdentifierPrefix)#{bundle}"]},File.join(folder,'SageShare.entitlements'))
target=project.targets.find{|t|t.name=='SageShare'}||project.new_target(:app_extension,'SageShare',:ios,'15.1')
group=project.main_group.find_subpath('SageShare',true);group.set_source_tree('<group>');group.set_path('SageShare')
%w[SAGEShareViewController.m SageShareConfig.h Info.plist SageShare.entitlements].each do |file|
 reference=group.files.find{|f|f.path==file}||group.new_file(file)
 target.source_build_phase.add_file_reference(reference,true) if file.end_with?('.m') && !target.source_build_phase.files_references.include?(reference)
end
target.add_system_framework(%w[UIKit Social Security])
target.build_configurations.each do |c|
 c.build_settings.merge!({'PRODUCT_NAME'=>'SageShare','PRODUCT_BUNDLE_IDENTIFIER'=>bundle+'.share','DEVELOPMENT_TEAM'=>team,'CODE_SIGN_STYLE'=>'Automatic','CODE_SIGN_ENTITLEMENTS'=>'SageShare/SageShare.entitlements','INFOPLIST_FILE'=>'SageShare/Info.plist','APPLICATION_EXTENSION_API_ONLY'=>'YES','SKIP_INSTALL'=>'YES','CLANG_ENABLE_OBJC_ARC'=>'YES','TARGETED_DEVICE_FAMILY'=>'1,2','CURRENT_PROJECT_VERSION'=>'1','MARKETING_VERSION'=>'1.0.0','LD_RUNPATH_SEARCH_PATHS'=>'$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks'})
end
main.add_dependency(target) unless main.dependencies.any?{|d|d.target==target}
phase=main.copy_files_build_phases.find{|p|p.name=='Embed App Extensions'}||main.new_copy_files_build_phase('Embed App Extensions');phase.dst_subfolder_spec='13'
unless phase.files_references.include?(target.product_reference)
 buildfile=phase.add_file_reference(target.product_reference,true);buildfile.settings={'ATTRIBUTES'=>['RemoveHeadersOnCopy']}
end
project.save
puts 'Configured SageShare extension.'
