import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {formatBRL,validateStation,isTariffVerified,tariffLabel,estimateRoute} from '../logic.mjs';
const samples=JSON.parse(await fs.readFile(new URL('../data/stations.example.json',import.meta.url),'utf8'));
const real=JSON.parse(await fs.readFile(new URL('../data/stations.json',import.meta.url),'utf8'));
test('O mapa público começa sem pontos inventados',()=>{assert.deepEqual(real,[])});
test('Exemplos são válidos e claramente identificados como fictícios',()=>{
 assert.equal(samples.length,3);for(const s of samples){assert.ok(validateStation(s));assert.equal(s.is_demo,true);assert.equal(isTariffVerified(s),false);assert.match(tariffLabel(s),/fictício|exemplo/);}
});
test('Preço zero só é grátis se for explícito e verificável',()=>{
 const s={...samples[1],is_demo:false,verified_at:new Date().toISOString().slice(0,10),source_url:'https://example.com/tariff'};
 assert.equal(isTariffVerified(s),true);assert.match(tariffLabel(s),/Gratuito/);
 const unknown={...s,tariff:{type:'kwh',amount_brl:null}};
 assert.equal(isTariffVerified(unknown),false);assert.equal(tariffLabel(unknown),'Tarifa não confirmada');
});
test('Tarifa antiga ou sem fonte não é confirmada',()=>{
 const d=new Date();d.setUTCDate(d.getUTCDate()-60);
 const s={...samples[0],is_demo:false,verified_at:d.toISOString().slice(0,10),source_url:'https://example.com'};
 assert.equal(isTariffVerified(s),false);assert.equal(isTariffVerified({...s,verified_at:new Date().toISOString().slice(0,10),source_url:null}),false);
});
test('Estimador prevê autonomia, perdas e custo sem estacionamento desconhecido',()=>{
 const r=estimateRoute({distanceKm:100,consumptionKwh100:17.5,batteryKwh:55,startPct:80,reservePct:15,efficiencyPct:90,station:samples[0]});
 assert.equal(r.energyKwh,17.5);assert.ok(r.feasible);assert.ok(Math.abs(r.costBrl-36.75)<.00001);assert.match(r.costReason,/Estacionamento/);
});
test('Excesso de autonomia é identificado, não resulta em rota viable',()=>{
 const r=estimateRoute({distanceKm:500,consumptionKwh100:18,batteryKwh:50,startPct:60,reservePct:20,efficiencyPct:90,station:samples[0]});
 assert.equal(r.feasible,false);assert.match(r.costReason,/parada intermediária/);
});
test('Tarifa por minuto nunca gera custo exato sem curva de carga',()=>{
 const r=estimateRoute({distanceKm:30,consumptionKwh100:17,batteryKwh:55,startPct:90,reservePct:15,efficiencyPct:90,station:samples[2]});
 assert.equal(r.costBrl,null);assert.match(r.costReason,/curva de carga/);
});
test('Dados sem comprovação não aparecem como custo calculado',()=>{
 const unknown={...samples[0],is_demo:false,source_url:null};
 const r=estimateRoute({distanceKm:30,consumptionKwh100:17,batteryKwh:55,startPct:90,reservePct:15,efficiencyPct:90,station:unknown});
 assert.equal(r.costBrl,null);assert.match(r.costReason,/Tarifa não confirmada/);
});
test('Sanidade monetária pt-BR e validação de segurança',()=>{
 assert.match(formatBRL(187.45),/187,45/);assert.equal(validateStation({...samples[0],longitude:400}),false);
});
