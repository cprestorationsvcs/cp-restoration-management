// CP Restoration -- Email Proxy v2
const RESEND_KEY = process.env.RESEND_API_KEY;
const SUPA_URL   = process.env.SUPABASE_URL || 'https://jzkfembagpiuuoexmpoy.supabase.co';
const SUPA_KEY   = process.env.SUPABASE_KEY;
if(!RESEND_KEY) console.error('[email-proxy] RESEND_API_KEY not set');
if(!SUPA_KEY)   console.error('[email-proxy] SUPABASE_KEY not set');
exports.handler = async function(event) {
  const H = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers:H,body:''};
  if(event.httpMethod!=='POST') return {statusCode:405,headers:H,body:'Method not allowed'};
  if(!RESEND_KEY) return {statusCode:500,headers:H,body:JSON.stringify({error:'Email service not configured. Contact admin.'})};
  let b; try { b=JSON.parse(event.body||'{}'); } catch { return {statusCode:400,headers:H,body:'{}'}; }
  const {to,subject,html,text,client_id,client_name,post_to_portal,sent_by,sent_by_name}=b;
  if(!to||!subject) return {statusCode:400,headers:H,body:JSON.stringify({error:'Missing to or subject'})};
  let ok=false,err=null,eid=null;
  try {
    const res=await fetch('https://api.resend.com/emails',{method:'POST',
      headers:{'Authorization':'Bearer '+RESEND_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({from:'CP Restoration Services <onboarding@resend.dev>',to:[to],subject,
        html:html||('<p>'+(text||'').replace(/\n/g,'<br>')+'</p>'),text:text||''})});
    const d=await res.json(); ok=res.ok; eid=d.id||null;
    if(!ok) err=d.message||'Error '+res.status;
    console.log('[ep]',ok?'sent:'+eid:'fail:'+err);
  } catch(e){err=e.message;}
  if(SUPA_KEY&&client_id){
    const sh={'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json','Prefer':'return=minimal'};
    await fetch(SUPA_URL+'/rest/v1/client_messages',{method:'POST',headers:sh,body:JSON.stringify(
      {client_id,client_name:client_name||'',subject,body:text||'',direction:'outbound',from_team:true,
       sent_by:sent_by||'',sent_by_name:sent_by_name||'',email_sent:ok,email_id:eid,
       created_at:new Date().toISOString()})}).catch(function(e){console.error('[ep] db:',e.message);});
    if(post_to_portal){
      await fetch(SUPA_URL+'/rest/v1/status_updates',{method:'POST',headers:sh,body:JSON.stringify(
        {client_id,client_name:client_name||'',action:'Message from CP Restoration Team',
         notes:subject+(text?'\n\n'+text.substring(0,500):''),
         posted_by:sent_by||'',posted_by_name:sent_by_name||'',
         visible_to_client:true,created_at:new Date().toISOString()})}).catch(function(e){console.error('[ep] portal:',e.message);});
    }
  }
  return {statusCode:ok?200:500,headers:H,body:JSON.stringify({success:ok,error:err,email_id:eid})};
};
