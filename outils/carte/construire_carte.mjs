/* Construit le fond de carte intégré à l'outil.
   Usage : npm ci && node construire_carte.mjs [simplification=0.02]  puis  python3 inserer_carte.py
   Source : Natural Earth 1:50m (domaine public) via le paquet world-atlas (ISC). */
import fs from 'fs';
import * as topo from 'topojson-client';
import * as simp from 'topojson-simplify';
import {geoPath, geoCentroid, geoArea} from 'd3-geo';
import {geoNaturalEarth1} from 'd3-geo';
import iso from 'i18n-iso-countries';
const W=1000,H=500;
let t=JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
t=simp.presimplify(t); t=simp.simplify(t, +process.argv[2]||0.02);
const un=JSON.parse(fs.readFileSync('pays_onu.json')).map(x=>x[0]);
const alias={"Central African Republic":"Central African Rep.","Cote d'Ivoire":"Côte d'Ivoire","Democratic Republic of the Congo":"Dem. Rep. Congo","Equatorial Guinea":"Eq. Guinea","Eswatini":"eSwatini","Sao Tome and Principe":"São Tomé and Principe","South Sudan":"S. Sudan","Brunei Darussalam":"Brunei","Bosnia and Herzegovina":"Bosnia and Herz.","Czech Republic":"Czechia","North Macedonia":"Macedonia","Republic of Moldova":"Moldova","Russian Federation":"Russia","Antigua and Barbuda":"Antigua and Barb.","Dominican Republic":"Dominican Rep.","Saint Kitts and Nevis":"St. Kitts and Nevis","Saint Vincent and the Grenadines":"St. Vin. and Gren.","United States":"United States of America","Marshall Islands":"Marshall Is.","Solomon Islands":"Solomon Is."};
const extra={"Tuvalu":[179.2,-8.52]};
const fc=topo.feature(t,t.objects.countries).features.filter(f=>f.properties.name!=='Antarctica');
const proj=geoNaturalEarth1().fitExtent([[4,4],[W-4,H-4]],{type:'FeatureCollection',features:fc});
const path=geoPath(proj).digits(1);
const byName=new Map(fc.map(f=>[f.properties.name,f]));
const out=[],bg=[];
for(const n of un){
  const f=byName.get(alias[n]||n);
  if(!f){const p=proj(extra[n]);out.push({n,i:'TV',d:'',c:[+p[0].toFixed(1),+p[1].toFixed(1)],s:1});continue;}
  const d=path(f)||''; const c=path.centroid(f); const a=path.area(f);
  out.push({n,i:iso.numericToAlpha2(f.id)||'',d,c:[+c[0].toFixed(1),+c[1].toFixed(1)],s:a<6?1:0});
  byName.delete(alias[n]||n);
}
for(const f of byName.values()){const d=path(f); if(d) bg.push(d);}
/* Cadres de zoom par continent (longitude / latitude), projetés comme la carte */
const BOX={'Africa':[-20,-36,55,38],'Asia':[25,-12,150,56],'Europe':[-25,34,45,71],'North America':[-170,6,-50,72],'Oceania':[110,-48,180,2],'South America':[-82,-56,-34,13]};
const z={};
for(const k in BOX){const [a,b,c,d]=BOX[k];let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(let i=0;i<=20;i++)for(const [lo,la] of [[a+(c-a)*i/20,b],[a+(c-a)*i/20,d],[a,b+(d-b)*i/20],[c,b+(d-b)*i/20]]){const [x,y]=proj([lo,la]);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  z[k]=[x0,y0,x1,y1].map(v=>+v.toFixed(1));}
const res={w:W,h:H,c:out,bg,z};
fs.writeFileSync('carte.json',JSON.stringify(res));
console.log('size',JSON.stringify(res).length,'small',out.filter(o=>o.s).map(o=>o.n).join(', '));
