/* Faristol · sincronització amb Supabase (fora de l'artefacte de Claude).
   Implementa la mateixa interfície mínima que l'app ja fa servir (window.claude.use: db, user, downloads),
   de manera que el codi de l'app no canvia. Sense configuració o sense sessió, l'app funciona igual només en local. */
(function(){
  if(window.claude)return;                         /* dins de l'artefacte de Claude: no cal */
  var cfg=window.FARISTOL_CONFIG||{};
  var ok=/^https:\/\/[a-z0-9-]+\.supabase\.co/i.test(cfg.supabaseUrl||'')&&!/X{4,}/.test(cfg.supabaseUrl+cfg.supabaseKey)&&(cfg.supabaseKey||'').length>20;
  var SB_SRC='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var client=null,session=null,authP=null,TABLE='faristol_docs';

  function loadSb(){return new Promise(function(res,rej){if(window.supabase&&window.supabase.createClient)return res(window.supabase);
    var s=document.createElement('script');s.src=SB_SRC;s.onload=function(){res(window.supabase);};s.onerror=function(){rej(new Error('No s\'ha pogut carregar Supabase'));};document.head.appendChild(s);});}

  /* ---------- pantalla d'entrada ---------- */
  function loginUI(){return new Promise(function(done){
    var o=document.createElement('div');o.id='fsLogin';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','Entra a Faristol');
    o.style.cssText='position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:#FAFAF8;font:16px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;color:#1C1F23';
    o.innerHTML='<form style="width:min(380px,100%);display:grid;gap:12px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:6px"><img src="icons/icon-192.png" alt="" width="48" height="48" style="border-radius:11px"><h1 style="margin:0;font-size:26px;letter-spacing:-.03em">Faristol</h1></div>'+
    '<p style="margin:0 0 4px;color:#62666D">Entra per sincronitzar la biblioteca entre dispositius.</p>'+
    '<label style="font-weight:700;font-size:14px">Correu<input id="fsE" type="email" autocomplete="username" required style="display:block;width:100%;box-sizing:border-box;margin-top:6px;height:50px;padding:0 14px;border:1.5px solid #D6D4CD;border-radius:12px;font:inherit;background:#fff"></label>'+
    '<label style="font-weight:700;font-size:14px">Contrasenya<input id="fsP" type="password" autocomplete="current-password" required style="display:block;width:100%;box-sizing:border-box;margin-top:6px;height:50px;padding:0 14px;border:1.5px solid #D6D4CD;border-radius:12px;font:inherit;background:#fff"></label>'+
    '<button type="submit" style="height:52px;border:0;border-radius:999px;background:#1C1F23;color:#fff;font:700 16px/1 -apple-system,system-ui,sans-serif;cursor:pointer">Entra</button>'+
    '<p id="fsM" role="status" style="min-height:20px;margin:0;color:#B3121F;font-size:14px"></p>'+
    '<button type="button" id="fsSkip" style="border:0;background:none;color:#4A4E55;font:600 15px/1 -apple-system,system-ui,sans-serif;text-decoration:underline;cursor:pointer;padding:8px">Continua sense sincronitzar</button></form>';
    document.body.appendChild(o);var f=o.querySelector('form'),m=o.querySelector('#fsM');o.querySelector('#fsE').focus();
    function end(v){o.remove();done(v);}
    f.addEventListener('submit',function(e){e.preventDefault();m.style.color='#4A4E55';m.textContent='Entrant…';
      client.auth.signInWithPassword({email:o.querySelector('#fsE').value.trim(),password:o.querySelector('#fsP').value}).then(function(r){
        if(r.error||!r.data||!r.data.session){m.style.color='#B3121F';m.textContent='Correu o contrasenya incorrectes.';return;}end(r.data.session);
      }).catch(function(){m.style.color='#B3121F';m.textContent='No hi ha connexió amb Supabase.';});});
    o.querySelector('#fsSkip').addEventListener('click',function(){end(null);});
  });}

  function auth(){
    if(authP)return authP;
    authP=!ok?Promise.resolve(null):loadSb().then(function(sb){
      client=sb.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      return client.auth.getSession().then(function(r){
        if(r&&r.data&&r.data.session)return r.data.session;
        if(!navigator.onLine)return null;
        return new Promise(function(res){if(document.body)res();else document.addEventListener('DOMContentLoaded',res);}).then(loginUI);
      });
    }).then(function(s){session=s;return s;},function(){return null;});
    return authP;
  }

  /* ---------- db: col.doc(id).set/delete, col.limit(n).get() ---------- */
  function uid(){return session&&session.user&&session.user.id;}
  function fail(e){throw e||new Error('supabase');}
  var COL={
    doc:function(id){return{
      /* escriptura (M3): una sola crida al servidor que desa a fs_items i manté la còpia antiga, tot o res.
         Si la funció no existeix (servidor sense M3) o l'interruptor és a «antic», es fa com abans. */
      set:function(o){
        function old(){return client.from(TABLE).upsert({user_id:uid(),id:id,data:o,updated_at:new Date().toISOString()},{onConflict:'user_id,id'}).then(function(r){if(r.error)fail(r.error);FSW='antiga';});}
        if(!fsOn())return old();
        return client.rpc('fs_put',{p_src:id,p_data:o}).then(function(r){if(r.error){if(noFn(r.error))return old();fail(r.error);}FSW='nova';});},
      delete:function(){
        function old(){return client.from(TABLE).delete().eq('user_id',uid()).eq('id',id).then(function(r){if(r.error)fail(r.error);FSW='antiga';});}
        if(!fsOn())return old();
        return client.rpc('fs_del',{p_src:id}).then(function(r){if(r.error){if(noFn(r.error))return old();fail(r.error);}FSW='nova';});},
      get:function(){return client.from(TABLE).select('id,data').eq('user_id',uid()).eq('id',id).maybeSingle().then(function(r){if(r.error)fail(r.error);return{exists:!!r.data,data:function(){return r.data&&r.data.data;}};});}
    };},
    limit:function(n){return{get:function(){
      if(!fsOn()){FSINFO={mode:'antic',why:'interruptor'};return legacyGet(n);}
      return fsGet().catch(function(e){FSINFO={mode:'antic',why:String(e&&e.message||e)};return legacyGet(n);});
    }};}
  };

  /* ---------- lectura (M2) ----------
     Antiga: totes les files de faristol_docs. Nova: dash/ins/meta es llegeixen igual que sempre (byte a byte);
     les fitxes (d-*) vénen de fs_items de manera incremental, amb còpia local (IndexedDB).
     Qualsevol error o discrepància ⇒ lectura antiga. L'escriptura no canvia: el servidor manté fs_items al dia. */
  var FSINFO={mode:'?'},FSDBP=null,FSW='';
  function noFn(e){return !!e&&(e.code==='PGRST202'||/could not find the function/i.test(String(e.message||'')));}
  function fsOn(){try{return localStorage.getItem('faristol.fs')!=='0';}catch(e){return true;}}
  function legacyGet(n){return client.from(TABLE).select('id,data').eq('user_id',uid()).limit(n).then(function(r){if(r.error)fail(r.error);return{docs:(r.data||[]).map(function(x){return{id:x.id,data:function(){return x.data;}};})};});}
  function idb(){if(FSDBP)return FSDBP;FSDBP=new Promise(function(res){try{var q=indexedDB.open('faristol-fs',1);q.onupgradeneeded=function(){q.result.createObjectStore('k');};q.onsuccess=function(){res(q.result);};q.onerror=function(){res(null);};q.onblocked=function(){res(null);};}catch(e){res(null);}});return FSDBP;}
  function idbGet(k){return idb().then(function(db){if(!db)return null;return new Promise(function(res){try{var r=db.transaction('k').objectStore('k').get(k);r.onsuccess=function(){res(r.result||null);};r.onerror=function(){res(null);};}catch(e){res(null);}});});}
  function idbSet(k,v){return idb().then(function(db){if(!db)return;return new Promise(function(res){try{var t=db.transaction('k','readwrite');t.objectStore('k').put(v,k);t.oncomplete=function(){res();};t.onerror=function(){res();};t.onabort=function(){res();};}catch(e){res();}});});}
  function fsPull(since){
    var out=[],PG=100;
    function page(from){
      var q=client.from('fs_items').select('id,rev,body,updated_at,deleted_at').eq('user_id',uid()).like('id','d-%');
      if(since)q=q.gt('updated_at',since);
      return q.order('updated_at',{ascending:true}).order('id',{ascending:true}).range(from,from+PG-1).then(function(r){
        if(r.error)fail(r.error);var d=r.data||[];out=out.concat(d);return d.length===PG?page(from+PG):out;});
    }
    return page(0);
  }
  function cnt(table,live){var q=client.from(table).select('id',{count:'exact',head:true}).eq('user_id',uid()).like('id','d-%');if(live)q=q.is('deleted_at',null);
    return q.then(function(r){if(r.error)fail(r.error);return r.count;});}
  function fsGet(){
    var key='u:'+uid(),cache,mode='inc',nrows=0;
    function apply(rows){nrows+=rows.length;rows.forEach(function(x){
      var c=cache.items[x.id];if(c&&c.rev>x.rev)return;
      if(x.deleted_at)delete cache.items[x.id];else cache.items[x.id]={rev:x.rev,body:x.body,updated_at:x.updated_at};
      if(!cache.cursor||new Date(x.updated_at)>new Date(cache.cursor))cache.cursor=x.updated_at;});}
    function since(){return cache.cursor?new Date(new Date(cache.cursor).getTime()-120000).toISOString():null;}
    function check(){return Promise.all([cnt('fs_items',true),cnt(TABLE,false)]).then(function(a){
      var mine=Object.keys(cache.items).length;
      if(a[0]!==a[1])throw new Error('paritat servidor '+a[0]+'/'+a[1]);   /* el vigilant no ha dut al dia fs_items */
      return a[0]===mine;});}
    return idbGet(key).then(function(c){
      cache=(c&&c.v===1&&c.items&&typeof c.items==='object')?c:{v:1,cursor:null,items:{}};
      if(!cache.cursor)mode='full';
      return fsPull(since());
    }).then(function(rows){apply(rows);return check();}).then(function(good){
      if(good)return;
      mode='refet';cache={v:1,cursor:null,items:{}};
      return fsPull(null).then(function(rows){apply(rows);return check();}).then(function(g2){if(!g2)throw new Error('còpia local no coincideix');});
    }).then(function(){return idbSet(key,cache);}).then(function(){
      return client.from(TABLE).select('id,data').eq('user_id',uid()).in('id',['dash','ins','meta']);
    }).then(function(r){
      if(r.error)fail(r.error);
      var docs=(r.data||[]).map(function(x){return{id:x.id,data:function(){return x.data;}};});
      Object.keys(cache.items).forEach(function(id){
        var o=cache.items[id].body;if(!o||typeof o!=='object')return;
        if(o.payload&&typeof o.payload==='object')o.payload=JSON.stringify(o.payload);
        docs.push({id:id,data:function(){return o;}});});
      FSINFO={mode:'nou',lectura:mode,files:nrows,fitxes:Object.keys(cache.items).length};
      return{docs:docs};
    });
  }
  try{if(location.hash==='#antic'){localStorage.setItem('faristol.fs','0');history.replaceState(null,'',location.pathname+location.search);}
      else if(location.hash==='#nou'){localStorage.removeItem('faristol.fs');history.replaceState(null,'',location.pathname+location.search);}}catch(e){}
  var DB={collection:function(){return COL;}};
  var USER={id:function(){return Promise.resolve(uid()||null);},canEdit:function(){return Promise.resolve(true);},isOwner:function(){return true;}};

  /* ---------- descàrregues ---------- */
  var MIME={json:'application/json',pdf:'application/pdf',zip:'application/zip',txt:'text/plain',csv:'text/csv',html:'text/html',png:'image/png',svg:'image/svg+xml'};
  var DL={save:function(o){return new Promise(function(res,rej){try{
    var d=o.data,ext=(String(o.filename).split('.').pop()||'').toLowerCase();
    var b=(d instanceof Blob)?d:new Blob([d],{type:MIME[ext]||'application/octet-stream'});
    var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=o.filename;a.style.display='none';document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},4000);res({});}catch(e){rej(e);}});}};

  window.claude={use:function(n){
    if(n==='downloads')return Promise.resolve(DL);
    if(n==='db')return auth().then(function(s){return s?DB:null;});
    if(n==='user')return auth().then(function(s){return s?USER:null;});
    return Promise.resolve(null);
  }};


  /* crida a una Edge Function amb el token de l'usuari (retrats des de fotos) */
  window.faristol=window.faristol||{};
  window.faristol.fn=function(name,body,signal){
    return auth().then(function(s){
      if(!s||!client)throw new Error('nosession');
      return client.auth.getSession().then(function(r){
        var t=r&&r.data&&r.data.session&&r.data.session.access_token;if(!t)throw new Error('nosession');
        return fetch(cfg.supabaseUrl.replace(/\/+$/,'')+'/functions/v1/'+name,{method:'POST',headers:{Authorization:'Bearer '+t,apikey:cfg.supabaseKey},body:body,signal:signal});
      });
    });
  };

  /* accés a Storage (imatges): URL, clau pública, token de sessió i id d'usuari */
  window.faristol.sb={url:(cfg.supabaseUrl||'').replace(/\/+$/,''),key:cfg.supabaseKey,uid:function(){return uid()||null;},
    tok:function(){return auth().then(function(s){if(!s||!client)throw new Error('nosession');return client.auth.getSession().then(function(r){var t=r&&r.data&&r.data.session&&r.data.session.access_token;if(!t)throw new Error('nosession');return t;});});}};

  /* petita targeta de compte: obre l'app amb #sessio */
  function rdTxt(){return 'Lectura: '+(FSINFO.mode==='nou'?'nova ('+FSINFO.fitxes+' fitxes, '+FSINFO.lectura+')':FSINFO.mode==='antic'?'antiga ('+String(FSINFO.why||'')+')':'esperant la primera lectura…')+(FSW?' · Escriptura: '+FSW:'');}
  function acct(){if(location.hash!=='#sessio'||document.getElementById('fsAcct'))return;
    var b=document.createElement('div');b.id='fsAcct';b.style.cssText='position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:100001;background:#fff;border:1.5px solid #D6D4CD;border-radius:16px;padding:14px 16px;box-shadow:0 14px 34px -12px rgba(28,31,35,.4);font:15px/1.4 -apple-system,system-ui,sans-serif;color:#1C1F23;display:flex;gap:12px;align-items:center';
    auth().then(function(s){b.innerHTML='<span>'+(s&&s.user?'Sessió: '+String(s.user.email||'').replace(/</g,'&lt;')+'<br><small id="fsRd">'+rdTxt()+'</small>':'Sense sessió (només local)')+'</span>'+(s?'<button id="fsOut" style="height:40px;padding:0 16px;border:0;border-radius:999px;background:#1C1F23;color:#fff;font:700 14px/1 -apple-system,system-ui,sans-serif;cursor:pointer">Tanca la sessió</button>':'')+'<button id="fsX" style="height:40px;width:40px;border:0;border-radius:50%;background:#ECE9E1;cursor:pointer;font-size:20px" aria-label="Tanca">×</button>';
      document.body.appendChild(b);var iv=setInterval(function(){var e=document.getElementById('fsRd');if(!e||!b.isConnected){clearInterval(iv);return;}e.textContent=rdTxt();},700);b.querySelector('#fsX').onclick=function(){clearInterval(iv);b.remove();history.replaceState(null,'',location.pathname+location.search);};
      var ob=b.querySelector('#fsOut');if(ob)ob.onclick=function(){client.auth.signOut().then(function(){try{localStorage.removeItem('faristol.k');}catch(e){}location.hash='';location.reload();});};});}
  window.addEventListener('hashchange',acct);window.addEventListener('load',acct);
})();
