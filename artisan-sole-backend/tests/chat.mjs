/**
 * Der Nachrichtenverlauf über HTTP, wie ihn Kunde und Verwaltung benutzen.
 * Braucht einen laufenden Server auf 3099 mit eigener Datenbank (siehe LIESMICH.md).
 */
const B='http://localhost:3099'
const H={'Content-Type':'application/json','X-Requested-With':'ArtisanSole'}
let ok=0, bad=[]
const p=(w,c,z='')=>{ if(c){ok++;console.log('  OK    ',w,z)} else {bad.push(w);console.log('  FEHLER',w,z)} }
const ruf=async(pf,{method='GET',body,token}={})=>{
  const r=await fetch(B+pf,{method,headers:{...H,...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const t=await r.text(); let d=null; try{d=JSON.parse(t)}catch{d=t}
  return {status:r.status,d}
}
const zz=()=>Math.random().toString(36).slice(2,8)

// Kunde anlegen
const mail=`kunde-${zz()}@x.de`
let r=await ruf('/api/auth/register',{method:'POST',body:{name:'Kunde Test',email:mail,password:'Passwort1!'}})
p('Kunde registriert',r.status===201,`HTTP ${r.status}`)
const kunde=r.d.accessToken

// Admin
r=await ruf('/api/auth/login',{method:'POST',body:{email:'admin@artisansole.com',password:'ArtisanSole@2026!'}})
p('Admin angemeldet',r.status===200,`HTTP ${r.status}`)
const admin=r.d.accessToken

// Leerer Verlauf
r=await ruf('/api/chat/mine',{token:kunde})
p('Leerer Verlauf',r.status===200 && Array.isArray(r.d.messages) && r.d.messages.length===0)

// Kunde schreibt
r=await ruf('/api/chat/mine',{method:'POST',token:kunde,body:{text:'Hallo, wann kommt mein Paar?'}})
p('Kunde schreibt',r.status===201 && r.d.messages.length===1,`HTTP ${r.status}`)

// Leere Nachricht abgewiesen
r=await ruf('/api/chat/mine',{method:'POST',token:kunde,body:{text:'   '}})
p('Leere Nachricht abgewiesen',r.status===400,`HTTP ${r.status}`)

// Team sieht Verlauf, Kategorie 'user'
r=await ruf('/api/chat/threads',{token:admin})
p('Team sieht Verlauf',r.status===200 && r.d.length>=1,`HTTP ${r.status}`)
const th=r.d.find(t=>t.user_email===mail)
p('Kategorie = user',th?.kategorie==='user',th?.kategorie)
p('Ungelesen beim Team = 1',th?.ungelesen===1,String(th?.ungelesen))

// Zähler je Kategorie
r=await ruf('/api/chat/ungelesen',{token:admin})
p('Zähler je Kategorie',r.status===200 && r.d.user>=1,JSON.stringify(r.d))

// Team liest -> gelesen
r=await ruf(`/api/chat/threads/${th.id}`,{token:admin})
p('Team liest Verlauf',r.status===200 && r.d.messages.length===1)
r=await ruf('/api/chat/threads',{token:admin})
p('Nach Lesen ungelesen = 0',r.d.find(t=>t.id===th.id)?.ungelesen===0)

// Team antwortet
r=await ruf(`/api/chat/threads/${th.id}`,{method:'POST',token:admin,body:{text:'In etwa vier Wochen.'}})
p('Team antwortet',r.status===201 && r.d.messages.length===2,`HTTP ${r.status}`)

// Kunde hat ungelesen
r=await ruf('/api/chat/mine/ungelesen',{token:kunde})
p('Kunde: 1 ungelesen',r.d.ungelesen===1,String(r.d.ungelesen))
r=await ruf('/api/chat/mine',{token:kunde})
p('Kunde sieht Antwort',r.d.messages.length===2 && r.d.messages[1].von==='team')
r=await ruf('/api/chat/mine/ungelesen',{token:kunde})
p('Nach Lesen 0 ungelesen',r.d.ungelesen===0,String(r.d.ungelesen))

// Fremdzugriff
r=await ruf('/api/chat/threads',{token:kunde})
p('Kunde kommt nicht an Team-Liste',r.status===403,`HTTP ${r.status}`)
r=await ruf(`/api/chat/threads/${th.id}`,{token:kunde})
p('Kunde kommt nicht an fremden Verlauf',r.status===403,`HTTP ${r.status}`)
r=await ruf('/api/chat/mine')
p('Ohne Anmeldung kein Zugriff',r.status===401,`HTTP ${r.status}`)

console.log(`\n  ${ok} bestanden, ${bad.length} fehlgeschlagen`)
if(bad.length) { console.log('  '+bad.join('\n  ')); process.exit(1) }
