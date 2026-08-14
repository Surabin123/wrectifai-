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

// 1. services-page.tsx (Hyderabad)
const servicesPagePath = path.join(__dirname, 'apps', 'web', 'src', 'pages', 'services', 'services-page.tsx');
replaceInFile(servicesPagePath, [
    ["useState('Hyderabad')", "useState('')"],
    ["getLocationCookie('wrectifai_city') || 'Hyderabad'", "getLocationCookie('wrectifai_city') || ''"]
]);

// 2. garages-page.tsx (Hyderabad)
const garagesPagePath = path.join(__dirname, 'apps', 'web', 'src', 'pages', 'garages', 'garages-page.tsx');
replaceInFile(garagesPagePath, [
    ["useState('Hyderabad')", "useState('')"],
    ["getLocationCookie('wrectifai_city') || 'Hyderabad'", "getLocationCookie('wrectifai_city') || ''"]
]);

// 3. top-navbar.tsx (Hyderabad)
const navbarPath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'home', 'top-navbar.tsx');
replaceInFile(navbarPath, [
    ["'Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi', 'Chennai', ", ""],
    ["'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi'", ""],
    ["useState('Hyderabad')", "useState('Location')"]
]);

// 4. main-content.tsx (Hyderabad)
const mainContentPath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'home', 'main-content.tsx');
replaceInFile(mainContentPath, [
    ["getCookie('wrectifai_city') || 'Hyderabad'", "getCookie('wrectifai_city') || 'Location'"]
]);

// 5. QuoteDetailsModal.tsx (USD)
const quoteModalPath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'quotes', 'QuoteDetailsModal.tsx');
replaceInFile(quoteModalPath, [
    ["USD {quote.laborCost}", "{quote.currency || 'USD'} {quote.laborCost}"],
    ["USD {quote.partsCost}", "{quote.currency || 'USD'} {quote.partsCost}"],
    ["USD {quote.totalCost}", "{quote.currency || 'USD'} {quote.totalCost}"]
]);

// 6. BookingDetailsModal.tsx (USD)
const bookingModalPath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'quotes', 'BookingDetailsModal.tsx');
replaceInFile(bookingModalPath, [
    ["USD {booking.laborCost}", "{booking.currency || 'USD'} {booking.laborCost}"],
    ["USD {booking.partsCost}", "{booking.currency || 'USD'} {booking.partsCost}"],
    ["USD {booking.totalCost}", "{booking.currency || 'USD'} {booking.totalCost}"]
]);

// 7. garage-detail-page.tsx (USD)
const garageDetailPath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'garages', 'garage-detail-page.tsx');
replaceInFile(garageDetailPath, [
    ["USD {svc.price}", "{garage.business_currency || 'USD'} {svc.price}"]
]);

// 8. service-history/page.tsx (USD)
const serviceHistoryPath = path.join(__dirname, 'apps', 'web', 'src', 'app', 'garage', 'service-history', 'page.tsx');
replaceInFile(serviceHistoryPath, [
    ["USD {h.quoteAmount}", "{h.currency || 'USD'} {h.quoteAmount}"],
    ["USD {bookingDetails.totalAmount}", "{bookingDetails.currency || 'USD'} {bookingDetails.totalAmount}"]
]);

// 9. dashboard/page.tsx (USD)
const dashboardPath = path.join(__dirname, 'apps', 'web', 'src', 'app', 'garage', 'dashboard', 'page.tsx');
replaceInFile(dashboardPath, [
    ["USD {quote.totalCost?.toLocaleString()}", "{quote.currency || 'USD'} {quote.totalCost?.toLocaleString()}"]
]);

console.log('Hardcoded values cleaned up');
