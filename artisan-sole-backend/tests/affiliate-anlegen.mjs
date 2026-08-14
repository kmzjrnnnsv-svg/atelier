/**
 * Der neue Affiliate-Ablauf über HTTP: anlegen mit nur einer E-Mail, Einladung,
 * Selbsteintrag der Stammdaten, Grenzen der Selbstbedienung, Änderung durch die Verwaltung.
 * Braucht einen laufenden Server auf 3099 mit eigener Datenbank (siehe LIESMICH.md).
 */
const B='http://localhost:3099'
const H={'Content-Type':'application/json','X-Requested-With':'ArtisanSole'}
let ok=0,bad=[]
const p=(w,c,z='')=>{ if(c){ok++;console.log('  OK    ',w,z)}else{bad.push(w);console.log('  FEHLER',w,z)} }
const ruf=async(pf,{method='GET',body,token}={})=>{
  const r=await fetch(B+pf,{method,headers:{...H,...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const t=await r.text(); let d=null; try{d=JSON.parse(t)}catch{d=t}
  return {status:r.status,d}
}
const zz=()=>Math.random().toString(36).slice(2,7)

let r=await ruf('/api/auth/login',{method:'POST',body:{email:'admin@artisansole.com',password:'ArtisanSole@2026!'}})
const admin=r.d.accessToken

// 1) Anlegen mit NUR E-Mail
const mail=`neu-${zz()}@x.de`
r=await ruf('/api/affiliates',{method:'POST',token:admin,body:{email:mail}})
p('Anlegen mit nur E-Mail',r.status===201,`HTTP ${r.status} ${r.status!==201?JSON.stringify(r.d):''}`)
p('Code automatisch vergeben',!!r.d?.code,r.d?.code)
p('Einladung verschickt',r.d?.email_sent===true,String(r.d?.email_error||''))
const token=r.d.invite_token
p('Einladungs-Token vorhanden',!!token)

// 2) Ohne E-Mail abgewiesen
r=await ruf('/api/affiliates',{method:'POST',token:admin,body:{}})
p('Ohne E-Mail abgewiesen',r.status===400,`HTTP ${r.status}`)

// 3) Affiliate meldet sich über die Einladung an
r=await ruf('/api/auth/register-affiliate',{method:'POST',body:{token,name:'Qasim Raza',password:'Passwort1!'}})
p('Affiliate aktiviert Konto',r.status===201,`HTTP ${r.status}`)
const aff=r.d.accessToken

// 4) Stammdaten sind leer, Zustimmung fehlt
r=await ruf('/api/affiliates/me',{token:aff})
p('Eigener Stand abrufbar',r.status===200,`HTTP ${r.status}`)
p('Zustimmung noch offen',!r.d?.affiliate?.terms_accepted_at,String(r.d?.affiliate?.terms_accepted_at))

// 5) Affiliate trägt seine Daten selbst ein
r=await ruf('/api/affiliates/me',{method:'PATCH',token:aff,body:{
  full_name:'Qasim Raza', phone:'+4915100000', street:'Musterweg 3', postal_code:'10115',
  city:'Berlin', country:'DE', birth_date:'1990-05-01', tax_status:'small_business',
  tax_number:'12/345/67890', iban:'DE02120300000000202051', account_holder:'Qasim Raza',
  terms_accepted:true,
}})
p('Selbsteintrag gespeichert',r.status===200,`HTTP ${r.status} ${r.status!==200?JSON.stringify(r.d):''}`)
p('Anschrift übernommen',r.d?.city==='Berlin' && r.d?.iban?.startsWith('DE02'),`${r.d?.city}`)
p('Zustimmung vermerkt',!!r.d?.terms_accepted_at)

// 6) Konditionen kann er NICHT selbst setzen
r=await ruf('/api/affiliates/me',{method:'PATCH',token:aff,body:{commission_value:99,code:'geklaut',status:'suspended'}})
p('Konditionen unveränderbar',r.status===400,`HTTP ${r.status}`)
r=await ruf('/api/affiliates/me',{token:aff})
p('Provision unverändert',r.d?.affiliate?.commission_value===10,String(r.d?.affiliate?.commission_value))
p('Code unverändert',r.d?.affiliate?.code!=='geklaut',r.d?.affiliate?.code)

// 7) Admin kann alles ändern
r=await ruf('/api/affiliates',{token:admin})
const id=(r.d.affiliates||r.d).find(a=>a.email===mail)?.id
r=await ruf(`/api/affiliates/${id}`,{method:'PUT',token:admin,body:{city:'Hamburg',commission_value:15,full_name:'Q. Raza'}})
p('Admin ändert Daten',r.status===200 && r.d?.city==='Hamburg' && r.d?.commission_value===15,`HTTP ${r.status}`)

// 8) Der eigene Code gilt für den eigenen Einkauf nicht
const code=r.d?.code
r=await ruf(`/api/affiliates/validate/${code}`)
p('Gast bekommt den Vorteil',r.status===200 && r.d?.valid===true,`HTTP ${r.status}`)
r=await ruf(`/api/affiliates/validate/${code}`,{token:aff})
p('Eigener Code abgewiesen',r.status===409 && r.d?.code==='EIGENER_CODE',`HTTP ${r.status} ${JSON.stringify(r.d)}`)

// Ein anderes Konto darf ihn selbstverständlich weiter benutzen.
r=await ruf('/api/auth/register',{method:'POST',body:{name:'Fremder Kunde',email:`kunde-${zz()}@x.de`,password:'Passwort1!'}})
r=await ruf(`/api/affiliates/validate/${code}`,{token:r.d?.accessToken})
p('Fremder Kunde bekommt ihn',r.status===200 && r.d?.valid===true,`HTTP ${r.status}`)

console.log(`\n  ${ok} bestanden, ${bad.length} fehlgeschlagen`)
if(bad.length){console.log('  '+bad.join('\n  '));process.exit(1)}
