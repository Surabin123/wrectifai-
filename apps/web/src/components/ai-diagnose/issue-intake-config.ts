export type IssueQuestion = {
  id: string;
  label: string;
  question: string;
  options: string[];
};

export type DiagnosticIssueResult = {
  id: string;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
  match: number;
  risks: string[];
  estimatedCost: string;
  imageSrc: string;
  category?: string;
};

export type IssueCategoryConfig = {
  id: string;
  label: string;
  summary: string;
  summaryMeaning: string;
  keywords: string[];
  questions: IssueQuestion[];
  possibleIssues: DiagnosticIssueResult[];
};

export const MAX_DIAGNOSE_QUESTIONS = 5;

export const issueCategories: IssueCategoryConfig[] = [
  {
    id: 'engine_noise',
    label: 'Engine noise',
    summary: 'Abnormal sound from the engine bay or related rotating components.',
    summaryMeaning: 'Persistent engine-side noises should be checked early to prevent wear from becoming internal engine damage.',
    keywords: [
      'engine noise',
      'engine sound',
      'ticking sound',
      'knocking sound',
      'rattling sound',
      'whining noise',
      'tap tap sound',
      'noise from engine',
      'sound from bonnet',
    ],
    questions: [
      {
        id: 'noise_timing',
        label: 'Heard most clearly',
        question: 'When do you hear the noise most clearly?',
        options: ['At idle', 'During acceleration', 'During cold start', 'At high RPM'],
      },
      {
        id: 'noise_character',
        label: 'Sound type',
        question: 'What kind of sound is it?',
        options: ['Ticking', 'Knocking', 'Rattling', 'Whining'],
      },
      {
        id: 'warning_light_engine',
        label: 'Warning lights',
        question: 'Is any warning light visible on the dashboard?',
        options: ['Check engine light', 'Oil warning light', 'No warning light', 'Not sure'],
      },
      {
        id: 'noise_change_with_ac',
        label: 'With AC on',
        question: 'Does the noise change when AC is switched on?',
        options: ['Gets louder', 'Gets lower', 'No change', 'Not sure'],
      },
    ],
    possibleIssues: [
      {
        id: 'low-engine-oil',
        title: 'Low Engine Oil or Poor Lubrication',
        badge: 'High Match',
        badgeClass: 'bg-[#ffe8ea] text-[#ff4f68]',
        description: 'Low or degraded oil can cause ticking or knocking sounds from the top end or bottom end of the engine.',
        match: 88,
        risks: ['Engine wear', 'Overheating', 'Internal damage'],
        estimatedCost: '$1,500 - $4,000',
        imageSrc: '/assets/Engine_oil.png',
      },
      {
        id: 'belt-tensioner',
        title: 'Drive Belt or Tensioner Issue',
        badge: 'Medium Match',
        badgeClass: 'bg-[#fff2df] text-[#f59a23]',
        description: 'A loose belt or worn tensioner can create whining or rattling sounds that change with RPM or AC load.',
        match: 71,
        risks: ['Accessory failure', 'Battery not charging', 'Breakdown risk'],
        estimatedCost: '$2,000 - $6,500',
        imageSrc: '/assets/Electrical.png',
      },
      {
        id: 'timing-component',
        title: 'Timing Chain or Valve Train Noise',
        badge: 'Low Match',
        badgeClass: 'bg-[#edf2ff] text-[#4974ff]',
        description: 'Worn timing or valve train parts can cause repeated ticking or rattling, especially during startup.',
        match: 56,
        risks: ['Poor timing', 'Engine misfire', 'Major repair if ignored'],
        estimatedCost: '$6,000 - $22,000',
        imageSrc: '/assets/engine_2.png',
      },
    ],
  },
  {
    id: 'ac_not_cooling',
    label: 'AC not cooling',
    summary: 'Weak or inconsistent cabin cooling from the AC system.',
    summaryMeaning: 'Cooling issues often begin with refrigerant, airflow, or compressor-side faults and can worsen quickly in traffic or hot weather.',
    keywords: [
      'ac not cooling',
      'air conditioner not cooling',
      'weak ac',
      'hot air from ac',
      'ac weak',
      'no cooling',
      'ac problem',
      'cooling issue',
    ],
    questions: [
      {
        id: 'ac_condition',
        label: 'Cooling worst',
        question: 'When is the cooling worst?',
        options: ['At idle', 'In traffic', 'Only in daytime heat', 'All the time'],
      },
      {
        id: 'ac_airflow',
        label: 'Vent airflow',
        question: 'How is the airflow from the vents?',
        options: ['Strong but not cold', 'Weak airflow', 'No airflow', 'Normal airflow'],
      },
      {
        id: 'ac_compressor_sound',
        label: 'AC sound',
        question: 'Do you hear any unusual sound when the AC is turned on?',
        options: ['Clicking', 'Whining', 'No unusual sound', 'Not sure'],
      },
      {
        id: 'ac_recent_service',
        label: 'Recent service',
        question: 'Has the AC been serviced or gas refilled recently?',
        options: ['Yes recently', 'Not recently', 'Never', 'Not sure'],
      },
    ],
    possibleIssues: [
      {
        id: 'low-refrigerant',
        title: 'Low Refrigerant Gas',
        badge: 'High Match',
        badgeClass: 'bg-[#ffe8ea] text-[#ff4f68]',
        description: 'Low refrigerant can reduce cooling efficiency, especially in traffic or during high ambient temperatures.',
        match: 86,
        risks: ['Poor cooling', 'Compressor strain', 'Cabin discomfort'],
        estimatedCost: '$2,000 - $4,500',
        imageSrc: '/assets/new_ac.png',
      },
      {
        id: 'ac-filter-blower',
        title: 'Cabin Filter or Blower Restriction',
        badge: 'Medium Match',
        badgeClass: 'bg-[#fff2df] text-[#f59a23]',
        description: 'Blocked cabin filters or blower issues reduce airflow even if the AC system itself is functioning.',
        match: 67,
        risks: ['Weak airflow', 'Dust buildup', 'Motor overload'],
        estimatedCost: '$800 - $3,000',
        imageSrc: '/assets/ac_filter.png',
      },
      {
        id: 'compressor-performance',
        title: 'AC Compressor Performance Issue',
        badge: 'Low Match',
        badgeClass: 'bg-[#edf2ff] text-[#4974ff]',
        description: 'A weak or cycling compressor can cause fluctuating cooling and unusual noise when the AC engages.',
        match: 53,
        risks: ['No cooling', 'Compressor seizure', 'Higher repair cost later'],
        estimatedCost: '$5,000 - $18,000',
        imageSrc: '/assets/ac_compressor.png',
      },
    ],
  },
  {
    id: 'brake_vibration',
    label: 'Brake vibration',
    summary: 'Vibration or pulsing felt mainly during braking.',
    summaryMeaning: 'Brake-related vibration usually points to rotor, pad, or suspension-side braking instability and should be inspected for safety.',
    keywords: [
      'brake vibration',
      'brake vibe',
      'car vibrates when braking',
      'steering shakes when braking',
      'pulsation while braking',
      'brake judder',
      'brake shaking',
    ],
    questions: [
      {
        id: 'brake_speed',
        label: 'Speed range',
        question: 'At what speed do you feel the vibration most?',
        options: ['Low speed', 'Medium speed', 'High speed', 'At all speeds'],
      },
      {
        id: 'brake_pedal_feedback',
        label: 'Brake pedal feel',
        question: 'Do you also feel pulsing in the brake pedal?',
        options: ['Yes clearly', 'Slightly', 'No', 'Not sure'],
      },
      {
        id: 'brake_recent_work',
        label: 'Recent brake work',
        question: 'Were the brake pads or discs changed recently?',
        options: ['Yes recently', 'A while ago', 'No', 'Not sure'],
      },
      {
        id: 'brake_sound',
        label: 'Braking sound',
        question: 'Do you hear any noise while braking?',
        options: ['Squeal', 'Grinding', 'No noise', 'Not sure'],
      },
    ],
    possibleIssues: [
      {
        id: 'warped-rotor',
        title: 'Warped Brake Disc',
        badge: 'High Match',
        badgeClass: 'bg-[#ffe8ea] text-[#ff4f68]',
        description: 'Warped or uneven brake rotors commonly cause steering or pedal vibration during braking.',
        match: 89,
        risks: ['Longer stopping distance', 'Pad wear', 'Safety risk'],
        estimatedCost: '$2,500 - $6,500',
        imageSrc: '/assets/brake_rotor.png',
      },
      {
        id: 'pad-deposit',
        title: 'Uneven Brake Pad Deposit',
        badge: 'Medium Match',
        badgeClass: 'bg-[#fff2df] text-[#f59a23]',
        description: 'Uneven friction deposits on the rotor surface can create pulsing and shudder while braking.',
        match: 68,
        risks: ['Reduced smoothness', 'Rotor hotspots', 'Noise increase'],
        estimatedCost: '$1,500 - $4,000',
        imageSrc: '/assets/brake_pads.png',
      },
      {
        id: 'brake-caliper',
        title: 'Brake Caliper Sticking',
        badge: 'Low Match',
        badgeClass: 'bg-[#edf2ff] text-[#4974ff]',
        description: 'A sticking caliper can overheat one side, cause vibration, and wear pads unevenly.',
        match: 52,
        risks: ['Brake drag', 'Heat damage', 'Uneven braking'],
        estimatedCost: '$2,000 - $7,000',
        imageSrc: '/assets/brake_caliper.png',
      },
    ],
  },
  {
    id: 'low_pickup',
    label: 'Low pickup',
    summary: 'Poor acceleration, weak response, or power loss while driving.',
    summaryMeaning: 'Power-loss symptoms can come from airflow, fuel delivery, ignition, or exhaust restriction and need targeted follow-up.',
    keywords: [
      'low pickup',
      'poor pickup',
      'low power',
      'car not accelerating',
      'pickup issue',
      'sluggish acceleration',
      'power loss',
    ],
    questions: [
      {
        id: 'pickup_condition',
        label: 'Weakness noticed',
        question: 'When is the weak pickup most noticeable?',
        options: ['During overtaking', 'On inclines', 'With AC on', 'All the time'],
      },
      {
        id: 'pickup_exhaust',
        label: 'Exhaust smoke',
        question: 'Do you notice unusual smoke from the exhaust?',
        options: ['Black smoke', 'White smoke', 'No smoke', 'Not sure'],
      },
      {
        id: 'pickup_warning_light',
        label: 'Dashboard light',
        question: 'Is the check engine light on?',
        options: ['Yes', 'No', 'Sometimes', 'Not sure'],
      },
      {
        id: 'pickup_service_history',
        label: 'Recent service',
        question: 'Was the air filter, fuel filter, or spark plugs serviced recently?',
        options: ['Yes recently', 'Service overdue', 'Not sure', 'No idea'],
      },
    ],
    possibleIssues: [
      {
        id: 'air-intake-restriction',
        title: 'Air Intake or Filter Restriction',
        badge: 'High Match',
        badgeClass: 'bg-[#ffe8ea] text-[#ff4f68]',
        description: 'A clogged air filter or restricted intake can reduce acceleration and make the engine feel dull.',
        match: 83,
        risks: ['Poor mileage', 'Weak response', 'Dirty throttle body'],
        estimatedCost: '$700 - $3,000',
        imageSrc: '/assets/air_filter.png',
      },
      {
        id: 'fuel-delivery',
        title: 'Fuel Delivery Problem',
        badge: 'Medium Match',
        badgeClass: 'bg-[#fff2df] text-[#f59a23]',
        description: 'Fuel pump or injector-side issues can cause hesitation, weak pickup, and inconsistent acceleration.',
        match: 69,
        risks: ['Engine hesitation', 'Stalling risk', 'Poor combustion'],
        estimatedCost: '$2,500 - $12,000',
        imageSrc: '/assets/fuel_pump.png',
      },
      {
        id: 'ignition-performance',
        title: 'Ignition or Sensor Performance Issue',
        badge: 'Low Match',
        badgeClass: 'bg-[#edf2ff] text-[#4974ff]',
        description: 'Weak spark or inaccurate sensor signals can reduce power and trigger a check engine light.',
        match: 57,
        risks: ['Misfire', 'Catalyst damage', 'Poor drivability'],
        estimatedCost: '$1,500 - $9,000',
        imageSrc: '/assets/spark_plug.png',
      },
    ],
  },
  {
    id: 'starting_issue',
    label: 'Car not starting',
    summary: 'Starting failure, slow cranking, or ignition-related no-start issue.',
    summaryMeaning: 'No-start complaints usually narrow down to battery, starter, or fuel-ignition readiness and should be separated quickly.',
    keywords: [
      'car not starting',
      'not starting',
      'start issue',
      'engine not starting',
      'self not working',
      'slow crank',
      'crank no start',
      'no start',
    ],
    questions: [
      {
        id: 'starting_crank',
        label: 'Starter behavior',
        question: 'What happens when you try to start the car?',
        options: ['No crank at all', 'Slow cranking', 'Cranks but does not start', 'Single click only'],
      },
      {
        id: 'starting_lights',
        label: 'Electrical signs',
        question: 'Do dashboard lights and horn work normally?',
        options: ['Yes normal', 'Dim or weak', 'Nothing works', 'Not sure'],
      },
      {
        id: 'starting_recent_idle',
        label: 'Vehicle idle period',
        question: 'Was the car parked unused for several days?',
        options: ['Yes', 'No', 'Only overnight', 'Not sure'],
      },
      {
        id: 'starting_after_jump',
        label: 'After jump start',
        question: 'Does it start with jumper cables or after charging?',
        options: ['Yes', 'No', 'Not tried', 'Not sure'],
      },
    ],
    possibleIssues: [
      {
        id: 'battery-discharge',
        title: 'Weak or Discharged Battery',
        badge: 'High Match',
        badgeClass: 'bg-[#ffe8ea] text-[#ff4f68]',
        description: 'Low battery voltage is the most common reason for slow cranking or no-start complaints.',
        match: 87,
        risks: ['Stranded vehicle', 'Repeated no-start', 'Alternator stress'],
        estimatedCost: '$3,500 - $9,000',
        imageSrc: '/assets/Electrical.png',
      },
      {
        id: 'starter-motor',
        title: 'Starter Motor or Solenoid Issue',
        badge: 'Medium Match',
        badgeClass: 'bg-[#fff2df] text-[#f59a23]',
        description: 'If power is available but the engine will not crank properly, the starter system may be at fault.',
        match: 66,
        risks: ['Intermittent start failure', 'Tow requirement', 'Wiring heat'],
        estimatedCost: '$2,500 - $10,000',
        imageSrc: '/assets/starter_motor.png',
      },
      {
        id: 'fuel-ignition-no-start',
        title: 'Fuel or Ignition No-Start Condition',
        badge: 'Low Match',
        badgeClass: 'bg-[#edf2ff] text-[#4974ff]',
        description: 'If the engine cranks normally but does not start, fuel or spark delivery should be checked.',
        match: 54,
        risks: ['Repeated crank stress', 'Battery drain', 'Breakdown risk'],
        estimatedCost: '$2,000 - $12,000',
        imageSrc: '/assets/fuel_pump.png',
      },
    ],
  },
  {
    id: 'steering_suspension',
    label: 'Steering or suspension vibration',
    summary: 'Shaking, pulling, or vibration felt while driving, usually speed-related.',
    summaryMeaning: 'Driving vibration that is not limited to braking is often tyre, wheel balance, alignment, or suspension related.',
    keywords: [
      'steering vibration',
      'steering wheel vibration',
      'car shaking',
      'vibration at high speed',
      'wheel vibration',
      'suspension vibration',
      'pulling to one side',
    ],
    questions: [
      {
        id: 'drive_vibration_speed',
        label: 'When it happens',
        question: 'When do you feel the vibration most?',
        options: ['Only while braking', 'While accelerating', 'At constant speed', 'Always'],
      },
      {
        id: 'steering_shake_present',
        label: 'Steering shake',
        question: 'Does the steering wheel also shake?',
        options: ['Yes', 'No', 'Only sometimes', 'Not sure'],
      },
      {
        id: 'issue_started',
        label: 'Issue start',
        question: 'When did this issue start?',
        options: ['Recently within a week', 'Gradually over time', 'After tyre work', 'Long back'],
      },
      {
        id: 'road_surface_effect',
        label: 'Road surface effect',
        question: 'Does it get worse on rough roads or uneven surfaces?',
        options: ['Yes much worse', 'Slightly worse', 'No change', 'Not sure'],
      },
    ],
    possibleIssues: [
      {
        id: 'wheel-balance',
        title: 'Wheel Balancing Issue',
        badge: 'High Match',
        badgeClass: 'bg-[#ffe8ea] text-[#ff4f68]',
        description: 'Unbalanced wheels can cause vibration in the steering wheel, especially at higher speeds.',
        match: 85,
        risks: ['Uneven tyre wear', 'Suspension damage'],
        estimatedCost: '$1,500 - $2,500',
        imageSrc: '/assets/tyres_and_wheels.png',
      },
      {
        id: 'wheel-alignment',
        title: 'Wheel Alignment Issue',
        badge: 'Medium Match',
        badgeClass: 'bg-[#fff2df] text-[#f59a23]',
        description: 'Improper alignment can cause vibrations and pulling to one side.',
        match: 65,
        risks: ['Uneven tyre wear', 'Handling issues'],
        estimatedCost: '$800 - $1,500',
        imageSrc: '/assets/Tyre_rotataion.png',
      },
      {
        id: 'brake-disc',
        title: 'Brake Disc Warped',
        badge: 'Low Match',
        badgeClass: 'bg-[#edf2ff] text-[#4974ff]',
        description: 'Warped brake discs can cause vibration in the steering wheel while braking.',
        match: 40,
        risks: ['Reduced braking performance', 'Safety risk'],
        estimatedCost: '$2,500 - $4,500',
        imageSrc: '/assets/brake_rotor.png',
      },
    ],
  },
];

export function getCategoryById(categoryId: string) {
  return issueCategories.find((category) => category.id === categoryId);
}
