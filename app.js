
function $(id){return document.getElementById(id)}
const params = {
  olivesKg: 1000,
  olivePricePerKg: 4.0,
  oilYieldPct: 20,
  wasteSellablePct: 35,
  moistureLossPct: 5,
  oilPricePerL: 90,
  wastePricePerKg: 0.8,
  oilDensityKgPerL: 0.916,
  bottleSizeL: 0.75,
  packagingUnitCost: 2.5,
  laborHours: 16,
  wagePerHour: 25,
  energyKwh: 180,
  energyPricePerKwh: 1.2,
  varOverheadPerKg: 0.6,
  fixedCosts: 5000,
  capacityKgPerHour: 120,
  runtimeHours: 10,
};

const fields = Object.keys(params);
fields.forEach(k=>{
  const el = $(k);
  el.value = params[k];
  el.addEventListener('input', ()=>{
    const v = parseFloat(el.value);
    params[k] = isNaN(v)?0:v;
    render();
  });
});

$("resetBtn").addEventListener("click", ()=>{
  // Mettre tous les paramètres à 0
  fields.forEach(k => {
    params[k] = 0;
    $(k).value = 0;     // ou "" si tu préfères des champs vides
  });
  render();
});

$("exportBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(params,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'params_olive_sim.json';
  a.click();
});

$("importBtn").addEventListener("click", ()=>$("importFile").click());
$("importFile").addEventListener("change", (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      Object.keys(params).forEach(k=>{
        if(k in data){ params[k] = parseFloat(data[k]); $(k).value = params[k]; }
      });
      render();
    }catch(err){ alert("Fichier invalide"); }
  };
  reader.readAsText(file);
});

function money(n){ return (isFinite(n)? n.toLocaleString(undefined,{maximumFractionDigits:2}):'-') + ' MAD'; }
function fmt(n){ return (isFinite(n)? n.toLocaleString(undefined,{maximumFractionDigits:2}):'-'); }

function compute(p){
  const yieldFrac = p.oilYieldPct/100;
  const wasteFrac = p.wasteSellablePct/100;
  const lossFrac  = p.moistureLossPct/100;

  const oilKg = p.olivesKg * yieldFrac;
  const oilL = oilKg / Math.max(0.0001, p.oilDensityKgPerL);
  const wasteKg = p.olivesKg * wasteFrac;
  const bottles = Math.ceil(oilL / Math.max(0.0001, p.bottleSizeL));

  const revenueOil = oilL * p.oilPricePerL;
  const revenueWaste = wasteKg * p.wastePricePerKg;
  const revenueTotal = revenueOil + revenueWaste;

  const rawCost = p.olivesKg * p.olivePricePerKg;
  const laborCost = p.laborHours * p.wagePerHour;
  const energyCost = p.energyKwh * p.energyPricePerKwh;
  const packagingCost = bottles * p.packagingUnitCost;
  const otherVar = p.olivesKg * p.varOverheadPerKg;
  const varTotal = rawCost + laborCost + energyCost + packagingCost + otherVar;

  const contribution = revenueTotal - varTotal;
  const operatingProfit = contribution - p.fixedCosts;

  const totalCost = varTotal + p.fixedCosts;
  const varCostPerL = oilL>0 ? varTotal/oilL : Infinity;
  const unitCostPerL = oilL>0 ? totalCost/oilL : Infinity;
  const wasteCreditPerL = oilL>0 ? revenueWaste/oilL : 0;

  const unitPrice = p.oilPricePerL;
  const cmu = unitPrice - (varCostPerL - wasteCreditPerL);
  const breakEvenL = cmu>0 ? p.fixedCosts / cmu : Infinity;

  const capacityKg = p.capacityKgPerHour * p.runtimeHours;
  const utilization = capacityKg>0? p.olivesKg / capacityKg : 0;

  return {oilKg, oilL, wasteKg, bottles, revenueOil, revenueWaste, revenueTotal, rawCost, laborCost, energyCost, packagingCost, otherVar, varTotal, contribution, operatingProfit, unitCostPerL, varCostPerL, wasteCreditPerL, breakEvenL, capacityKg, utilization};
}

function kpi(label, value, highlight=false){
  return `<div class="kpi ${highlight?'highlight':''}">
    <div class="label">${label}</div>
    <div class="value">${value}</div>
  </div>`;
}

function render(){
  const r = compute(params);
  const k = document.getElementById('kpis');
  k.innerHTML = [
    kpi('Huile produite', `${fmt(r.oilL)} L (${fmt(r.oilKg)} kg)`),
    kpi('Sous‑produit vendable', `${fmt(r.wasteKg)} kg`),
    kpi('Bouteilles nécessaires', fmt(r.bottles)),
    kpi('Recettes huile', money(r.revenueOil)),
    kpi('Recettes sous‑produit', money(r.revenueWaste)),
    kpi('CA total', money(r.revenueTotal), true),
    kpi('Coût matière (olives)', money(r.rawCost)),
    kpi('Main‑d’œuvre directe', money(r.laborCost)),
    kpi('Énergie', money(r.energyCost)),
    kpi('Emballage', money(r.packagingCost)),
    kpi('Autres variables', money(r.otherVar)),
    kpi('Total CV', money(r.varTotal)),
    kpi('Marge sur CV', money(r.contribution), true),
    kpi('Coûts fixes', money(params.fixedCosts)),
    kpi('Résultat d’exploitation', money(r.operatingProfit), true),
    kpi('CV/L', money(r.varCostPerL)),
    kpi('Crédit sous‑produit / L', money(r.wasteCreditPerL)),
    kpi('Coût complet / L', money(r.unitCostPerL), true),
    kpi('Seuil de rentabilité (L)', fmt(r.breakEvenL)),
    kpi('Capacité (kg)', fmt(r.capacityKg)),
    kpi('Taux d’utilisation', fmt(r.utilization*100) + ' %'),
  ].join('');
}

render();
