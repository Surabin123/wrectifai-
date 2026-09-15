const fs = require('fs');
const path = require('path');

const adminRoutesPath = path.join(__dirname, '../src/modules/admin/admin.routes.ts');
let content = fs.readFileSync(adminRoutesPath, 'utf8');

content = content.replace(/\\\`/g, '`');

fs.writeFileSync(adminRoutesPath, content, 'utf8');
console.log('Fixed backslashes in admin.routes.ts');
