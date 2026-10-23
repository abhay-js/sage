const {withAndroidManifest,withDangerousMod,withProjectBuildGradle,withMainActivity,AndroidConfig}=require('@expo/config-plugins');
const fs=require('node:fs'),path=require('node:path');
module.exports=config=>{
  // Keep Expo 52's build tools; Health Connect 3.3.3 is compatible with them.
  config=withProjectBuildGradle(config,mod=>{mod.modResults.contents=mod.modResults.contents.replace(/classpath\(['"]com.android.tools.build:gradle(?::[^'"]+)?['"]\)/,"classpath('com.android.tools.build:gradle')");return mod;});
  config=withMainActivity(config,mod=>{
    let source=mod.modResults.contents;
    if(!source.includes('import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate'))source=source.replace('import android.os.Bundle','import android.os.Bundle\nimport dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate');
    if(!source.includes('HealthConnectPermissionDelegate.setPermissionDelegate(this)'))source=source.replace('super.onCreate(null)','super.onCreate(null)\n    HealthConnectPermissionDelegate.setPermissionDelegate(this)');
    mod.modResults.contents=source;return mod;
  });
  config=withAndroidManifest(config,mod=>{
    const manifest=mod.modResults.manifest;
    manifest.queries=manifest.queries??[{}];const queries=manifest.queries[0];queries.package=queries.package??[];
    if(!queries.package.some(p=>p.$['android:name']==='com.google.android.apps.healthdata'))queries.package.push({$:{'android:name':'com.google.android.apps.healthdata'}});
    const application=AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults),main=AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults),action='androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
    main['intent-filter']=(main['intent-filter']??[]).filter(f=>!(f.action??[]).some(a=>a.$['android:name']===action));
    application.activity=application.activity??[];
    if(!application.activity.some(a=>a.$['android:name']==='.HealthPrivacyActivity'))application.activity.push({$:{'android:name':'.HealthPrivacyActivity','android:exported':'true'},'intent-filter':[{action:[{$:{'android:name':action}}]}]});
    application['activity-alias']=application['activity-alias']??[];
    let alias=application['activity-alias'].find(a=>a.$['android:name']==='ViewPermissionUsageActivity');
    if(!alias){alias={$:{'android:name':'ViewPermissionUsageActivity'},'intent-filter':[{action:[{$:{'android:name':'android.intent.action.VIEW_PERMISSION_USAGE'}}],category:[{$:{'android:name':'android.intent.category.HEALTH_PERMISSIONS'}}]}]};application['activity-alias'].push(alias);}
    Object.assign(alias.$,{'android:exported':'true','android:targetActivity':'.HealthPrivacyActivity','android:permission':'android.permission.START_VIEW_PERMISSION_USAGE'});
    return mod;
  });
  return withDangerousMod(config,['android',async mod=>{
    const wrapper=path.join(mod.modRequest.platformProjectRoot,'gradle/wrapper/gradle-wrapper.properties');fs.writeFileSync(wrapper,fs.readFileSync(wrapper,'utf8').replace(/distributionUrl=.*/, 'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-all.zip'));
    const pkg=mod.android.package,folder=path.join(mod.modRequest.platformProjectRoot,'app/src/main/java',...pkg.split('.'));fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,'HealthPrivacyActivity.kt'),`package ${pkg}\nimport android.app.Activity\nimport android.os.Bundle\nimport android.content.Intent\nimport android.net.Uri\nclass HealthPrivacyActivity : Activity() {\n  override fun onCreate(savedInstanceState: Bundle?) {\n    super.onCreate(savedInstanceState)\n    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://trainsage.fit/privacy")))\n    finish()\n  }\n}\n`);return mod;
  }]);
};
