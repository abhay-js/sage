// Recreate the optional watchOS companion after Expo prebuild.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
if(!fs.existsSync(path.join(root,'ios/Sage.xcodeproj')))throw Error('Run Expo prebuild for iOS first.');
const brewRuby='/opt/homebrew/opt/ruby/bin/ruby';
const ruby=fs.existsSync(brewRuby)?brewRuby:'ruby';
const env={...process.env},gemRoot='/opt/homebrew/Cellar/cocoapods/1.16.2/libexec';
if(fs.existsSync(gemRoot))env.GEM_HOME=gemRoot;
execFileSync(ruby,[path.join(__dirname,'setup-watch-app.rb'),...process.argv.slice(2)],{cwd:root,env,stdio:'inherit'});
