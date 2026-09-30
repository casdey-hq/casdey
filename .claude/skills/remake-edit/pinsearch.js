// node pinsearch.js "query" [n] -> prints pin id | duration | best mp4 | title
const q=process.argv[2], want=+process.argv[3]||25;
(async()=>{
 const data={options:{query:q,scope:"videos",page_size:50,rs:"typed"},context:{}};
 const url=`https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent('/search/videos/?q='+q)}&data=${encodeURIComponent(JSON.stringify(data))}`;
 const r=await fetch(url,{headers:{"x-pinterest-pws-handler":"www/search/[scope].js","accept":"application/json","user-agent":"Mozilla/5.0"}});
 const j=await r.json(); const res=(j.resource_response?.data?.results)||[];
 let n=0; for(const p of res){ const vl=p.videos?.video_list||p.story_pin_data?.pages?.[0]?.blocks?.[0]?.video?.video_list; if(!vl) continue;
  const mp4=Object.values(vl).filter(v=>v.url&&v.url.endsWith('.mp4')).sort((a,b)=>b.height-a.height)[0]; const any=mp4||Object.values(vl)[0];
  console.log([p.id, Math.round((any.duration||0)/1000)+'s', any.width+'x'+any.height, (p.grid_title||p.title||p.description||'').slice(0,60).replace(/\s+/g,' '), any.url].join(' | ')); if(++n>=want) break; }
 if(!res.length) console.log('no results', r.status, JSON.stringify(j).slice(0,300));
})();
