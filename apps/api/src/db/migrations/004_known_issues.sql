-- Create known_issues table
CREATE TABLE known_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    symptom_keywords TEXT[] NOT NULL,
    makes TEXT[], -- NULL matches all makes
    year_from INTEGER,
    year_to INTEGER,
    issue_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    diy_allowed BOOLEAN NOT NULL DEFAULT true,
    safety_critical BOOLEAN NOT NULL DEFAULT false,
    required_parts JSONB DEFAULT '[]'::jsonb,
    estimated_cost_min NUMERIC(10, 2) NOT NULL,
    estimated_cost_max NUMERIC(10, 2) NOT NULL,
    diy_steps TEXT[] DEFAULT '{}'::text[],
    garage_steps TEXT[] DEFAULT '{}'::text[],
    base_confidence NUMERIC(5, 2) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_known_issues_category ON known_issues(category);
CREATE INDEX idx_known_issues_symptom_keywords ON known_issues USING GIN(symptom_keywords);
CREATE INDEX idx_known_issues_makes ON known_issues USING GIN(makes);

-- Seed data: 6 categories * 3 issues = 18 rows
INSERT INTO known_issues (
    category, symptom_keywords, makes, year_from, year_to,
    issue_name, description, risk_level, diy_allowed, safety_critical,
    required_parts, estimated_cost_min, estimated_cost_max,
    diy_steps, garage_steps, base_confidence
) VALUES
-- 1) Engine Noise
(
    'engine_noise',
    ARRAY['engine noise', 'engine sound', 'ticking sound', 'knocking sound', 'rattling sound', 'whining noise', 'tap tap sound', 'noise from engine', 'sound from bonnet'],
    NULL, NULL, NULL,
    'Low Engine Oil or Poor Lubrication',
    'Low or degraded oil can cause ticking or knocking sounds from the top end or bottom end of the engine.',
    'medium', true, false,
    '[{"name": "Engine oil", "category": "fluid"}, {"name": "Oil filter", "category": "filter"}]'::jsonb,
    20.00, 50.00,
    ARRAY['Check the dipstick to confirm oil level.', 'Locate the oil filler cap on top of the engine.', 'Add the correct grade of oil in small increments.', 'Recheck the dipstick level.'],
    ARRAY['Inspect engine for oil leaks.', 'Drain old oil and replace oil filter.', 'Fill with fresh oil.', 'Run engine and check for leaks.'],
    88.00
),
(
    'engine_noise',
    ARRAY['engine noise', 'engine sound', 'ticking sound', 'knocking sound', 'rattling sound', 'whining noise', 'tap tap sound', 'noise from engine', 'sound from bonnet'],
    NULL, NULL, NULL,
    'Drive Belt or Tensioner Issue',
    'A loose belt or worn tensioner can create whining or rattling sounds that change with RPM or AC load.',
    'medium', true, false,
    '[{"name": "Drive belt", "category": "belt"}, {"name": "Belt tensioner", "category": "pulley"}]'::jsonb,
    25.00, 80.00,
    ARRAY['Locate the belt tensioner pulley.', 'Relieve tension using a wrench and remove the old belt.', 'Thread the new belt according to the routing diagram.', 'Release the tensioner to secure the belt.'],
    ARRAY['Inspect belt alignment and pulleys.', 'Check tensioner spring tension and bearings.', 'Replace belt and tensioner.'],
    71.00
),
(
    'engine_noise',
    ARRAY['engine noise', 'engine sound', 'ticking sound', 'knocking sound', 'rattling sound', 'whining noise', 'tap tap sound', 'noise from engine', 'sound from bonnet'],
    NULL, NULL, NULL,
    'Timing Chain or Valve Train Noise',
    'Worn timing or valve train parts can cause repeated ticking or rattling, especially during startup.',
    'high', false, false,
    '[{"name": "Timing chain kit", "category": "engine"}]'::jsonb,
    75.00, 275.00,
    ARRAY[]::text[],
    ARRAY['Remove valve cover and front engine cover.', 'Inspect timing chain guides and tensioner.', 'Replace timing chain and sprockets.', 'Set engine timing.'],
    56.00
),

-- 2) AC Not Cooling
(
    'ac_not_cooling',
    ARRAY['ac not cooling', 'air conditioner not cooling', 'weak ac', 'hot air from ac', 'ac weak', 'no cooling', 'ac problem', 'cooling issue'],
    NULL, NULL, NULL,
    'Low Refrigerant Gas',
    'Low refrigerant can reduce cooling efficiency, especially in traffic or during high ambient temperatures.',
    'medium', true, false,
    '[{"name": "Refrigerant recharge kit", "category": "fluid"}]'::jsonb,
    25.00, 55.00,
    ARRAY['Locate the low-pressure AC port.', 'Connect the recharge hose and pressure gauge.', 'Add refrigerant with the engine running and AC on max.', 'Monitor pressure to avoid overfilling.'],
    ARRAY['Perform AC system leak test using UV dye.', 'Evacuate existing refrigerant.', 'Recharge system to exact manufacturer specification.'],
    86.00
),
(
    'ac_not_cooling',
    ARRAY['ac not cooling', 'air conditioner not cooling', 'weak ac', 'hot air from ac', 'ac weak', 'no cooling', 'ac problem', 'cooling issue'],
    NULL, NULL, NULL,
    'Cabin Filter or Blower Restriction',
    'Blocked cabin filters or blower issues reduce airflow even if the AC system itself is functioning.',
    'low', true, false,
    '[{"name": "Cabin air filter", "category": "filter"}]'::jsonb,
    10.00, 40.00,
    ARRAY['Locate the cabin filter housing (usually behind the glovebox).', 'Release the cover and slide out the old filter.', 'Install the new filter matching the airflow direction arrow.', 'Secure the cover and glovebox.'],
    ARRAY['Remove blower motor and check for debris.', 'Inspect blower resistor operation.', 'Replace cabin air filter.'],
    67.00
),
(
    'ac_not_cooling',
    ARRAY['ac not cooling', 'air conditioner not cooling', 'weak ac', 'hot air from ac', 'ac weak', 'no cooling', 'ac problem', 'cooling issue'],
    NULL, NULL, NULL,
    'AC Compressor Performance Issue',
    'A weak or cycling compressor can cause fluctuating cooling and unusual noise when the AC engages.',
    'high', false, false,
    '[{"name": "AC compressor", "category": "electrical"}]'::jsonb,
    60.00, 220.00,
    ARRAY[]::text[],
    ARRAY['Evacuate refrigerant from the system.', 'Disconnect electrical connector and lines from the compressor.', 'Replace the compressor and receiver drier.', 'Evacuate and recharge system.'],
    53.00
),

-- 3) Brake Vibration
(
    'brake_vibration',
    ARRAY['brake vibration', 'brake vibe', 'car vibrates when braking', 'steering shakes when braking', 'pulsation while braking', 'brake judder', 'brake shaking'],
    NULL, NULL, NULL,
    'Warped Brake Disc',
    'Warped or uneven brake rotors commonly cause steering or pedal vibration during braking.',
    'high', false, true,
    '[{"name": "Brake rotors", "category": "brakes"}]'::jsonb,
    30.00, 80.00,
    ARRAY[]::text[],
    ARRAY['Raise vehicle and remove wheels.', 'Remove brake caliper and old brake rotors.', 'Clean hub surface and install new rotors.', 'Reassemble and check torque.'],
    89.00
),
(
    'brake_vibration',
    ARRAY['brake vibration', 'brake vibe', 'car vibrates when braking', 'steering shakes when braking', 'pulsation while braking', 'brake judder', 'brake shaking'],
    NULL, NULL, NULL,
    'Uneven Brake Pad Deposit',
    'Uneven friction deposits on the rotor surface can create pulsing and shudder while braking.',
    'medium', false, true,
    '[{"name": "Brake pads", "category": "brakes"}]'::jsonb,
    20.00, 50.00,
    ARRAY[]::text[],
    ARRAY['Inspect pad wear pattern.', 'Resurface (turn) or clean rotors.', 'Install new brake pads and bed them in.'],
    68.00
),
(
    'brake_vibration',
    ARRAY['brake vibration', 'brake vibe', 'car vibrates when braking', 'steering shakes when braking', 'pulsation while braking', 'brake judder', 'brake shaking'],
    NULL, NULL, NULL,
    'Brake Caliper Sticking',
    'A sticking caliper can overheat one side, cause vibration, and wear pads unevenly.',
    'high', false, true,
    '[{"name": "Brake caliper", "category": "brakes"}]'::jsonb,
    25.00, 85.00,
    ARRAY[]::text[],
    ARRAY['Raise vehicle and check wheel drag.', 'Remove sticking caliper.', 'Rebuild or replace caliper assembly.', 'Bleed brake lines.'],
    52.00
),

-- 4) Low Pickup
(
    'low_pickup',
    ARRAY['low pickup', 'poor pickup', 'low power', 'car not accelerating', 'pickup issue', 'sluggish acceleration', 'power loss'],
    NULL, NULL, NULL,
    'Air Intake or Filter Restriction',
    'A clogged air filter or restricted intake can reduce acceleration and make the engine feel dull.',
    'low', true, false,
    '[{"name": "Engine air filter", "category": "filter"}]'::jsonb,
    10.00, 40.00,
    ARRAY['Locate the engine air box.', 'Release the retaining clips.', 'Remove the dirty air filter and clean the air box interior.', 'Place the new filter and re-secure the cover.'],
    ARRAY['Inspect intake ducting for leaks or blockage.', 'Check mass airflow (MAF) sensor readings.', 'Replace engine air filter.'],
    83.00
),
(
    'low_pickup',
    ARRAY['low pickup', 'poor pickup', 'low power', 'car not accelerating', 'pickup issue', 'sluggish acceleration', 'power loss'],
    NULL, NULL, NULL,
    'Fuel Delivery Problem',
    'Fuel pump or injector-side issues can cause hesitation, weak pickup, and inconsistent acceleration.',
    'medium', true, false,
    '[{"name": "Fuel filter", "category": "filter"}, {"name": "Fuel pump", "category": "fuel"}]'::jsonb,
    30.00, 150.00,
    ARRAY['Relieve fuel system pressure.', 'Disconnect lines and replace the fuel filter (if external).', 'Turn key to prime system and check for leaks.'],
    ARRAY['Perform fuel pressure test.', 'Inspect fuel injectors and check resistance.', 'Replace fuel pump or clean injectors.'],
    69.00
),
(
    'low_pickup',
    ARRAY['low pickup', 'poor pickup', 'low power', 'car not accelerating', 'pickup issue', 'sluggish acceleration', 'power loss'],
    NULL, NULL, NULL,
    'Ignition or Sensor Performance Issue',
    'Weak spark or inaccurate sensor signals can reduce power and trigger a check engine light.',
    'medium', true, false,
    '[{"name": "Spark plugs", "category": "ignition"}, {"name": "Ignition coils", "category": "ignition"}]'::jsonb,
    20.00, 110.00,
    ARRAY['Remove engine cover to access ignition coils.', 'Disconnect electrical connector and remove coil.', 'Use spark plug socket to remove and replace spark plugs.', 'Reinstall coils and torque to spec.'],
    ARRAY['Scan for OBD-II trouble codes.', 'Check misfire counters and spark plug condition.', 'Replace spark plugs and faulty ignition coils.'],
    57.00
),

-- 5) Starting Issue
(
    'starting_issue',
    ARRAY['car not starting', 'not starting', 'start issue', 'engine not starting', 'self not working', 'slow crank', 'crank no start', 'no start'],
    NULL, NULL, NULL,
    'Weak or Discharged Battery',
    'Low battery voltage is the most common reason for slow cranking or no-start complaints.',
    'medium', true, false,
    '[{"name": "Car battery", "category": "electrical"}]'::jsonb,
    45.00, 110.00,
    ARRAY['Turn off engine and wear safety gear.', 'Disconnect negative terminal first, then positive terminal.', 'Remove hold-down bracket and lift battery out.', 'Clean terminals, install new battery, and connect positive first.'],
    ARRAY['Perform battery load test.', 'Test alternator charging output.', 'Check parasitical draw.'],
    87.00
),
(
    'starting_issue',
    ARRAY['car not starting', 'not starting', 'start issue', 'engine not starting', 'self not working', 'slow crank', 'crank no start', 'no start'],
    NULL, NULL, NULL,
    'Starter Motor or Solenoid Issue',
    'If power is available but the engine will not crank properly, the starter system may be at fault.',
    'medium', true, false,
    '[{"name": "Starter motor", "category": "electrical"}]'::jsonb,
    30.00, 120.00,
    ARRAY['Disconnect battery negative cable.', 'Raise and support vehicle safely.', 'Disconnect wiring connections from starter.', 'Unbolt and replace starter motor.'],
    ARRAY['Inspect starter control circuit voltage.', 'Test starter solenoid current draw.', 'Replace starter motor assembly.'],
    66.00
),
(
    'starting_issue',
    ARRAY['car not starting', 'not starting', 'start issue', 'engine not starting', 'self not working', 'slow crank', 'crank no start', 'no start'],
    NULL, NULL, NULL,
    'Fuel or Ignition No-Start Condition',
    'If the engine cranks normally but does not start, fuel or spark delivery should be checked.',
    'high', false, false,
    '[{"name": "Fuel pump relay", "category": "electrical"}]'::jsonb,
    25.00, 150.00,
    ARRAY[]::text[],
    ARRAY['Verify fuel pump operation and pressure.', 'Check for ignition spark and cylinder compression.', 'Check crankshaft position sensor.'],
    54.00
),

-- 6) Steering / Suspension Vibration
(
    'steering_suspension',
    ARRAY['steering vibration', 'steering wheel vibration', 'car shaking', 'vibration at high speed', 'wheel vibration', 'suspension vibration', 'pulling to one side'],
    NULL, NULL, NULL,
    'Wheel Balancing Issue',
    'Unbalanced wheels can cause vibration in the steering wheel, especially at higher speeds.',
    'medium', false, true,
    '[{"name": "Wheel weights", "category": "tyres"}]'::jsonb,
    20.00, 30.00,
    ARRAY[]::text[],
    ARRAY['Mount wheels on dynamic wheel balancer.', 'Spin wheel to locate heavy spots.', 'Apply wheel weights to balance.', 'Verify zero imbalance.'],
    85.00
),
(
    'steering_suspension',
    ARRAY['steering vibration', 'steering wheel vibration', 'car shaking', 'vibration at high speed', 'wheel vibration', 'suspension vibration', 'pulling to one side'],
    NULL, NULL, NULL,
    'Wheel Alignment Issue',
    'Improper alignment can cause vibrations and pulling to one side.',
    'medium', false, true,
    '[]'::jsonb,
    10.00, 20.00,
    ARRAY[]::text[],
    ARRAY['Mount vehicle on alignment rack.', 'Check caster, camber, and toe angles.', 'Adjust suspension linkages to factory specifications.'],
    65.00
),
(
    'steering_suspension',
    ARRAY['steering vibration', 'steering wheel vibration', 'car shaking', 'vibration at high speed', 'wheel vibration', 'suspension vibration', 'pulling to one side'],
    NULL, NULL, NULL,
    'Brake Disc Warped',
    'Warped brake discs can cause vibration in the steering wheel while braking.',
    'high', false, true,
    '[{"name": "Brake rotors", "category": "brakes"}]'::jsonb,
    30.00, 55.00,
    ARRAY[]::text[],
    ARRAY['Check rotor runout using dial indicator.', 'Replace warped brake rotors and pads.', 'Inspect caliper slider pins.'],
    40.00
);
