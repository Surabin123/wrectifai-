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

// 1. top-navbar.tsx fix empty array
const navbarPath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'home', 'top-navbar.tsx');
replaceInFile(navbarPath, [
    ["const IN_CITIES = [ \n\n];", "const IN_CITIES: string[] = [];"],
    ["const IN_CITIES = [\n  \n];", "const IN_CITIES: string[] = [];"],
    ["const IN_CITIES = [];", "const IN_CITIES: string[] = [];"]
]);

// 2. Types for Garage / GarageCompletedJob
const garageTypePath = path.join(__dirname, 'apps', 'web', 'src', 'types', 'garage.ts'); // assuming this exists or I can just use any
// Let's modify service-history and garage-detail-page to use 'any' or just optional chaining cast
const historyPath = path.join(__dirname, 'apps', 'web', 'src', 'app', 'garage', 'service-history', 'page.tsx');
replaceInFile(historyPath, [
    ["{h.currency || 'USD'}", "{(h as any).currency || 'USD'}"],
    ["{bookingDetails.currency || 'USD'}", "{(bookingDetails as any).currency || 'USD'}"]
]);

const detailPath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'garages', 'garage-detail-page.tsx');
replaceInFile(detailPath, [
    ["{garage.business_currency || 'USD'}", "{(garage as any).business_currency || 'USD'}"]
]);

// 3. register page string to never bug
// let's just grep the error line
// src/app/admin/garages/register/page.tsx:292
// probably formData.services type is wrong?
