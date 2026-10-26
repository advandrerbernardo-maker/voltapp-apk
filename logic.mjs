/** Voltapp Fase 1: funções determinísticas e independentes da interface. */
export const formatBRL = value => value == null || !Number.isFinite(Number(value)) ? 'Não confirmada' :
  new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value));
export const daysSince = date => {
  if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const dateMs=Date.parse(date+'T12:00:00Z');
  if(!Number.isFinite(dateMs))return null;
  const today=new Date();
  const utcMidnight=Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate(),12);
  return Math.floor((utcMidnight-dateMs)/86400000);
};
/** Dados considerados confirmados apenas se houver fonte identificada e data válida. */
export function isTariffVerified(station){
  if(station?.is_demo || !station?.tariff) return false;
  const t=station.tariff;
  const validUnit=['kwh','minute','session'].includes(t.type);
  const validPrice=Number.isFinite(t.amount_brl)&&t.amount_brl>=0;
  const age=daysSince(station.verified_at);
  return validUnit&&validPrice&&age!==null&&age>=0&&age<=30 &&
    (typeof station.source_url==='string' && /^https:\/\//.test(station.source_url));
}
export function validateStation(station){
  if(!station || typeof station!=='object')return false;
  const textFields=['id','name','address','city','state','hours','access_rules'];
  return textFields.every(k=>typeof station[k]==='string'&&station[k].trim().length>0) &&
    Number.isFinite(station.latitude) && station.latitude>=-90 && station.latitude<=90 &&
    Number.isFinite(station.longitude)&&station.longitude>=-180&&station.longitude<=180 &&
    Array.isArray(station.connectors)&&station.connectors.every(k=>typeof k==='string') &&
    (!station.tariff || (typeof station.tariff==='object'&&
      ['kwh','minute','session','unknown'].includes(station.tariff.type)&&
      (station.tariff.amount_brl===null||Number.isFinite(station.tariff.amount_brl))));
}
export function tariffLabel(station){
  if(station.is_demo){
    if(station.tariff?.type==='kwh')return station.tariff.amount_brl===0?'Grátis (fictício)':formatBRL(station.tariff.amount_brl)+'/kWh · exemplo';
    if(station.tariff?.type==='minute')return formatBRL(station.tariff.amount_brl)+'/min · exemplo';
    return 'Dados de demonstração';
  }
  if(!isTariffVerified(station))return 'Tarifa não confirmada';
  const t=station.tariff;
  const unit=t.type==='kwh'?'/kWh':t.type==='minute'?'/minuto':'/sessão';
  return t.amount_brl===0?'Gratuito (energia) · condições aplicáveis':formatBRL(t.amount_brl)+unit;
}
export function estimateRoute({distanceKm,consumptionKwh100,batteryKwh,startPct,reservePct,efficiencyPct,station}){
  const vals=[distanceKm,consumptionKwh100,batteryKwh,startPct,reservePct,efficiencyPct];
  if(vals.some(x=>!Number.isFinite(x)))throw new Error('Preencha apenas números válidos.');
  if(distanceKm<0||distanceKm>5000 || consumptionKwh100<5||consumptionKwh100>55||batteryKwh<10||batteryKwh>250 ||startPct<1||startPct>100||reservePct<0||reservePct>50||efficiencyPct<60||efficiencyPct>100)throw new Error('Confira os parâmetros do veículo.');
  const energyKwh = distanceKm*consumptionKwh100/100;
  const availableKwh = batteryKwh*(startPct-reservePct)/100;
  const feasible = availableKwh >= energyKwh;
  const maxDistanceKm=Math.max(0,availableKwh/consumptionKwh100*100);
  const rechargeGridKwh = energyKwh/(efficiencyPct/100);
  const verified=Boolean(station?.is_demo || isTariffVerified(station));
  const t=station?.tariff;
  let costBrl=null;
  let costReason='Tarifa não confirmada. Não é possível calcular o custo.';
  if(t?.type==='kwh' && verified && Number.isFinite(t.amount_brl) && t.amount_brl>=0){
    costBrl=rechargeGridKwh*t.amount_brl + (Number.isFinite(t.session_fee_brl)?t.session_fee_brl:0);
    costReason='Estimativa apenas de energia e taxa de sessão conhecida. Estacionamento e outras condições podem alterar o total.';
  } else if(t?.type==='minute'){
    costReason='Cobrança por minuto: o custo depende da potência efetiva e da curva de carga; sem esses dados, não é honesto apresentar valor exato.';
  } else if(t?.type==='session'){
    costReason='Cobrança por sessão: verificar consumo, limite de sessão, estacionamento e demais condições com o operador.';
  }
  if(!feasible){
    costReason+=' A rota ultrapassa a autonomia calculada com reserva; uma parada intermediária é necessária.';
  }
  return {distanceKm,energyKwh,availableKwh,maxDistanceKm,rechargeGridKwh,feasible,costBrl,costReason};
}
