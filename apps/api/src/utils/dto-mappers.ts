export function mapQuoteDto(row: any) {
  if (!row) return null;
  const details = typeof row.quoteDetails === 'string' ? JSON.parse(row.quoteDetails) : (row.quoteDetails || {});
  
  return {
    id: row.id,
    status: row.status,
    customerName: row.customerName || null,
    garageId: row.garageId || null,
    garageName: row.garageName || null,
    garageAddress: row.garageAddress || null,
    vehicleMake: row.vehicleMake || null,
    vehicleModel: row.vehicleModel || null,
    vehicleYear: row.vehicleYear != null ? Number(row.vehicleYear) : null,
    vehicleVin: row.vehicleVin || null,
    issueSummary: row.issueSummary || null,
    laborCost: row.laborCost != null ? Number(row.laborCost) : null,
    partsCost: row.partsCost != null ? Number(row.partsCost) : null,
    totalCost: row.totalCost != null ? Number(row.totalCost) : null,
    estimatedDays: row.etaDays != null ? Number(row.etaDays) : null,
    remarks: details.remarks || null,
    warranty: details.warranty || null,
    pickupDropSupported: row.pickupDropSupported || false,
    isBooked: row.isBooked || false,
    createdAt: row.createdAt,
  };
}

export function mapBookingDto(row: any) {
  if (!row) return null;
  
  const details = typeof row.quoteDetails === 'string' ? JSON.parse(row.quoteDetails) : (row.quoteDetails || {});
  
  return {
    id: row.id,
    status: row.status,
    customerName: row.customerName || null,
    garageId: row.garageId || null,
    garageName: row.garageName || null,
    garageAddress: row.garageAddress || null,
    vehicleMake: row.vehicleMake || null,
    vehicleModel: row.vehicleModel || null,
    vehicleYear: row.vehicleYear != null ? Number(row.vehicleYear) : null,
    vehicleVin: row.vehicleVin || null,
    issueSummary: row.quoteIssueSummary || row.issueSummary || null,
    laborCost: row.quoteLaborCost != null ? Number(row.quoteLaborCost) : null,
    partsCost: row.quotePartsCost != null ? Number(row.quotePartsCost) : null,
    consumablesCost: details.consumablesCost != null ? Number(details.consumablesCost) : 0,
    gstCost: details.gstCost != null ? Number(details.gstCost) : 0,
    totalCost: row.quoteTotalCost != null ? Number(row.quoteTotalCost) : (row.totalCost != null ? Number(row.totalCost) : null),
    estimatedDays: row.quoteEtaDays != null ? Number(row.quoteEtaDays) : null,
    remarks: details.remarks || null,
    warranty: details.warranty || null,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const quoteSelectFragment = `
  q.id, 
  q.quote_request_id as "quoteRequestId", 
  q.status, 
  q.created_at as "createdAt",
  q.total_cost as "totalCost", 
  q.labor_cost as "laborCost", 
  q.parts_cost as "partsCost",
  q.eta_days as "etaDays", 
  q.eta_note as "etaNote", 
  q.details as "quoteDetails",
  qr.issue_summary as "issueSummary",
  NULL as "diagnosis",
  g.id as "garageId", g.name as "garageName", g.address as "garageAddress", g.pickup_drop_supported as "pickupDropSupported",
  v.id as "vehicleId", v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin", v.mileage as "vehicleMileage",
  u.id as "customerId", u.name as "customerName",
  p.avatar_url as "customerAvatar"
`;

export const quoteJoinsFragment = `
  FROM quotes q
  JOIN garages g ON q.garage_id = g.id
  JOIN quote_requests qr ON q.quote_request_id = qr.id
  LEFT JOIN vehicles v ON qr.vehicle_id = v.id
  LEFT JOIN users u ON qr.customer_id = u.id
  LEFT JOIN profiles p ON u.id = p.user_id
`;

export const bookingSelectFragment = `
  b.id,
  b.status,
  b.scheduled_at as "scheduledAt",
  b.created_at as "createdAt",
  b.updated_at as "updatedAt",
  b.total_amount as "totalCost",
  b.customer_note as "issueSummary",
  
  q.id as "quoteId",
  q.quote_request_id as "quoteRequestId",
  q.status as "quoteStatus",
  q.created_at as "quoteCreatedAt",
  q.total_cost as "quoteTotalCost",
  q.labor_cost as "quoteLaborCost",
  q.parts_cost as "quotePartsCost",
  q.eta_days as "quoteEtaDays",
  q.eta_note as "quoteEtaNote",
  q.details as "quoteDetails",
  
  qr.issue_summary as "quoteIssueSummary",
  NULL as "quoteDiagnosis",
  
  g.id as "garageId", g.name as "garageName", g.address as "garageAddress", g.pickup_drop_supported as "pickupDropSupported",
  v.id as "vehicleId", v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin", v.mileage as "vehicleMileage",
  u.id as "customerId", u.name as "customerName",
  p.avatar_url as "customerAvatar"
`;

export const bookingJoinsFragment = `
  FROM bookings b
  JOIN garages g ON b.garage_id = g.id
  LEFT JOIN quotes q ON b.quote_id = q.id
  LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
  LEFT JOIN vehicles v ON v.id = COALESCE(b.vehicle_id, qr.vehicle_id)
  LEFT JOIN users u ON u.id = COALESCE(b.customer_id, qr.customer_id)
  LEFT JOIN profiles p ON u.id = p.user_id
`;
