const { exec } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

console.log("Starting Chrome in headless mode with disabled web security...");
const chromeProcess = exec('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless --remote-debugging-port=9222 --disable-gpu --no-sandbox --disable-web-security --user-data-dir=C:\\Users\\Dell\\AppData\\Local\\Temp\\chrome_dev_profile');

setTimeout(async () => {
  try {
    const targets = await getJson('http://localhost:9222/json/list');
    const target = targets.find(t => t.type === 'page');
    if (!target) throw new Error("No page target found");
    
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    
    ws.on('open', async () => {
      send(ws, 1, 'Page.enable');
      send(ws, 2, 'Runtime.enable');
      send(ws, 3, 'Log.enable');
      
      ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log(`[Browser Console] ${msg.params.type}:`, msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
        } else if (msg.method === 'Log.entryAdded') {
          console.log(`[Browser Log] ${msg.params.entry.level}: ${msg.params.entry.text}`);
        }
      });
      
      console.log("Navigating to https://wrectifai-web.vercel.app to initialize context...");
      send(ws, 10, 'Page.navigate', { url: 'https://wrectifai-web.vercel.app/' });
      
      // Wait for load
      await sleep(4000);
      
      console.log("Injecting API login to authenticate session (as customer 1234567890)...");
      const authJs = `
        (async () => {
          console.log("Starting script authentication...");
          try {
            const res = await fetch('https://wrectifai-api-hafr.onrender.com/api/v1/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mobileNumber: '1234567890',
                otp: '123456',
                country: 'IN'
              })
            });
            console.log("Direct API Login response status:", res.status);
            const data = await res.json();
            console.log("Logged in user:", data.data?.user?.name, "Roles:", data.data?.user?.roles);
          } catch(e) {
            console.error("Direct login failed:", e);
          }
        })();
      `;
      send(ws, 11, 'Runtime.evaluate', { expression: authJs });
      
      await sleep(3000);
      
      console.log("Navigating to quotes page...");
      send(ws, 20, 'Page.navigate', { url: 'https://wrectifai-web.vercel.app/quotes' });
      
      // Wait for quotes list to render
      let rendered = false;
      for (let i = 0; i < 30; i++) {
        await sleep(500);
        const check = await evaluate(ws, 200 + i, `!!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Book') || b.textContent.includes('Payment'))`);
        if (check) {
          rendered = true;
          console.log("Book button rendered!");
          break;
        }
      }
      
      if (!rendered) {
        console.error("Timeout waiting for Book/Proceed button to render on quotes page.");
        const html = await evaluate(ws, 300, `document.body.innerHTML`);
        console.log("Quotes Page HTML length:", html.length);
        console.log("Quotes Page HTML snippet:", html.substring(0, 1500));
        chromeProcess.kill();
        process.exit(1);
      }
      
      const traceJs = `
        (async () => {
          try {
            const buttons = Array.from(document.querySelectorAll('button'));
            const bookBtn = buttons.find(b => b.textContent.includes('Book') || b.textContent.includes('Payment'));
            bookBtn.click();
            console.log("Clicked Book/Payment");
            
            let select = null;
            for (let i=0; i<10; i++) {
              await new Promise(r => setTimeout(r, 200));
              select = document.querySelector('select');
              if (select) break;
            }
            if (select) {
              select.selectedIndex = 1;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              console.log("Selected vehicle");
            }
            
            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) {
              dateInput.value = '2026-12-12';
              dateInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const timeInput = document.querySelector('input[type="time"]');
            if (timeInput) {
              timeInput.value = '10:00';
              timeInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const textarea = document.querySelector('textarea');
            if (textarea) {
              textarea.value = 'CDP Trace Test';
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            const proceedBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Payment') || b.textContent.includes('Proceed'));
            if (proceedBtn) {
              proceedBtn.click();
              console.log("Clicked Proceed");
            }
            
            let payBtn = null;
            for (let i=0; i<20; i++) {
              await new Promise(r => setTimeout(r, 200));
              payBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Pay') || b.textContent.includes('Razorpay'));
              if (payBtn) break;
            }
            
            if (!payBtn) throw new Error("Pay button not found");
            
            console.log("window.Razorpay exists?", typeof window.Razorpay !== 'undefined');
            console.log("Clicking Pay...");
            payBtn.click();
            
            for (let i=0; i<15; i++) {
              await new Promise(r => setTimeout(r, 500));
              console.log("Tick " + i + ": window.Razorpay exists?", typeof window.Razorpay !== 'undefined');
            }
          } catch(e) {
            console.error("Trace failed: " + e.message);
          }
        })();
      `;
      
      send(ws, 60, 'Runtime.evaluate', { expression: traceJs });
      
      await sleep(15000);
      console.log("Shutting down Chrome...");
      chromeProcess.kill();
      process.exit(0);
    });
  } catch (err) {
    console.error(err);
    chromeProcess.kill();
    process.exit(1);
  }
}, 2000);

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function send(ws, id, method, params = {}) {
  ws.send(JSON.stringify({ id, method, params }));
}

function evaluate(ws, id, expression) {
  return new Promise((resolve) => {
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.id === id) {
        ws.off('message', handler);
        resolve(msg.result?.result?.value);
      }
    };
    ws.on('message', handler);
    send(ws, id, 'Runtime.evaluate', { expression });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
