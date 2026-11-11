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
      set:function(o){return client.from(TABLE).upsert({user_id:uid(),id:id,data:o,updated_at:new Date().toISOString()},{onConflict:'user_id,id'}).then(function(r){if(r.error)fail(r.error);});},
      delete:function(){return client.from(TABLE).delete().eq('user_id',uid()).eq('id',id).then(function(r){if(r.error)fail(r.error);});},
      get:function(){return client.from(TABLE).select('id,data').eq('user_id',uid()).eq('id',id).maybeSingle().then(function(r){if(r.error)fail(r.error);return{exists:!!r.data,data:function(){return r.data&&r.data.data;}};});}
    };},
    limit:function(n){return{get:function(){return client.from(TABLE).select('id,data').eq('user_id',uid()).limit(n).then(function(r){if(r.error)fail(r.error);return{docs:(r.data||[]).map(function(x){return{id:x.id,data:function(){return x.data;}};})};});}};}
  };
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
  function acct(){if(location.hash!=='#sessio'||document.getElementById('fsAcct'))return;
    var b=document.createElement('div');b.id='fsAcct';b.style.cssText='position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:100001;background:#fff;border:1.5px solid #D6D4CD;border-radius:16px;padding:14px 16px;box-shadow:0 14px 34px -12px rgba(28,31,35,.4);font:15px/1.4 -apple-system,system-ui,sans-serif;color:#1C1F23;display:flex;gap:12px;align-items:center';
    auth().then(function(s){b.innerHTML='<span>'+(s&&s.user?'Sessió: '+String(s.user.email||'').replace(/</g,'&lt;'):'Sense sessió (només local)')+'</span>'+(s?'<button id="fsOut" style="height:40px;padding:0 16px;border:0;border-radius:999px;background:#1C1F23;color:#fff;font:700 14px/1 -apple-system,system-ui,sans-serif;cursor:pointer">Tanca la sessió</button>':'')+'<button id="fsX" style="height:40px;width:40px;border:0;border-radius:50%;background:#ECE9E1;cursor:pointer;font-size:20px" aria-label="Tanca">×</button>';
      document.body.appendChild(b);b.querySelector('#fsX').onclick=function(){b.remove();history.replaceState(null,'',location.pathname+location.search);};
      var ob=b.querySelector('#fsOut');if(ob)ob.onclick=function(){client.auth.signOut().then(function(){try{localStorage.removeItem('faristol.k');}catch(e){}location.hash='';location.reload();});};});}
  window.addEventListener('hashchange',acct);window.addEventListener('load',acct);
})();
