-- Add diagnosis_request_id to vehicle_service_history to ensure idempotency and linking
ALTER TABLE vehicle_service_history 
ADD COLUMN diagnosis_request_id UUID REFERENCES diagnosis_requests(id) ON DELETE SET NULL;

-- Create unique constraint if we want only one history record per diagnosis request
CREATE UNIQUE INDEX idx_vehicle_service_history_diagnosis_req_id 
ON vehicle_service_history (diagnosis_request_id) 
WHERE diagnosis_request_id IS NOT NULL;
