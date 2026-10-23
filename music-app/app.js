// Tunewave: kid-friendly music player PWA. Everything personal stays on this device.
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var audio=$('audio'),view=$('view');
var GROUPS={};
var ART={};
function artFor(g){ // generated cover art as data URL (also used for lock screen)
  if(ART[g])return ART[g];var G=GROUPS[g]||{e:'🎵',c:'#c2477b'};var c=document.createElement('canvas');c.width=c.height=512;var x=c.getContext('2d');
  var gr=x.createLinearGradient(0,0,512,512);gr.addColorStop(0,G.c);gr.addColorStop(1,'#120a24');x.fillStyle=gr;x.fillRect(0,0,512,512);
  x.font='260px serif';x.textAlign='center';x.textBaseline='middle';x.fillText(G.e,256,270);return ART[g]=c.toDataURL('image/png');
}
var LS={get:function(k,d){try{var v=localStorage.getItem('tw_'+k);return v?JSON.parse(v):d}catch(e){return d}},set:function(k,v){localStorage.setItem('tw_'+k,JSON.stringify(v))}};
var liked=LS.get('liked',[]),playlists=LS.get('playlists',[]),settings=LS.get('settings',{glasses:false,smart:false,sun:false});
var uploads=[]; // metadata of uploads (blobs stay in IndexedDB)
var queue=[],qi=-1,shuffle=LS.get('shuffle',false),repeat=LS.get('repeat','off'),cur=null,curURL=null;
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return'&#'+c.charCodeAt(0)+';'})}
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('show')},1800)}
function fmt(s){if(!isFinite(s))return'0:00';s=Math.floor(s);return Math.floor(s/60)+':'+('0'+s%60).slice(-2)}
function fmtB(b){return b>1e9?(b/1e9).toFixed(2)+' GB':b>1e6?(b/1e6).toFixed(1)+' MB':Math.round(b/1e3)+' KB'}
function byId(id){if(id.indexOf('u')===0){var u=uploads.find(function(x){return x.id===id});return u&&{id:u.id,title:u.name,artist:u.type.indexOf('video')===0?'My video':'My audio',group:'My Uploads',upload:u}}return TRACKS.find(function(t){return t.id===id})}

/* ---------- IndexedDB for private uploads ---------- */
var dbP=new Promise(function(res,rej){var r=indexedDB.open('tunewave',1);r.onupgradeneeded=function(){r.result.createObjectStore('uploads',{keyPath:'id'})};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}});
function tx(mode,fn){return dbP.then(function(db){return new Promise(function(res,rej){var t=db.transaction('uploads',mode),s=t.objectStore('uploads'),out=fn(s);t.oncomplete=function(){res(out&&out.result!==undefined?out.result:out)};t.onerror=function(){rej(t.error)}})})}
function loadUploads(){return tx('readonly',function(s){return s.getAll()}).then(function(all){all=all||[];if(all.some(function(u){return u.id==='__kidslock'})&&!kids){kids=true;LS.set('kids',true);applyKids()}if(kids&&!all.some(function(u){return u.id==='__kidslock'}))kidsLockDB();uploads=all.filter(function(u){return u.id!=='__kidslock'}).map(function(u){return{id:u.id,name:u.name,type:u.type,size:u.size,thumb:u.thumb,added:u.added}}).sort(function(a,b){return b.added-a.added})})}
function getBlob(id){return tx('readonly',function(s){return s.get(id)}).then(function(r){return r&&r.blob})}
function thumbFor(file){return new Promise(function(res){if(file.type.indexOf('video')!==0)return res(null);var v=document.createElement('video'),u=URL.createObjectURL(file),done=false;
  function fin(d){if(done)return;done=true;URL.revokeObjectURL(u);res(d)}
  v.muted=true;v.playsInline=true;v.preload='auto';v.src=u;
  v.onloadeddata=function(){try{v.currentTime=Math.min(1,(v.duration||2)/3)}catch(e){fin(null)}};
  v.onseeked=function(){try{var c=document.createElement('canvas');c.width=160;c.height=160;var x=c.getContext('2d'),s=Math.min(v.videoWidth,v.videoHeight);x.drawImage(v,(v.videoWidth-s)/2,(v.videoHeight-s)/2,s,s,0,0,160,160);fin(c.toDataURL('image/jpeg',.7))}catch(e){fin(null)}};
  v.onerror=function(){fin(null)};setTimeout(function(){fin(null)},6000)})}
function addFiles(files){files=[].slice.call(files||[]).filter(function(f){return /^(video|audio)\//.test(f.type)||/\.(mp4|mov|m4v|mp3|m4a|wav|aac)$/i.test(f.name)});if(!files.length)return Promise.resolve();
  toast('Saving '+files.length+' file(s) on this iPad…');
  return files.reduce(function(p,f){return p.then(function(){return thumbFor(f)}).then(function(th){var rec={id:'u'+Date.now()+Math.random().toString(36).slice(2,6),name:f.name.replace(/\.[^.]+$/,''),type:f.type||(/\.(mp3|m4a|wav|aac)$/i.test(f.name)?'audio/mpeg':'video/mp4'),size:f.size,thumb:th,added:Date.now(),blob:f};return tx('readwrite',function(s){s.put(rec)})})},Promise.resolve())
  .then(loadUploads).then(function(){if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();toast('Saved! Find it in Your Library');go('library')}).catch(function(e){toast('Could not save: '+(e&&e.name||e))})}
window.__twAddFiles=addFiles;
/* ---------- community rules ---------- */
var rulesCb=null;function showRules(cb){rulesCb=cb||null;$('rules').hidden=false}
$('rulesOk').onclick=function(){LS.set('rulesOk',true);$('rules').hidden=true;var c=rulesCb;rulesCb=null;if(c)c()};
if(!LS.get('rulesOk',false))showRules();
function pickFiles(){if(!LS.get('rulesOk',false))showRules(function(){$('fileIn').click()});else $('fileIn').click()}
$('upBtn').onclick=pickFiles;$('fileIn').onchange=function(e){addFiles(e.target.files);e.target.value=''};

/* ---------- player ---------- */
function setQueue(ids,start){queue=ids.slice();qi=start||0;if(shuffle){var first=queue[qi];var rest=queue.filter(function(_,i){return i!==qi});rest.sort(function(){return Math.random()-.5});queue=[first].concat(rest);qi=0}playIdx(qi)}
function playIdx(i){qi=i;var t=byId(queue[i]);if(!t)return;cur=t;if(curURL){URL.revokeObjectURL(curURL);curURL=null}
  if(t.upload){getBlob(t.id).then(function(b){if(!b){toast('File missing');return}curURL=URL.createObjectURL(b);
      if(t.upload.type.indexOf('video')===0&&!settings.smart){openVideo(t,curURL);return}
      audio.src=curURL;audio.play().catch(function(){});ui()})}
  else{audio.src=t.src;audio.play().catch(function(){})}
  ui();meta()}
function next(auto){if(!queue.length)return;if(auto&&repeat==='one'){audio.currentTime=0;audio.play();return}
  if(qi<queue.length-1)playIdx(qi+1);else if(repeat==='all'||!auto)playIdx(0);else{audio.pause()}}
function prev(){if(audio.currentTime>3){audio.currentTime=0;return}playIdx(qi>0?qi-1:queue.length-1)}
function toggle(){if(!cur)return;if(audio.paused)audio.play().catch(function(){});else audio.pause()}
audio.addEventListener('ended',function(){next(true)});
['play','pause','loadedmetadata'].forEach(function(e){audio.addEventListener(e,ui)});
audio.addEventListener('timeupdate',function(){var d=audio.duration||0,c=audio.currentTime;$('barFill').style.width=(d?c/d*100:0)+'%';if(!seeking)$('seek').value=d?c/d*1000:0;$('tCur').textContent=fmt(c);$('tDur').textContent=fmt(d);
  if('mediaSession' in navigator&&d&&navigator.mediaSession.setPositionState){try{navigator.mediaSession.setPositionState({duration:d,position:Math.min(c,d),playbackRate:audio.playbackRate||1})}catch(e){}}});
audio.addEventListener('error',function(){if(cur&&!cur.upload)toast('Needs internet to play this song')});
var seeking=false;$('seek').addEventListener('input',function(){seeking=true});$('seek').addEventListener('change',function(){if(audio.duration)audio.currentTime=this.value/1000*audio.duration;seeking=false});
function art(t){if(t.art)return t.art;return t.upload?(t.upload.thumb||artFor('My Uploads')):artFor(t.group)}
function meta(){if(!('mediaSession' in navigator)||!cur)return;var a=art(cur);
  navigator.mediaSession.metadata=new MediaMetadata({title:cur.title,artist:cur.artist,album:'Tunewave · '+cur.group,artwork:[{src:a,sizes:'512x512',type:a.indexOf('jpeg')>0?'image/jpeg':'image/png'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png'}]})}
if('mediaSession' in navigator){var H={play:function(){audio.play()},pause:function(){audio.pause()},stop:function(){audio.pause()},nexttrack:function(){next()},previoustrack:function(){prev()},
  seekto:function(d){if(d.fastSeek&&audio.fastSeek)audio.fastSeek(d.seekTime);else audio.currentTime=d.seekTime},
  seekbackward:function(d){audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10))},seekforward:function(d){audio.currentTime=Math.min(audio.duration||0,audio.currentTime+(d.seekOffset||10))}};
  Object.keys(H).forEach(function(k){try{navigator.mediaSession.setActionHandler(k,H[k])}catch(e){}})}
function isLiked(id){return liked.indexOf(id)>=0}
function like(id){if(!id)return;var i=liked.indexOf(id);if(i>=0){liked.splice(i,1);toast('Removed from Liked Songs')}else{liked.unshift(id);toast('Added to Liked Songs 💜');cacheSong(id)}LS.set('liked',liked);ui();if(curView==='library'||curView==='liked')render()}
function cacheSong(id){var t=byId(id);if(t&&t.src&&navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.controller.postMessage({cache:t.src})}
function ui(){var p=!audio.paused;$('bar').hidden=!cur;if(!cur)return;
  $('barTitle').textContent=$('npTitle').textContent=cur.title;$('barArtist').textContent=$('npArtist').textContent=cur.artist;$('barArt').src=$('npArt').src=art(cur);
  $('barPlay').textContent=$('npPlay').textContent=p?'⏸':'▶';$('barPlay').setAttribute('aria-label',p?'Pause':'Play');$('npPlay').setAttribute('aria-label',p?'Pause':'Play');
  var l=isLiked(cur.id);$('barLike').textContent=$('npLike').textContent=l?'♥':'♡';$('barLike').classList.toggle('liked',l);$('npLike').classList.toggle('liked',l);
  $('shufBtn').classList.toggle('on',shuffle);$('repBtn').classList.toggle('on',repeat!=='off');$('repBtn').textContent=repeat==='one'?'🔂':'🔁';
  [].forEach.call(document.querySelectorAll('.row[data-id]'),function(r){r.classList.toggle('playing',r.dataset.id===cur.id)});
  if('mediaSession' in navigator)navigator.mediaSession.playbackState=p?'playing':'paused'}
$('barPlay').onclick=$('npPlay').onclick=toggle;$('barNext').onclick=$('npNext').onclick=function(){next()};$('barPrev').onclick=$('npPrev').onclick=prev;
$('barLike').onclick=$('npLike').onclick=function(){cur&&like(cur.id)};
$('shufBtn').onclick=function(){shuffle=!shuffle;LS.set('shuffle',shuffle);toast(shuffle?'Shuffle on':'Shuffle off');ui()};
$('repBtn').onclick=function(){repeat={off:'all',all:'one',one:'off'}[repeat];LS.set('repeat',repeat);toast({off:'Repeat off',all:'Repeat all',one:'Repeat this song'}[repeat]);ui()};
$('barOpen').onclick=function(){$('np').hidden=false};$('npClose').onclick=function(){if(settings.smart){go('home')}$('np').hidden=true};
function openVideo(t,url){audio.pause();var v=$('video');v.src=url;$('vidTitle').textContent=t.title;$('vid').hidden=false;v.play().catch(function(){})}
$('vidClose').onclick=function(){var v=$('video');v.pause();v.removeAttribute('src');v.load();$('vid').hidden=true};

/* ---------- kids mode (one-way lock) ---------- */
var kids=LS.get('kids',false);
function kidsLockDB(){return tx('readwrite',function(s){s.put({id:'__kidslock',kids:true,added:0})})}
function turnOnKids(){if(kids)return;if(!confirm("Kids mode can't be turned off inside the app. Continue?"))return;kids=true;LS.set('kids',true);kidsLockDB();applyModes();toast('Kids mode is on');render()}
function applyKids(){document.body.classList.toggle('kids',kids);var kb=$('kidsBtn');if(kb)kb.hidden=kids;}
/* ---------- modes ---------- */
function applyModes(){applyKids();var b=document.body;b.classList.toggle('glasses',!!settings.glasses);b.classList.toggle('smart',!!settings.smart);b.classList.toggle('sun',!!settings.sun);
  $('glassBtn').setAttribute('aria-pressed',!!settings.glasses);$('smartBtn').setAttribute('aria-pressed',!!settings.smart);$('sunBtn').setAttribute('aria-pressed',!!settings.sun);
  document.querySelector('meta[name=theme-color]').content=(settings.sun||settings.glasses)?'#000000':'#121212'}
function setMode(k,v){settings[k]=v===undefined?!settings[k]:v;LS.set('settings',settings);applyModes();
  toast({glasses:'Glasses mode ',smart:'Smart Glasses mode ',sun:'Ray-Ban mode '}[k]+(settings[k]?'ON':'OFF'));
  if(k==='smart'&&settings.smart&&cur)$('np').hidden=false;if(k==='smart'&&!settings.smart)$('np').hidden=true;if(curView==='settings')render()}
if($('kidsBtn'))$('kidsBtn').onclick=turnOnKids;$('glassBtn').onclick=function(){setMode('glasses')};$('smartBtn').onclick=function(){setMode('smart')};$('sunBtn').onclick=function(){setMode('sun')};

/* ---------- views ---------- */
var curView='home',param=null;
function go(v,p){curView=v;param=p;[].forEach.call(document.querySelectorAll('#nav button'),function(b){b.classList.toggle('on',b.dataset.go===v||(v==='playlist'||v==='liked'||v==='uploads')&&b.dataset.go==='library'||v==='credits'&&b.dataset.go==='settings')});render();view.scrollTop=0}
[].forEach.call(document.querySelectorAll('#nav button'),function(b){b.onclick=function(){go(b.dataset.go)}});
function rowHTML(t,list,i,extra){var th=t.upload?(t.upload.thumb?'<img src="'+t.upload.thumb+'" alt="">':(t.upload.type.indexOf('video')===0?'🎬':'🎧')):(t.art?'<img src="'+t.art+'" alt="">':'<img src="'+artFor(t.group)+'" alt="">');
  return '<div class="row'+(cur&&cur.id===t.id?' playing':'')+'" data-id="'+t.id+'"><button class="row" style="padding:0;flex:1" data-play="'+i+'" data-list="'+list+'"><span class="th" style="background:'+((GROUPS[t.group]||{}).c||'#444')+'">'+th+'</span><span class="ti"><b>'+esc(t.title)+'</b><small>'+esc(t.artist)+'</small></span></button>'
   +'<button class="mini'+(isLiked(t.id)?' liked':'')+'" data-like="'+t.id+'" aria-label="Like">'+(isLiked(t.id)?'♥':'♡')+'</button><button class="mini" data-add="'+t.id+'" aria-label="Add to playlist">＋</button>'+(extra||'')+'</div>'}
var LISTS={};
function listHTML(name,ids,extra){LISTS[name]=ids;return ids.map(function(id,i){var t=byId(id);return t?rowHTML(t,name,i,extra&&extra(t)):''}).join('')||'<p class="note">Nothing here yet.</p>'}
function groupIds(g){return TRACKS.filter(function(t){return t.group===g}).map(function(t){return t.id})}
function card(title,sub,cover,act){return '<button class="card" '+act+'><div class="cover" style="background:'+cover.c+'">'+cover.h+'</div><b>'+esc(title)+'</b><small>'+esc(sub)+'</small></button>'}
function render(){LISTS={};var h='';
 if(curView==='home'){var hr=new Date().getHours(),gs=Object.keys(GROUPS).filter(function(g){return groupIds(g).length});LISTS.all=TRACKS.map(function(t){return t.id}).concat(uploads.map(function(u){return u.id}));
   h='<h1>'+(hr<12?'Good morning':hr<18?'Good afternoon':'Good evening')+' 👋</h1>';
   if(!LISTS.all.length){h+='<div class="set" style="flex-direction:column;text-align:center;padding:40px 20px"><div style="font-size:64px">🎶</div><h2 style="margin:6px 0">Upload your songs and videos to get started</h2><p class="note">They stay private on this iPad.</p><button class="btn y" id="upHome">⬆️ Upload</button></div>'}
   else{h+='<div class="chips"><button class="btn y" data-playall="all">▶ Play all</button><button class="btn" data-shuf="all">🔀 Shuffle all</button></div><div class="grid">'+gs.map(function(g){var f=TRACKS.find(function(t){return t.group===g&&t.art});return card(g,GROUPS[g].d+' · '+groupIds(g).length+' songs',{c:GROUPS[g].c,h:'<img src="'+(f?f.art:artFor(g))+'" alt="">'},'data-open="'+esc(g)+'"')}).join('')
   +card('Liked Songs',liked.length+' songs',{c:'#5b3cc4',h:'💜'},'data-go2="liked"')+(uploads.length?card('My Uploads',uploads.length+' files · private',{c:'#333',h:'🔒'},'data-go2="library"'):'')+'</div>';
   gs.forEach(function(g){h+='<h2>'+GROUPS[g].e+' '+esc(g)+'</h2>'+listHTML(g,groupIds(g))})}}
 else if(curView==='playlist'){var g=param,isUser=g.indexOf('pl:')===0,pl=isUser&&playlists.find(function(p){return 'pl:'+p.id===g});var ids=isUser?(pl?pl.ids:[]):groupIds(g);var name=isUser?(pl?pl.name:'?'):g;
   h='<h1>'+esc(name)+'</h1><div class="chips"><button class="btn y" data-playall="'+esc(g)+'">▶ Play</button><button class="btn" data-shuf="'+esc(g)+'">🔀 Shuffle</button>'+(isUser&&!kids?'<button class="btn" data-delpl="'+pl.id+'">🗑 Delete playlist</button>':'')+'</div>'
   +listHTML(g,ids,isUser?function(t){return '<button class="mini" data-rm="'+t.id+'" aria-label="Remove">✕</button>'}:null);}
 else if(curView==='liked'){h='<h1>💜 Liked Songs</h1><div class="chips"><button class="btn y" data-playall="liked">▶ Play</button></div>'+listHTML('liked',liked)+'<p class="note">Liked songs get saved for offline listening when possible.</p>';}
 else if(curView==='search'){h='<h1>Search</h1><input type="search" id="q" placeholder="What do you want to listen to?" value="'+esc(param||'')+'" autocomplete="off"><div id="res"></div>';}
 else if(curView==='library'){h='<h1>Your Library</h1><div class="chips"><button class="btn y" id="newPl">＋ New playlist</button><button class="btn" id="up2">⬆️ Upload video/audio</button></div><div class="grid">'
   +card('Liked Songs',liked.length+' songs',{c:'#5b3cc4',h:'💜'},'data-go2="liked"')
   +playlists.map(function(p){return card(p.name,p.ids.length+' songs · Playlist',{c:'#333',h:'🎶'},'data-open="pl:'+p.id+'"')}).join('')+'</div>'
   +'<h2>🔒 My Uploads</h2><p class="note">Private: these stay only on this iPad. Nobody else can see them. Used: <b id="used">'+fmtB(uploads.reduce(function(a,u){return a+u.size},0))+'</b><span id="quota"></span></p>'
   +listHTML('uploads',uploads.map(function(u){return u.id}),kids?null:function(t){return '<button class="mini" data-ren="'+t.id+'" aria-label="Rename">✏️</button><button class="mini" data-del="'+t.id+'" aria-label="Delete">🗑</button>'});}
 else if(curView==='settings'){h='<h1>Settings</h1>'
   +sw('glasses','👓 Glasses mode','Bigger text and buttons, high contrast. For regular eyeglasses.')
   +sw('smart','🥽 Smart Glasses mode','For Bluetooth smart glasses (like Ray-Ban Meta): music first, giant play/pause/skip, videos play as audio, works with tap/swipe on the glasses and lock screen.')
   +sw('sun','🕶️ Ray-Ban mode','For sunglasses: extra bright, bold, white & yellow on black so it is easy to read through dark lenses. Tip: polarized lenses can make the screen look dim at some angles, so tilt the iPad a little if it looks dark.')
   +'<button class="set" style="width:100%" id="rulesBtn"><span>📜 Community Rules</span><span>›</span></button>'+(kids?'<div class="set"><b>🧒 Kids mode is on</b></div>':'<div class="set"><div><b>🧒 Kids mode</b><br><span class="note">Locks the app for kids: no deleting, no outside links. Can\'t be turned off inside the app.</span></div><button class="btn y" id="kidsOn">Turn on</button></div>')+(kids?'':'<button class="set" style="width:100%" data-go2="credits"><span>📜 Music credits & licenses</span><span>›</span></button>')+'<div class="set"><div><b>📲 Add to Home Screen</b><br><span class="note">In Safari tap Share, then "Add to Home Screen". The app will be named "Spotify Copycat". Open it once online so it works offline.</span></div></div><p class="note">Your uploads stay private on this iPad. The app works offline.</p>';}
 else if(curView==='credits'){h='<h1>Music credits</h1><p class="note">Tunewave has no built-in songs. Everything you hear is your own uploads. Click a source link for full details.</p><table><tr><th>Title</th><th>Artist</th><th>License</th><th>Source</th></tr>'
   +TRACKS.map(function(t){return '<tr><td>'+esc(t.title)+'</td><td>'+esc(t.artist)+(t.performer?'<br><small>'+esc(t.performer)+'</small>':'')+'</td><td>'+esc(t.license)+'</td><td><a href="'+esc(t.source)+'" target="_blank" rel="noopener">Commons</a></td></tr>'}).join('')+'</table>'
   +'<p class="note">App icon is original to Tunewave.</p>';}
 view.innerHTML=h;
 if(curView==='search'){var q=$('q');q.oninput=function(){param=q.value;var s=q.value.toLowerCase().trim();var ids=TRACKS.concat(uploads.map(function(u){return byId(u.id)})).filter(function(t){return !s||(t.title+' '+t.artist+' '+t.group).toLowerCase().indexOf(s)>=0}).map(function(t){return t.id});LISTS={};$('res').innerHTML=(s?'':'<h2>Browse all</h2>')+listHTML('search',ids)};q.oninput()}
 if($('rulesBtn'))$('rulesBtn').onclick=function(){showRules()};
 if($('kidsOn'))$('kidsOn').onclick=turnOnKids;
 if(curView==='home'&&$('upHome'))$('upHome').onclick=pickFiles;
 if(curView==='library'){$('newPl').onclick=function(){newPlaylist()};$('up2').onclick=pickFiles;if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(function(e){var el=$('quota');if(el&&e.quota)el.textContent=' (free space for the app: about '+fmtB(e.quota-e.usage)+')'})}
}
function sw(k,t,d){return '<div class="set"><div><b>'+t+'</b><br><span class="note">'+d+'</span></div><button class="sw" role="switch" aria-checked="'+!!settings[k]+'" aria-label="'+t+'" data-mode="'+k+'"></button></div>'}
function newPlaylist(addId){var n=prompt('Name your playlist','My Playlist #'+(playlists.length+1));if(!n)return null;var p={id:Date.now().toString(36),name:n.slice(0,60),ids:addId?[addId]:[]};playlists.push(p);LS.set('playlists',playlists);toast('Created "'+p.name+'"');render();return p}
function addTo(id){if(!playlists.length){newPlaylist(id);return}var names=playlists.map(function(p,i){return (i+1)+'. '+p.name}).join('\n');var a=prompt('Add to which playlist? Type a number, or a new name:\n'+names,'1');if(!a)return;var i=parseInt(a,10)-1;
  if(playlists[i]){if(playlists[i].ids.indexOf(id)<0)playlists[i].ids.push(id);LS.set('playlists',playlists);toast('Added to '+playlists[i].name);render()}else{var p={id:Date.now().toString(36),name:a.slice(0,60),ids:[id]};playlists.push(p);LS.set('playlists',playlists);toast('Created "'+p.name+'"');render()}}
view.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var d=b.dataset;
 if(d.play!==undefined){setQueue(LISTS[d.list],+d.play)}
 else if(d.like)like(d.like);else if(d.add)addTo(d.add);
 else if(d.open)go('playlist',d.open);else if(d.go2)go(d.go2);
 else if(d.playall||d.shuf){var k=d.playall||d.shuf;var ids=LISTS[k];if(ids&&ids.length){if(d.shuf){shuffle=true;LS.set('shuffle',true)}setQueue(ids,d.shuf?Math.floor(Math.random()*ids.length):0)}}
 else if(kids&&(d.delpl||d.del||d.ren||d.rm)){}
 else if(d.delpl){if(confirm('Delete this playlist?')){playlists=playlists.filter(function(p){return p.id!==d.delpl});LS.set('playlists',playlists);go('library')}}
 else if(d.rm){var pl=playlists.find(function(p){return 'pl:'+p.id===param});pl.ids=pl.ids.filter(function(x){return x!==d.rm});LS.set('playlists',playlists);render()}
 else if(d.mode)setMode(d.mode);
 else if(d.ren){var u=uploads.find(function(x){return x.id===d.ren});var n=prompt('New name',u.name);if(n){tx('readwrite',function(s){var r=s.get(u.id);r.onsuccess=function(){r.result.name=n.slice(0,80);s.put(r.result)}}).then(loadUploads).then(render)}}
 else if(d.del){var u2=uploads.find(function(x){return x.id===d.del});if(confirm('Delete "'+u2.name+'" from this iPad?')){if(cur&&cur.id===u2.id){audio.pause();audio.removeAttribute('src');cur=null;ui()}
   liked=liked.filter(function(x){return x!==u2.id});LS.set('liked',liked);tx('readwrite',function(s){s.delete(u2.id)}).then(loadUploads).then(function(){toast('Deleted');render()})}}
});
applyModes();loadUploads().catch(function(){}).then(function(){render()});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js');
window.__tw={showRules:showRules,get kids(){return kids},turnOnKids:turnOnKids,get cur(){return cur},get queue(){return queue},audio:audio,go:go,setMode:setMode,addTo:addTo,uploads:function(){return uploads}};
})();
