const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path) {
  const context = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return context.exports;
}
const { referenceScoringRules } = load('lib/challengePresets.ts');
const { thresholdPoints } = load('lib/thresholdScoring.ts');
const reference = fs.readFileSync('GamifiedFitnessChallengeApp-main_2/src/App.tsx', 'utf8');
const config = { scoringRules: referenceScoringRules(['Run', 'Ride', 'Swim', 'WeightTraining']) };
for (const [sport, name] of [['Run', 'Run'], ['Ride', 'Ride'], ['Swim', 'Swim'], ['WeightTraining', 'Strength']]) {
  const line = reference.split('\n').find(line => line.includes(`name: "${name}"`) && line.includes('rows:'));
  const rows = JSON.parse(line.match(/rows: (\[.*\])/)[1]);
  const rules = config.scoringRules.filter(rule => rule.sport === sport);
  assert.equal(rules.length, rows.length);
  for (let index = 0; index < rows.length; index++) {
    const [label, rawPoints] = rows[index];
    const [amount, unit] = label.split(' ');
    const measured = Number(amount) * (unit === 'km' ? 1000 : unit === 'min' ? 60 : 1);
    const distance = unit === 'min' ? null : measured;
    const seconds = unit === 'min' ? measured : 3600;
    assert.equal(thresholdPoints(config, sport, distance, seconds), Number(rawPoints), `${sport} ${label}`);
    assert.equal(thresholdPoints(config, sport, distance === null ? null : distance - 1, distance === null ? seconds - 1 : seconds), index ? Number(rows[index - 1][1]) : 0, `${sport} below ${label}`);
  }
}
assert.equal(referenceScoringRules(['Yoga']).length, 0);
assert.equal(referenceScoringRules(['Run', 'Run']).length, 5);
assert.equal(thresholdPoints(config, 'Ride', 150000, 10000), 65);
assert.equal(thresholdPoints(config, 'Yoga', null, 3600), 0);
console.log('PASS: all 19 reference thresholds, below-threshold boundaries, sport isolation, deduplication and highest-row scoring.');
