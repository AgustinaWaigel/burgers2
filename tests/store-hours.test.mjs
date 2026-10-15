import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './load-module.mjs';
const {parseHours,getStoreAvailability}=loadModule('lib/store-hours.ts');
test('hours support split shifts, midnight and legacy simple ranges',()=>{for(const value of ['19:00 a 02:00','12-15, 19-23','Cerrado','24h','23:00-24:00'])assert.notEqual(parseHours(value),null);for(const value of ['25:00-02:00','19:60-21:00','19-19','A la noche'])assert.equal(parseHours(value),null);});
test('hours use Argentina time and include previous overnight shift',()=>{const hours={Lunes:'19:00-02:00'};assert.equal(getStoreAvailability(hours,new Date('2026-09-29T04:30:00Z')).open,true);assert.equal(getStoreAvailability(hours,new Date('2026-09-29T05:00:00Z')).open,false);assert.equal(getStoreAvailability(hours,new Date('2026-09-28T21:59:00Z')).open,false);assert.equal(getStoreAvailability(hours,new Date('2026-09-28T22:00:00Z')).open,true);});
test('empty schedule is unknown, blank days closed, invalid schedule blocked',()=>{assert.equal(getStoreAvailability({}).open,null);assert.equal(getStoreAvailability({Lunes:'Cerrado'}).open,false);assert.equal(getStoreAvailability({Lunes:'noche'}).invalid,true);});
test('split shifts close during the break and Sunday overnight reaches Monday',()=>{const hours={Domingo:'12-15,19-02'};assert.equal(getStoreAvailability(hours,new Date('2026-09-27T19:00:00Z')).open,false);assert.equal(getStoreAvailability(hours,new Date('2026-09-28T04:00:00Z')).open,true);});
