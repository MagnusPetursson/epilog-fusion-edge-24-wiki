import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as K from '../generator/sbsite/content.mjs';
import {B} from '../generator/sbsite/site.mjs';
import {TOUR, JOB, FAULTS, VIEWS} from '../generator/gl/scenes.mjs';

assert(!('OPEN' in K), 'Site content exports no internal question list');
assert.deepEqual(K.SOURCES.map(s => s[0]), Array.from({length:17}, (_, i) => i + 1));
assert(K.SOURCES.every(s => s[2].startsWith('https://')), 'Public sources need real source URLs');
assert.equal(K.C('source-80w-instr'), '', 'Lab practice needs no conversation citation');
assert.equal(K.C('source-80w', 'source-80w-instr'), '<span class="sb-cite">[4]</span>');
assert.throws(() => K.C('missing-claim'), /unknown claim/);
const reader = JSON.stringify({B, TOUR, JOB, FAULTS, VIEWS});
assert(!/instructor[- ]confirmed|\(instructor\)|the instructor confirms|instructor (?:list|decisions)|Magnús|Pétursson|claim ledger|quote found|review thread|hasn’t been photographed|initial brief|first model/i.test(reader), 'Reader prose contains process residue');
const print = readFileSync(new URL('../generator/sbsite/print.mjs', import.meta.url), 'utf8');
assert(!/H\.instructor|ch-instructor|ch-ledger|claim-ledger\.json|K\.OPEN/.test(print), 'PDFs must not append internal notes or the claim ledger');
console.log('Reader-voice regression: public sources 1–17; no local-configuration citation or internal appendix; page and 3D prose clean.');
