// Run after Expo prebuild; keeps the native share target reproducible.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
if(!fs.existsSync(join(root,'ios/Sage.xcodeproj')))throw new Error('Run Expo prebuild for iOS first.');
const brewRuby='/opt/homebrew/opt/ruby/bin/ruby';
const ruby=fs.existsSync(brewRuby)?brewRuby:'ruby';
const gemRoot='/opt/homebrew/Cellar/cocoapods/1.16.2/libexec';
const env={...process.env};if(fs.existsSync(gemRoot))env.GEM_HOME=gemRoot;
execFileSync(ruby,[join(__dirname,'setup-share-extension.rb')],{cwd:root,env,stdio:'inherit'});
