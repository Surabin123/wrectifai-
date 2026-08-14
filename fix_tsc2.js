const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [oldStr, newStr] of replacements) {
        content = content.replace(oldStr, newStr);
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

// 1. admin/garages/register/page.tsx
const adminGaragePath = path.join(__dirname, 'apps', 'web', 'src', 'app', 'admin', 'garages', 'register', 'page.tsx');
replaceInFile(adminGaragePath, [
    ["const getCitiesForCountry = (code: string) => {\n    // Cities can be dynamic or fetched from API, return empty for free text\n    return [];\n  };", "const getCitiesForCountry = (code: string): string[] => {\n    // Cities can be dynamic or fetched from API, return empty for free text\n    return [];\n  };"]
]);

// 2. shop-all-page.tsx
const shopAllPath = path.join(__dirname, 'apps', 'web', 'src', 'pages', 'shop-all', 'shop-all-page.tsx');
replaceInFile(shopAllPath, [
    ["<DashboardShell", "<div"],
    ["</DashboardShell>", "</div>"]
]);

console.log('Fixed TSC errors');
