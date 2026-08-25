const logins = [
  { email: 'metro@wrectifai.com', pass: 'Metro@123' }, 
  { email: 'quickpit@wrectifai.com', pass: 'QuickPit@123' }, 
  { email: 'speedfix@wrectifai.com', pass: 'SpeedFix@123' }
];

async function test() { 
  for (const l of logins) { 
    const res = await fetch('http://127.0.0.1:3000/api/v1/auth/login', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ email: l.email, password: l.pass }) 
    }); 
    
    if (!res.ok) { 
      console.log('Login failed for', l.email); 
      continue; 
    } 
    
    const data = await res.json(); 
    console.log(`✅ Login success: ${data.data.user.garageName} (${l.email})`); 
    
    const token = data.data.accessToken; 
    
    const reqRes = await fetch('http://127.0.0.1:3000/api/v1/quotes/requests/garage', { 
      headers: { Authorization: `Bearer ${token}` } 
    }); 
    
    const reqData = await reqRes.json(); 
    
    let allMatch = true;
    if (reqData.data && reqData.data.length > 0) {
      allMatch = reqData.data.every(r => r.garage_id === data.data.user.garageId); 
    }
    console.log(`   Isolation Check (Quotes): ${allMatch ? '✅ PASS' : '❌ FAIL'} (${reqData.data ? reqData.data.length : 0} records)`); 
  } 
} 
test();
