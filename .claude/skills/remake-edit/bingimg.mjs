// Bing Images search, no key, original-size stills (2026-10-19, n34 v4): the source for portraits of famous people.
//   node bingimg.mjs <outdir> "<name> face close up portrait" ["<name2> ..."]   (8 originals per query, gNNN.jpg + cands.json)
// Filter: large (min 1800x2400) and tall. Keep files over 150 KB that are JPEG; check real size with ffprobe, then screen at 100%.
// BING_MIN=700_900 node bingimg.mjs ... lowers the size filter (old "before" photos are rarely 1800x2400).
import fs from "fs";
const UA={"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36","accept-language":"en-US,en;q=0.9"};
const [dir,...qs]=process.argv.slice(2);fs.mkdirSync(dir,{recursive:true});
const out=[];let k=0;
for(const q of qs){
 const url=`https://www.bing.com/images/async?q=${encodeURIComponent(q)}&first=0&count=35&qft=${encodeURIComponent(`+filterui:imagesize-custom_${process.env.BING_MIN||"1800_2400"}+filterui:aspect-tall`)}`;
 let html="";try{html=await (await fetch(url,{headers:UA})).text();}catch(e){console.log(q,"fail");continue;}
 const ms=[...html.matchAll(/class="iusc"[^>]*\sm="([^"]+)"/g)].map(m=>{try{return JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'))}catch{return null}}).filter(Boolean);
 let c=0;
 for(const m of ms){ if(c>=10)break; const f=`${dir}/g${String(k).padStart(3,"0")}.jpg`;
  try{const r=await fetch(m.murl,{headers:{"user-agent":UA["user-agent"]},signal:AbortSignal.timeout(15000)});if(!r.ok)continue;const b=Buffer.from(await r.arrayBuffer());if(b.length<150000||b[0]!==0xff)continue;fs.writeFileSync(f,b);out.push({q,file:f,url:m.murl,size:b.length});k++;c++;}catch{}
 }
 console.log(q,ms.length,"found",c,"saved");
}
fs.writeFileSync(dir+"/cands.json",JSON.stringify(out,null,1));
