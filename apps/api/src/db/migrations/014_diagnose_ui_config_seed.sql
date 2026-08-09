-- Seed Diagnose UI Configuration
-- Migrated from hardcoded frontend values

-- Issue Categories
INSERT INTO diagnose_issue_categories (id, label, summary, summary_meaning, keywords, sort_order) VALUES
('engine_noise', 'Engine noise', 'Abnormal sound from the engine bay or related rotating components.', 'Persistent engine-side noises should be checked early to prevent wear from becoming internal engine damage.', ARRAY['engine noise', 'engine sound', 'ticking sound', 'knocking sound', 'rattling sound', 'whining noise', 'tap tap sound', 'noise from engine', 'sound from bonnet'], 1),
('ac_not_cooling', 'AC not cooling', 'Weak or inconsistent cabin cooling from the AC system.', 'Cooling issues often begin with refrigerant, airflow, or compressor-side faults and can worsen quickly in traffic or hot weather.', ARRAY['ac not cooling', 'air conditioner not cooling', 'weak ac', 'hot air from ac', 'ac weak', 'no cooling', 'ac problem', 'cooling issue'], 2),
('brake_vibration', 'Brake vibration', 'Vibration or pulsing felt mainly during braking.', 'Brake-related vibration usually points to rotor, pad, or suspension-side braking instability and should be inspected for safety.', ARRAY['brake vibration', 'brake vibe', 'car vibrates when braking', 'steering shakes when braking', 'pulsation while braking', 'brake judder', 'brake shaking'], 3),
('low_pickup', 'Low pickup', 'Poor acceleration, weak response, or power loss while driving.', 'Power-loss symptoms can come from airflow, fuel delivery, ignition, or exhaust restriction and need targeted follow-up.', ARRAY['low pickup', 'poor pickup', 'low power', 'car not accelerating', 'pickup issue', 'sluggish acceleration', 'power loss'], 4),
('starting_issue', 'Car not starting', 'Starting failure, slow cranking, or ignition-related no-start issue.', 'No-start complaints usually narrow down to battery, starter, or fuel-ignition readiness and should be separated quickly.', ARRAY['car not starting', 'not starting', 'start issue', 'engine not starting', 'self not working', 'slow crank', 'crank no start', 'no start'], 5),
('steering_suspension', 'Steering or suspension vibration', 'Shaking, pulling, or vibration felt while driving, usually speed-related.', 'Driving vibration that is not limited to braking is often tyre, wheel balance, alignment, or suspension related.', ARRAY['steering vibration', 'steering wheel vibration', 'car shaking', 'vibration at high speed', 'wheel vibration', 'suspension vibration', 'pulling to one side'], 6)
ON CONFLICT (id) DO NOTHING;

-- Engine Noise Questions
INSERT INTO diagnose_questions (id, category_id, label, question, options, sort_order) VALUES
('noise_timing', 'engine_noise', 'Heard most clearly', 'When do you hear the noise most clearly?', ARRAY['At idle', 'During acceleration', 'During cold start', 'At high RPM'], 1),
('noise_character', 'engine_noise', 'Sound type', 'What kind of sound is it?', ARRAY['Ticking', 'Knocking', 'Rattling', 'Whining'], 2),
('warning_light_engine', 'engine_noise', 'Warning lights', 'Is any warning light visible on the dashboard?', ARRAY['Check engine light', 'Oil warning light', 'No warning light', 'Not sure'], 3),
('noise_change_with_ac', 'engine_noise', 'With AC on', 'Does the noise change when AC is switched on?', ARRAY['Gets louder', 'Gets lower', 'No change', 'Not sure'], 4)
ON CONFLICT (id) DO NOTHING;

-- AC Not Cooling Questions
INSERT INTO diagnose_questions (id, category_id, label, question, options, sort_order) VALUES
('ac_condition', 'ac_not_cooling', 'Cooling worst', 'When is the cooling worst?', ARRAY['At idle', 'In traffic', 'Only in daytime heat', 'All the time'], 1),
('ac_airflow', 'ac_not_cooling', 'Vent airflow', 'How is the airflow from the vents?', ARRAY['Strong but not cold', 'Weak airflow', 'No airflow', 'Normal airflow'], 2),
('ac_compressor_sound', 'ac_not_cooling', 'AC sound', 'Do you hear any unusual sound when the AC is turned on?', ARRAY['Clicking', 'Whining', 'No unusual sound', 'Not sure'], 3),
('ac_recent_service', 'ac_not_cooling', 'Recent service', 'Has the AC been serviced or gas refilled recently?', ARRAY['Yes recently', 'Not recently', 'Never', 'Not sure'], 4)
ON CONFLICT (id) DO NOTHING;

-- Brake Vibration Questions
INSERT INTO diagnose_questions (id, category_id, label, question, options, sort_order) VALUES
('brake_speed', 'brake_vibration', 'Speed range', 'At what speed do you feel the vibration most?', ARRAY['Low speed', 'Medium speed', 'High speed', 'At all speeds'], 1),
('brake_pedal_feedback', 'brake_vibration', 'Brake pedal feel', 'Do you also feel pulsing in the brake pedal?', ARRAY['Yes clearly', 'Slightly', 'No', 'Not sure'], 2),
('brake_recent_work', 'brake_vibration', 'Recent brake work', 'Were the brake pads or discs changed recently?', ARRAY['Yes recently', 'A while ago', 'No', 'Not sure'], 3),
('brake_sound', 'brake_vibration', 'Braking sound', 'Do you hear any noise while braking?', ARRAY['Squeal', 'Grinding', 'No noise', 'Not sure'], 4)
ON CONFLICT (id) DO NOTHING;

-- Low Pickup Questions
INSERT INTO diagnose_questions (id, category_id, label, question, options, sort_order) VALUES
('pickup_condition', 'low_pickup', 'Weakness noticed', 'When is the weak pickup most noticeable?', ARRAY['During overtaking', 'On inclines', 'With AC on', 'All the time'], 1),
('pickup_exhaust', 'low_pickup', 'Exhaust smoke', 'Do you notice unusual smoke from the exhaust?', ARRAY['Black smoke', 'White smoke', 'No smoke', 'Not sure'], 2),
('pickup_warning_light', 'low_pickup', 'Dashboard light', 'Is the check engine light on?', ARRAY['Yes', 'No', 'Sometimes', 'Not sure'], 3),
('pickup_service_history', 'low_pickup', 'Recent service', 'Was the air filter, fuel filter, or spark plugs serviced recently?', ARRAY['Yes recently', 'Service overdue', 'Not sure', 'No idea'], 4)
ON CONFLICT (id) DO NOTHING;

-- Starting Issue Questions
INSERT INTO diagnose_questions (id, category_id, label, question, options, sort_order) VALUES
('starting_crank', 'starting_issue', 'Starter behavior', 'What happens when you try to start the car?', ARRAY['No crank at all', 'Slow cranking', 'Cranks but does not start', 'Single click only'], 1),
('starting_lights', 'starting_issue', 'Electrical signs', 'Do dashboard lights and horn work normally?', ARRAY['Yes normal', 'Dim or weak', 'Nothing works', 'Not sure'], 2),
('starting_recent_idle', 'starting_issue', 'Vehicle idle period', 'Was the car parked unused for several days?', ARRAY['Yes', 'No', 'Only overnight', 'Not sure'], 3),
('starting_after_jump', 'starting_issue', 'After jump start', 'Does it start with jumper cables or after charging?', ARRAY['Yes', 'No', 'Not tried', 'Not sure'], 4)
ON CONFLICT (id) DO NOTHING;

-- Steering/Suspension Questions
INSERT INTO diagnose_questions (id, category_id, label, question, options, sort_order) VALUES
('drive_vibration_speed', 'steering_suspension', 'When it happens', 'When do you feel the vibration most?', ARRAY['Only while braking', 'While accelerating', 'At constant speed', 'Always'], 1),
('steering_shake_present', 'steering_suspension', 'Steering shake', 'Does the steering wheel also shake?', ARRAY['Yes', 'No', 'Only sometimes', 'Not sure'], 2),
('issue_started', 'steering_suspension', 'Issue start', 'When did this issue start?', ARRAY['Recently within a week', 'Gradually over time', 'After tyre work', 'Long back'], 3),
('road_surface_effect', 'steering_suspension', 'Road surface effect', 'Does it get worse on rough roads or uneven surfaces?', ARRAY['Yes much worse', 'Slightly worse', 'No change', 'Not sure'], 4)
ON CONFLICT (id) DO NOTHING;

-- Possible Issues: Engine Noise
INSERT INTO diagnose_possible_issues (id, category_id, title, badge, badge_class, description, match_score, risks, estimated_cost, image_src, sort_order) VALUES
('low-engine-oil', 'engine_noise', 'Low Engine Oil or Poor Lubrication', 'High Match', 'bg-[#ffe8ea] text-[#ff4f68]', 'Low or degraded oil can cause ticking or knocking sounds from the top end or bottom end of the engine.', 88, ARRAY['Engine wear', 'Overheating', 'Internal damage'], 'Rs. 1,500 - Rs. 4,000', '/assets/Engine_oil.png', 1),
('belt-tensioner', 'engine_noise', 'Drive Belt or Tensioner Issue', 'Medium Match', 'bg-[#fff2df] text-[#f59a23]', 'A loose belt or worn tensioner can create whining or rattling sounds that change with RPM or AC load.', 71, ARRAY['Accessory failure', 'Battery not charging', 'Breakdown risk'], 'Rs. 2,000 - Rs. 6,500', '/assets/Electrical.png', 2),
('timing-component', 'engine_noise', 'Timing Chain or Valve Train Noise', 'Low Match', 'bg-[#edf2ff] text-[#4974ff]', 'Worn timing or valve train parts can cause repeated ticking or rattling, especially during startup.', 56, ARRAY['Poor timing', 'Engine misfire', 'Major repair if ignored'], 'Rs. 6,000 - Rs. 22,000', '/assets/engine_2.png', 3)
ON CONFLICT (id) DO NOTHING;

-- Possible Issues: AC Not Cooling
INSERT INTO diagnose_possible_issues (id, category_id, title, badge, badge_class, description, match_score, risks, estimated_cost, image_src, sort_order) VALUES
('low-refrigerant', 'ac_not_cooling', 'Low Refrigerant Gas', 'High Match', 'bg-[#ffe8ea] text-[#ff4f68]', 'Low refrigerant can reduce cooling efficiency, especially in traffic or during high ambient temperatures.', 86, ARRAY['Poor cooling', 'Compressor strain', 'Cabin discomfort'], 'Rs. 2,000 - Rs. 4,500', '/assets/new_ac.png', 1),
('ac-filter-blower', 'ac_not_cooling', 'Cabin Filter or Blower Restriction', 'Medium Match', 'bg-[#fff2df] text-[#f59a23]', 'Blocked cabin filters or blower issues reduce airflow even if the AC system itself is functioning.', 67, ARRAY['Weak airflow', 'Dust buildup', 'Motor overload'], 'Rs. 800 - Rs. 3,000', '/assets/ac_filter.png', 2),
('compressor-performance', 'ac_not_cooling', 'AC Compressor Performance Issue', 'Low Match', 'bg-[#edf2ff] text-[#4974ff]', 'A weak or cycling compressor can cause fluctuating cooling and unusual noise when the AC engages.', 53, ARRAY['No cooling', 'Compressor seizure', 'Higher repair cost later'], 'Rs. 5,000 - Rs. 18,000', '/assets/ac_compressor.png', 3)
ON CONFLICT (id) DO NOTHING;

-- Possible Issues: Brake Vibration
INSERT INTO diagnose_possible_issues (id, category_id, title, badge, badge_class, description, match_score, risks, estimated_cost, image_src, sort_order) VALUES
('warped-rotor', 'brake_vibration', 'Warped Brake Disc', 'High Match', 'bg-[#ffe8ea] text-[#ff4f68]', 'Warped or uneven brake rotors commonly cause steering or pedal vibration during braking.', 89, ARRAY['Longer stopping distance', 'Pad wear', 'Safety risk'], 'Rs. 2,500 - Rs. 6,500', '/assets/brake_rotor.png', 1),
('pad-deposit', 'brake_vibration', 'Uneven Brake Pad Deposit', 'Medium Match', 'bg-[#fff2df] text-[#f59a23]', 'Uneven friction deposits on the rotor surface can create pulsing and shudder while braking.', 68, ARRAY['Reduced smoothness', 'Rotor hotspots', 'Noise increase'], 'Rs. 1,500 - Rs. 4,000', '/assets/brake_pads.png', 2),
('brake-caliper', 'brake_vibration', 'Brake Caliper Sticking', 'Low Match', 'bg-[#edf2ff] text-[#4974ff]', 'A sticking caliper can overheat one side, cause vibration, and wear pads unevenly.', 52, ARRAY['Brake drag', 'Heat damage', 'Uneven braking'], 'Rs. 2,000 - Rs. 7,000', '/assets/brake_caliper.png', 3)
ON CONFLICT (id) DO NOTHING;

-- Possible Issues: Low Pickup
INSERT INTO diagnose_possible_issues (id, category_id, title, badge, badge_class, description, match_score, risks, estimated_cost, image_src, sort_order) VALUES
('air-intake-restriction', 'low_pickup', 'Air Intake or Filter Restriction', 'High Match', 'bg-[#ffe8ea] text-[#ff4f68]', 'A clogged air filter or restricted intake can reduce acceleration and make the engine feel dull.', 83, ARRAY['Poor mileage', 'Weak response', 'Dirty throttle body'], 'Rs. 700 - Rs. 3,000', '/assets/air_filter.png', 1),
('fuel-delivery', 'low_pickup', 'Fuel Delivery Problem', 'Medium Match', 'bg-[#fff2df] text-[#f59a23]', 'Fuel pump or injector-side issues can cause hesitation, weak pickup, and inconsistent acceleration.', 69, ARRAY['Engine hesitation', 'Stalling risk', 'Poor combustion'], 'Rs. 2,500 - Rs. 12,000', '/assets/fuel_pump.png', 2),
('ignition-performance', 'low_pickup', 'Ignition or Sensor Performance Issue', 'Low Match', 'bg-[#edf2ff] text-[#4974ff]', 'Weak spark or inaccurate sensor signals can reduce power and trigger a check engine light.', 57, ARRAY['Misfire', 'Catalyst damage', 'Poor drivability'], 'Rs. 1,500 - Rs. 9,000', '/assets/spark_plug.png', 3)
ON CONFLICT (id) DO NOTHING;

-- Possible Issues: Starting Issue
INSERT INTO diagnose_possible_issues (id, category_id, title, badge, badge_class, description, match_score, risks, estimated_cost, image_src, sort_order) VALUES
('battery-discharge', 'starting_issue', 'Weak or Discharged Battery', 'High Match', 'bg-[#ffe8ea] text-[#ff4f68]', 'Low battery voltage is the most common reason for slow cranking or no-start complaints.', 87, ARRAY['Stranded vehicle', 'Repeated no-start', 'Alternator stress'], 'Rs. 3,500 - Rs. 9,000', '/assets/Electrical.png', 1),
('starter-motor', 'starting_issue', 'Starter Motor or Solenoid Issue', 'Medium Match', 'bg-[#fff2df] text-[#f59a23]', 'If power is available but the engine will not crank properly, the starter system may be at fault.', 66, ARRAY['Intermittent start failure', 'Tow requirement', 'Wiring heat'], 'Rs. 2,500 - Rs. 10,000', '/assets/starter_motor.png', 2),
('fuel-ignition-no-start', 'starting_issue', 'Fuel or Ignition No-Start Condition', 'Low Match', 'bg-[#edf2ff] text-[#4974ff]', 'If the engine cranks normally but does not start, fuel or spark delivery should be checked.', 54, ARRAY['Repeated crank stress', 'Battery drain', 'Breakdown risk'], 'Rs. 2,000 - Rs. 12,000', '/assets/fuel_pump.png', 3)
ON CONFLICT (id) DO NOTHING;

-- Possible Issues: Steering/Suspension
INSERT INTO diagnose_possible_issues (id, category_id, title, badge, badge_class, description, match_score, risks, estimated_cost, image_src, sort_order) VALUES
('wheel-balance', 'steering_suspension', 'Wheel Balancing Issue', 'High Match', 'bg-[#ffe8ea] text-[#ff4f68]', 'Unbalanced wheels can cause vibration in the steering wheel, especially at higher speeds.', 85, ARRAY['Uneven tyre wear', 'Suspension damage'], 'Rs. 1,500 - Rs. 2,500', '/assets/tyres_and_wheels.png', 1),
('wheel-alignment', 'steering_suspension', 'Wheel Alignment Issue', 'Medium Match', 'bg-[#fff2df] text-[#f59a23]', 'Improper alignment can cause vibrations and pulling to one side.', 65, ARRAY['Uneven tyre wear', 'Handling issues'], 'Rs. 800 - Rs. 1,500', '/assets/Tyre_rotataion.png', 2),
('brake-disc', 'steering_suspension', 'Brake Disc Warped', 'Low Match', 'bg-[#edf2ff] text-[#4974ff]', 'Warped brake discs can cause vibration in the steering wheel while braking.', 40, ARRAY['Reduced braking performance', 'Safety risk'], 'Rs. 2,500 - Rs. 4,500', '/assets/brake_rotor.png', 3)
ON CONFLICT (id) DO NOTHING;

-- Result Summary Items
INSERT INTO diagnose_result_summaries (id, title, heading, body, pill, pill_class, icon, icon_class, sort_order) VALUES
('summary-top-concern', 'Top Concern', 'Wheel Balancing Issue', 'Unbalanced wheels are the most likely cause of the vibration.', 'High Priority', 'bg-[#ffe9ec] text-[#ff5a63]', 'CircleAlert', 'bg-[#fff1f1] text-[#ff5d67]', 1),
('summary-other-issues', 'Other Possible Issues', 'Wheel Alignment, Brake Disc Warped', 'These issues may also contribute to the problem.', 'Medium Priority', 'bg-[#fff1de] text-[#f39b20]', 'Wrench', 'bg-[#fff5e8] text-[#f39b20]', 2),
('summary-what-this-means', 'What This Means', 'Addressing these issues early can prevent further damage and ensure safety.', '', 'Important', 'bg-[#e8f8eb] text-[#25a24a]', 'Info', 'bg-[#edf2ff] text-[#4974ff]', 3)
ON CONFLICT (id) DO NOTHING;

-- Next Steps
INSERT INTO diagnose_next_steps (id, step_number, title, body, meta, sort_order) VALUES
('step-01', '01', 'Get Quotes', 'Receive quotes from trusted garages', 'Within 30 mins', 1),
('step-02', '02', 'Compare & Choose', 'Compare prices, ratings & reviews', 'At your convenience', 2),
('step-03', '03', 'Book Appointment', 'Choose time slot & book', 'Instant confirmation', 3),
('step-04', '04', 'Get Service', 'Visit garage & get your car fixed', 'Quality service', 4)
ON CONFLICT (id) DO NOTHING;

-- Trust Items
INSERT INTO diagnose_trust_items (id, title, description, icon, sort_order) VALUES
('trust-100-free', '100% Free', 'No hidden charges', 'Shield', 1),
('trust-trusted-garages', 'Trusted Garages Only', 'Verified & rated garages', 'Settings', 2),
('trust-best-price', 'Best Price Guarantee', 'Get the best deals', 'Tag', 3),
('trust-secure', 'Secure & Private', 'Your data is safe with us', 'Lock', 4)
ON CONFLICT (id) DO NOTHING;
