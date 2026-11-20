import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseLanguage,translate} from '../src/ui/language.js';
import {SCIENCE_NOTES} from '../src/experience-guide.js';
import {ENCOUNTER_TRAILS} from '../src/encounter-trails.js';
const zh=s=>translate(s,'zh-CN');
test('saved language takes precedence; unsupported browser languages fall back to English',()=>{
 assert.equal(chooseLanguage('en','zh-CN'),'en');assert.equal(chooseLanguage('zh-CN','en-US'),'zh-CN');assert.equal(chooseLanguage(null,'zh-Hans'),'zh-CN');assert.equal(chooseLanguage('invalid','fr-FR'),'en');
});
test('the journal and all fieldwork directions have bilingual copy without changing their source',()=>{
 for(const n of SCIENCE_NOTES)for(const s of [n.title,n.text,n.detail].filter(Boolean)){assert.match(zh(s),/[\u3400-\u9fff]/,n.id);assert.equal(translate(s,'en'),s);}
 for(const stop of Object.values(ENCOUNTER_TRAILS).flat())assert.match(zh(stop.instruction),/[\u3400-\u9fff]/,stop.id);
});
test('composed captions retain controls, numeric measurements and historical UTC precision',()=>{
 assert.equal(zh('FIG. 01 / 05'),'图 01 / 05');assert.equal(zh('N · One light-day'),'N · 一光日');assert.equal(zh('07 Sept 1990 · 10:22:09 UTC'),'1990 年 9 月 7 日 · 10:22:09 UTC');assert.equal(zh('8227 days 19 h · time compressed'),'8227 天 19 小时 · 时间压缩');assert.equal(zh('X · Open photograph'),'X · 打开照片');assert.equal(zh('Start at Pale Blue Dot and replace your saved position.'),'从暗淡蓝点开始，并替换已保存的位置。');
});
