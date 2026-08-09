const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:\\WRECTIFIAI\\wrectifai\\apps\\api\\src');

let count = 0;
files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('₹') || content.includes('\u20B9') || content.includes('\\u20B9') || content.includes('Rs.')) {
    // Replace ₹ with $
    content = content.replace(/₹/g, '$');
    content = content.replace(/\u20B9/g, '$');
    content = content.replace(/\\u20B9/g, '$');
    content = content.replace(/Rs\.\s*/g, '$');
    
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Updated ${count} files.`);
