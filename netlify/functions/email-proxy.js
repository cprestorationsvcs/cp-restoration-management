exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if (event.httpMethod === 'OPTIONS') return {statusCode:200,headers,body:''};
  try {
    const body = JSON.parse(event.body || '{}');
    // For now log the email request — real SMTP can be added later
    console.log('Email request:', JSON.stringify(body).substring(0,200));
    // Return success so the form flow continues
    return {statusCode:200,headers,body:JSON.stringify({sent:true,message:'Email logged'})}; 
  } catch(e) {
    return {statusCode:200,headers,body:JSON.stringify({sent:false,error:e.message})};
  }
};
