'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  Gauge,
  ImageIcon,
  Lock,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
  Video,
  Zap,
  AlertTriangle,
} from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage?: number;
  image?: string;
}

interface LlmIssue {
  confidence: number;
  estimatedPriceRange: { min: number; max: number };
  name: string;
  category?: string;
  description?: string;
  risks?: string[];
  imageSrc?: string;
  requiredParts?: string[];
}

interface DynamicQuestion {
  id: string;
  question: string;
  options: string[];
}

interface IssueQuestion {
  id: string;
  question: string;
  options: string[];
  type?: 'text' | 'select' | 'multi-select';
}

interface NextStep {
  step: string;
  title: string;
  body: string;
  meta?: string;
}

import {
  ArrowRight,
  ChevronDown,
  Bomb,
  Settings,
  Snowflake,
  Contact,
  ArrowLeft,
  PenLine,
  PhoneCall,
  Wrench,
  CircleAlert,
  Info,
  Headset,
  BadgeCheck,
  Shield,
  CarFront,
  Wind,
  X,
  BatteryWarning,
  Flame,
  Activity,
  CircleStop,
  Car,
  Thermometer,
  type LucideIcon,
} from 'lucide-react';
import {
  getCategoryById,
  issueCategories,
  type DiagnosticIssueResult,
  type IssueCategoryConfig,
} from '@/components/ai-diagnose/issue-intake-config';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { Card } from '@/components/common/card';
import { cn } from '@/utils/cn';
import { VehicleSelector } from '@/components/common/vehicle-selector';
import { submitDiagnosis, chatDiagnosis, syncChatHistory, uploadMedia, type DiagnosisResponse } from '../../lib/diagnosis-api';
import { getVehicleImage } from '@/lib/vehicle-image-catalog';
import { formatCurrency } from '@/lib/currency';

function getBadgeForIssue(name: string, overallRisk?: string, index?: number) {
  if (index === 0 && overallRisk) {
    if (overallRisk === 'low') return { badge: 'Low Risk', badgeClass: 'text-[#2e7d32] bg-[#edf7ed]' };
    if (overallRisk === 'medium') return { badge: 'Caution', badgeClass: 'text-[#e27622] bg-[#fdf5ed]' };
    return { badge: 'Critical', badgeClass: 'text-[#ea3838] bg-[#fef1f1]' };
  }
  const nameLower = name.toLowerCase();
  if (nameLower.includes('brake') || nameLower.includes('steering') || nameLower.includes('suspension') || nameLower.includes('airbag')) {
    return { badge: 'Critical', badgeClass: 'text-[#ea3838] bg-[#fef1f1]' };
  }
  if (nameLower.includes('filter') || nameLower.includes('wiper') || nameLower.includes('bulb')) {
    return { badge: 'Low Risk', badgeClass: 'text-[#2e7d32] bg-[#edf7ed]' };
  }
  return { badge: 'Caution', badgeClass: 'text-[#e27622] bg-[#fdf5ed]' };
}

function mapLlmIssueToDiagnosticResult(llmIssue: LlmIssue, index: number, overallRisk?: string, diySteps?: string[], selectedVehicle?: Vehicle | null): DiagnosticIssueResult {
  const match = llmIssue.confidence;
  const priceRange = llmIssue.estimatedPriceRange;
  
  let userPhone = '';
  try {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user_profile') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    userPhone = user?.phone || '';
  } catch(e) {}
  
  const minCost = formatCurrency(priceRange.min, userPhone);
  const maxCost = formatCurrency(priceRange.max, userPhone);
  const estimatedCost = `${minCost} - ${maxCost}`;
  
  const id = `llm_issue_${index}`;
  const title = llmIssue.name;
  const category = llmIssue.category;

  const { badge, badgeClass } = getBadgeForIssue(title, overallRisk, index);

  const capitalizedRisk = overallRisk ? overallRisk.charAt(0).toUpperCase() + overallRisk.slice(1) : 'Medium';

  let reasoning = llmIssue.description || '';
  if (index === 0 && diySteps && diySteps.length > 0) {
    const reasoningStep = diySteps.find(step => step.toLowerCase().includes('why this diagnosis') || step.toLowerCase().includes('technical reasoning'));
    if (reasoningStep) {
      reasoning = reasoningStep.replace(/^(?:\\*\\*)?(?:why this diagnosis\\??|technical reasoning):?(?:\\*\\*)?\\s*/i, '');
    } else {
      reasoning = diySteps[0];
    }
  }

  if (!reasoning) {
    reasoning = `Diagnosed issue: ${title}.`;
  }

  return {
    id,
    title,
    badge,
    badgeClass,
    description: reasoning,
    match,
    category,
    risks: [capitalizedRisk],
    estimatedCost,
    imageSrc: selectedVehicle?.image || getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year),
  };
}

type ChatEntry =
  | {
    id: string;
    sender: 'assistant';
    time: string;
    kind: 'message';
    text: string;
    highlighted?: boolean;
  }
  | {
    id: string;
    sender: 'assistant';
    time: string;
    kind: 'question';
    question: string;
    options: string[];
    selected: string;
  }
  | {
    id: string;
    sender: 'user';
    time: string;
    kind: 'reply';
    text: string;
    mediaUrls?: string[];
  };



const footerFeatures = [
  {
    title: 'Save Time & Money',
    description: 'Accurate diagnosis helps you save up to 30%',
    icon: Bomb,
  },
  {
    title: 'Expert AI Analysis',
    description: 'Trained on 2M+ real car problems',
    icon: Settings,
  },
  {
    title: '100% Free',
    description: 'No charges for diagnosis and recommendations',
    icon: Zap,
  },
  {
    title: 'Trusted Garages',
    description: 'Only verified & rated garages',
    icon: Contact,
  },
];

const legacyResultIssues = [
  {
    id: 'wheel-balance',
    title: 'Wheel Balancing Issue',
    badge: 'High Match',
    badgeClass: 'bg-[#ffe8ea] text-[#ff4f68]',
    description:
      'Unbalanced wheels can cause vibration in the steering wheel, especially at higher speeds.',
    match: 85,
    risks: ['Uneven tyre wear', 'Suspension damage'],
    estimatedCost: 'USD 1,500 - USD 2,500',
    imageSrc: '/assets/tyres_and_wheels.png',
  },
  {
    id: 'wheel-alignment',
    title: 'Wheel Alignment Issue',
    badge: 'Medium Match',
    badgeClass: 'bg-[#fff2df] text-[#f59a23]',
    description:
      'Improper alignment can cause vibrations and pulling to one side.',
    match: 65,
    risks: ['Uneven tyre wear', 'Handling issues'],
    estimatedCost: 'USD 800 - USD 1,500',
    imageSrc: '/assets/Tyre_rotataion.png',
  },
  {
    id: 'brake-disc',
    title: 'Brake Disc Warped',
    badge: 'Low Match',
    badgeClass: 'bg-[#edf2ff] text-[#4974ff]',
    description:
      'Warped brake discs can cause vibration in the steering wheel while braking.',
    match: 40,
    risks: ['Reduced braking performance', 'Safety risk'],
    estimatedCost: 'USD 2,500 - USD 4,500',
    imageSrc: '/assets/brake_rotor.png',
  },
];

const legacyResultSummaryItems = [
  {
    title: 'Top Concern',
    heading: 'Wheel Balancing Issue',
    body: 'Unbalanced wheels are the most likely cause of the vibration.',
    pill: 'High Priority',
    pillClass: 'bg-[#ffe9ec] text-[#ff5a63]',
    icon: CircleAlert,
    iconClass: 'bg-[#fff1f1] text-[#ff5d67]',
  },
  {
    title: 'Other Possible Issues',
    heading: 'Wheel Alignment, Brake Disc Warped',
    body: 'These issues may also contribute to the problem.',
    pill: 'Medium Priority',
    pillClass: 'bg-[#fff1de] text-[#f39b20]',
    icon: Wrench,
    iconClass: 'bg-[#fff5e8] text-[#f39b20]',
  },
  {
    title: 'What This Means',
    heading: 'Address this issue early',
    body: 'Addressing these issues early can prevent further damage and ensure safety.',
    pill: 'Important',
    pillClass: 'bg-[#e8f8eb] text-[#23a249]',
    icon: Info,
    iconClass: 'bg-[#edf2ff] text-[#4974ff]',
  },
];

const resultNextSteps = [
  {
    step: '01',
    title: 'Get Quotes',
    body: 'Receive quotes from trusted garages',
    meta: 'Within 30 mins',
  },
  {
    step: '02',
    title: 'Compare & Choose',
    body: 'Compare prices, ratings & reviews',
    meta: 'At your convenience',
  },
  {
    step: '03',
    title: 'Book Appointment',
    body: 'Choose time slot & book',
    meta: 'Instant confirmation',
  },
  {
    step: '04',
    title: 'Get Service',
    body: 'Visit garage & get your car fixed',
    meta: 'Quality service',
  },
];

const resultTrustItems = [
  {
    title: '100% Free',
    description: 'No hidden charges',
    icon: Shield,
  },
  {
    title: 'Trusted Garages Only',
    description: 'Verified & rated garages',
    icon: BadgeCheck,
  },
  {
    title: 'Best Price Guarantee',
    description: 'Get the best deals',
    icon: Gauge,
  },
  {
    title: 'Secure & Private',
    description: 'Your data is safe with us',
    icon: Lock,
  },
];

const DEFAULT_ISSUE_TEXT = 'Diagnostic media provided for analysis.';

type AnswerMap = Record<string, string>;

type AnswerSummaryItem = {
  label: string;
  value: string;
  icon: LucideIcon;
};

type ResultSummaryItem = {
  title: string;
  heading: string;
  body: string;
  pill: string;
  pillClass: string;
  icon: LucideIcon;
  iconClass: string;
};

type InitialFlowState = {
  issueText: string;
  introText: string;
  initialQuestion: IssueQuestion | null;
  activeCategoryId: string | null;
};

const summaryIcons: LucideIcon[] = [Gauge, CheckCircle2, Clock3, Wrench, Info];

const homeHeroHeadingClass = 'ui-hero-title';
const homeSectionHeadingClass = 'ui-page-title';
const homeCardHeadingClass = 'ui-card-title';
const homeSubheadingClass = 'ui-subheading';
const homeBodyStrongClass = 'ui-body-strong';

function getIssueVisualMeta(issue: DiagnosticIssueResult) {
  const issueId = issue.id.toLowerCase();
  const issueTitle = issue.title.toLowerCase();
  const category = (issue.category || '').toLowerCase();
  
  let emoji = '⚙️';
  if (issueTitle.includes('battery') || issueTitle.includes('electrical')) emoji = '🔋';
  else if (issueTitle.includes('brake') || issueId.includes('brake')) emoji = '🛑';
  else if (issueTitle.includes('engine') || issueTitle.includes('motor')) emoji = '🚙';
  else if (issueTitle.includes('oil') || issueTitle.includes('fluid') || issueTitle.includes('leak')) emoji = '💧';
  else if (issueTitle.includes('tire') || issueTitle.includes('wheel') || issueTitle.includes('alignment') || category.includes('suspension')) emoji = '🛞';
  else if (issueTitle.includes('ac ') || issueTitle.includes('a/c') || issueTitle.includes('coolant') || category.includes('cooling')) emoji = '❄️';
  else if (issueTitle.includes('transmission') || issueTitle.includes('gear')) emoji = '🕹️';
  else if (issueTitle.includes('scratch') || issueTitle.includes('dent') || issueTitle.includes('body')) emoji = '💥';
  else if (issueTitle.includes('rust') || issueTitle.includes('corrosion')) emoji = '🟤';
  else if (issueTitle.includes('exhaust') || issueTitle.includes('smoke')) emoji = '💨';

  return { emoji, fillClass: 'bg-[#f8fafc]' };
}

function IssueVisual({
  issue,
  size = 64,
  vehicleImageSrc,
}: {
  issue: DiagnosticIssueResult;
  size?: number;
  vehicleImageSrc?: string;
}) {
  const { emoji, fillClass } = getIssueVisualMeta(issue);

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-[16px] border border-[#e8eefc] shadow-[0_8px_18px_rgba(20,44,112,0.04)]',
        fillClass
      )}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      <span>{emoji}</span>
    </div>
  );
}

function IssueDetailsModal({
  issue,
  onClose,
  vehicleImageSrc,
}: {
  issue: DiagnosticIssueResult | null;
  onClose: () => void;
  vehicleImageSrc?: string;
}) {
  useEffect(() => {
    if (!issue) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [issue, onClose]);

  if (!issue) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,18,45,0.24)] px-4 py-5 backdrop-blur-[1px]">
      <div className="w-full max-w-[520px] rounded-[20px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(16,35,86,0.18)]">
        <div className="px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <IssueVisual issue={issue} size={72} vehicleImageSrc={vehicleImageSrc} />
              <div>
                <h3 className={homeSectionHeadingClass}>{issue.title}</h3>
                <p className="mt-1 text-[11px] leading-5 text-[#5f7099]">
                  {issue.description}
                </p>
                <span
                  className={cn(
                    'mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    issue.badgeClass
                  )}
                >
                  {issue.badge}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close issue details"
              className="mt-0.5 text-[#17307a] transition-all duration-150 hover:scale-110 hover:text-black active:scale-90"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 rounded-[16px] border border-[#e8eefc] bg-[#fbfcff] px-4 py-4 sm:grid-cols-2">
            <div>
              <div className={homeSubheadingClass}>Estimated Cost</div>
              <p className="mt-2 text-[12px] text-[#17307a]">
                {issue.estimatedCost}
              </p>
            </div>
            <div>
              <div className={homeSubheadingClass}>Confidence Match</div>
              <p className="mt-2 text-[12px] text-[#17307a]">
                {issue.match}% likely
              </p>
            </div>
            <div className="sm:col-span-2">
              <div className={homeSubheadingClass}>Risk if ignored</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {issue.risks.map((risk) => (
                  <span
                    key={risk}
                    className="rounded-full border border-[#dbe6ff] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#17307a]"
                  >
                    {risk}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildInitialFlow(issueText: string): InitialFlowState {
  const trimmedIssue = issueText.trim();
  return {
    issueText: trimmedIssue || DEFAULT_ISSUE_TEXT,
    introText: trimmedIssue
      ? `I received your symptom description: "${trimmedIssue}". Selecting your vehicle on the right will immediately begin the diagnosis.`
      : 'Hello! I am WrectifAI, your automotive diagnostic assistant. Please select your vehicle on the right, then describe the issues or symptoms your vehicle is experiencing below to start the diagnosis.',
    initialQuestion: null,
    activeCategoryId: null,
  };
}

function getResolvedIssues(activeCategoryId: string | null) {
  return (
    getCategoryById(activeCategoryId ?? '')?.possibleIssues ??
    issueCategories[0].possibleIssues
  );
}

function getResultSummaryItems(
  activeCategory: IssueCategoryConfig | undefined,
  issues: DiagnosticIssueResult[]
): ResultSummaryItem[] {
  if (!activeCategory && issues.length === legacyResultIssues.length) {
    return legacyResultSummaryItems as ResultSummaryItem[];
  }

  const topIssue = issues[0];
  const secondaryIssues = issues.slice(1);

  let pill = 'High Priority';
  let pillClass = 'bg-[#ffe9ec] text-[#ff5a63]';

  if (topIssue) {
    if (topIssue.badge === 'Low Risk') {
      pill = 'Low Priority';
      pillClass = 'bg-[#e8f8eb] text-[#25a24a]';
    } else if (topIssue.badge === 'Caution') {
      pill = 'Medium Priority';
      pillClass = 'bg-[#fff5e8] text-[#f39b20]';
    } else if (topIssue.badge === 'Critical') {
      pill = 'High Priority';
      pillClass = 'bg-[#ffe9ec] text-[#ff5a63]';
    }
  }

  return [
    {
      title: 'Top Concern',
      heading: topIssue?.title ?? 'Further inspection needed',
      body:
        topIssue?.description ??
        'Your answers suggest a primary issue, but a garage inspection is still recommended.',
      pill,
      pillClass,
      icon: CircleAlert,
      iconClass: 'bg-[#fff1f1] text-[#ff5d67]',
    },
    {
      title: 'Other Possible Issues',
      heading: secondaryIssues.length
        ? secondaryIssues.map((issue) => issue.title).join(', ')
        : 'No strong secondary match',
      body: secondaryIssues.length
        ? `These ${activeCategory?.label.toLowerCase() ?? 'related'
        } issues can also produce similar symptoms.`
        : 'Your answers point more strongly to one primary issue than multiple competing matches.',
      pill: 'Medium Priority',
      pillClass: 'bg-[#fff1de] text-[#f39b20]',
      icon: Wrench,
      iconClass: 'bg-[#fff5e8] text-[#f39b20]',
    },
    {
      title: 'What This Means',
      heading: activeCategory
        ? `${activeCategory.label} is the most likely issue family`
        : 'Targeted inspection recommended',
      body:
        activeCategory?.summaryMeaning ??
        'The follow-up answers are enough to narrow the issue family, but a physical inspection is still required for confirmation.',
      pill: 'Important',
      pillClass: 'bg-[#e8f8eb] text-[#23a249]',
      icon: Info,
      iconClass: 'bg-[#edf2ff] text-[#4974ff]',
    },
  ];
}

function buildAnswerSummaryItems(answers: AnswerMap): AnswerSummaryItem[] {
  return Object.entries(answers)
    .map(([label, value], index) => {
      if (!value) return null;
      return {
        label,
        value,
        icon: summaryIcons[index % summaryIcons.length],
      };
    })
    .filter((item): item is AnswerSummaryItem => item !== null);
}

function ProgressRing({ progress }: { progress: number }) {
  const radius = 31;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * progress) / 100;

  return (
    <div className="relative h-[86px] w-[86px] shrink-0">
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 86 86"
        aria-hidden="true"
      >
        <circle
          cx="43"
          cy="43"
          r={radius}
          fill="none"
          stroke="#edf2ff"
          strokeWidth="6"
        />
        <circle
          cx="43"
          cy="43"
          r={radius}
          fill="none"
          stroke="#3f6fff"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[14px] font-bold text-[#214ccf]">
          {progress}%
        </span>
      </div>
    </div>
  );
}

function AssistantPill() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#dce7ff] bg-white shadow-[0_6px_16px_rgba(31,94,255,0.08)] overflow-hidden">
      <Image
        src="/assets/Robo_icon.png"
        alt="WrectifAI"
        width={28}
        height={28}
        className="h-full w-full object-contain p-0.5"
      />
    </div>
  );
}

function DiagnoseAnalyzingScreen({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const step1 = setTimeout(() => setCurrentStep(1), 1000);
    const step2 = setTimeout(() => setCurrentStep(2), 2000);
    const step3 = setTimeout(() => setCurrentStep(3), 3000);
    const done = setTimeout(() => {
      if (onCompleteRef.current) onCompleteRef.current();
    }, 4000);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      clearTimeout(done);
    };
  }, []);

  const analyzingSteps = [
    {
      title: 'Analyzing issue',
      description: 'Reading your input',
      icon: Sparkles,
    },
    {
      title: 'Checking systems',
      description: 'Scanning possible causes',
      icon: Settings,
    },
    {
      title: 'Matching solutions',
      description: 'Finding best fixes',
      icon: Gauge,
    },
    {
      title: 'Preparing results',
      description: 'Almost there...',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="px-4 pb-4 pt-1 md:px-7">
      <div className="overflow-hidden rounded-[24px] border border-[#e8eefc] bg-[radial-gradient(circle_at_top,#f7f9ff_0%,#ffffff_60%)] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:px-8 md:py-6">
        <div className="relative mx-auto flex max-w-[760px] flex-col items-center text-center">
          <div className="pointer-events-none absolute left-1/2 top-[69px] hidden h-px w-[72%] -translate-x-1/2 bg-[linear-gradient(90deg,rgba(72,117,255,0)_0%,rgba(72,117,255,0.2)_18%,rgba(72,117,255,0.42)_50%,rgba(72,117,255,0.2)_82%,rgba(72,117,255,0)_100%)] md:block" />

          <div className="relative flex h-[150px] w-[150px] items-center justify-center">
            <div className="absolute inset-[8px] rounded-full border-[6px] border-[#edf3ff]" />
            <div className="absolute inset-0 rounded-full border-[6px] border-[#2f67ff] border-t-transparent border-l-transparent animate-spin [animation-duration:2.4s]" />
            <div className="absolute inset-[24px] rounded-full border border-[#dae6ff] bg-white/70 shadow-[0_24px_48px_rgba(39,73,154,0.08)] backdrop-blur-sm" />
            <div className="absolute inset-[36px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#275dff_0%,#143fb8_58%,#0d2f8f_100%)] shadow-[0_20px_40px_rgba(24,69,198,0.28)]" />
            <div className="relative flex h-[78px] w-[78px] items-center justify-center rounded-full border border-white/25 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),rgba(255,255,255,0.04))]">
              <Image
                src="/Logo_noBg.png"
                alt="WrectifAI Logo"
                width={50}
                height={50}
                priority
                className="object-contain"
                style={{ width: '50px', height: 'auto' }}
              />
            </div>
          </div>

          <h2 className={cn('mt-2', homeHeroHeadingClass)}>
            Analyzing your issue...
          </h2>
          <p className="mt-2 max-w-[520px] text-[12px] leading-6 text-[#5f7099]">
            WrectifAI is checking possible causes and preparing the best
            solutions for you.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e3ebff] bg-white/90 px-4 py-2 text-[13px] font-medium text-[#4b63a0] shadow-[0_10px_26px_rgba(39,73,154,0.06)]">
            <Clock3 className="h-4 w-4 text-[#416cff]" />
            <span>This may take a few seconds, please wait.</span>
          </div>

          <div className="mt-6 grid w-full gap-4 md:grid-cols-4">
            {analyzingSteps.map(({ title, description, icon: Icon }, index) => {
              const isComplete = index < currentStep;
              const isActive = index === currentStep;
              return (
                <div
                  key={title}
                  className="relative flex flex-col items-center text-center"
                >
                  {index < analyzingSteps.length - 1 ? (
                    <div className="absolute left-[calc(50%+22px)] top-[22px] hidden h-px w-[calc(100%-44px)] bg-[#d9e4ff] md:block">
                      <div
                        className={cn(
                          'h-full bg-[#2350f6] transition-all duration-500 ease-out',
                          index < currentStep ? 'w-full' : 'w-0'
                        )}
                      />
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      'relative z-10 flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300',
                      isComplete
                        ? 'border-[#1ea84a] bg-[#1ea84a] text-white shadow-[0_8px_20px_rgba(30,168,74,0.15)]'
                        : isActive
                          ? 'border-[#2350f6] bg-[#2350f6] text-white shadow-[0_8px_20px_rgba(35,80,246,0.25)] scale-110'
                          : 'border-[#dce7ff] bg-white text-[#7d8bb0]'
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5 stroke-[3]" />
                    ) : (
                      <Icon
                        className={cn(
                          'h-5 w-5',
                          isActive ? 'animate-pulse' : ''
                        )}
                      />
                    )}
                  </div>
                  <div
                    className={cn(
                      'mt-3 text-[12px] font-semibold transition-colors duration-300',
                      isActive
                        ? 'text-[#1a56db]'
                        : isComplete
                          ? 'text-[#1ea84a]'
                          : 'text-[#17307a]'
                    )}
                  >
                    {title}
                  </div>
                  <div
                    className={cn(
                      'mt-1 text-[11px] transition-colors duration-300',
                      isActive ? 'text-[#1a56db]' : 'text-[#5f7099]'
                    )}
                  >
                    {description}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 w-full rounded-[18px] border border-[#e8eefc] bg-white/90 px-4 py-3.5 shadow-[0_10px_28px_rgba(39,73,154,0.04)]">
            <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-[#2d59d3]">
              <ShieldCheck className="h-4.5 w-4.5" />
              <span>
                WrectifAI scans thousands of data points to provide accurate
                diagnosis and recommendations.
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#5f7099]">
            <Lock className="h-3.5 w-3.5" />
            <span>100% Secure</span>
            <span>•</span>
            <span>Your data is safe with us</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfidenceGauge({ value }: { value: number }) {
  const radius = 64;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (circumference * value) / 100;

  return (
    <div className="relative mx-auto h-[152px] w-[190px]">
      <svg
        className="absolute inset-0"
        viewBox="0 0 190 152"
        aria-hidden="true"
      >
        <path
          d="M 31 95 A 64 64 0 0 1 159 95"
          fill="none"
          stroke="#e7edff"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M 31 95 A 64 64 0 0 1 159 95"
          fill="none"
          stroke="url(#confidence-gradient)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
        <defs>
          <linearGradient id="confidence-gradient" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#1533d5" />
            <stop offset="100%" stopColor="#5a8bff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-x-0 top-[42px] text-center">
        <div className="text-[32px] font-semibold tracking-[-0.04em] text-[#1d37b9]">
          {value}%
        </div>
        <div className="mt-4 text-[14px] font-semibold text-[#2aaa4c]">
          High Confidence
        </div>
      </div>
    </div>
  );
}

type DiagnoseResultsScreenProps = {
  issueText: string;
  answerSummaryItems: AnswerSummaryItem[];
  activeCategory: IssueCategoryConfig | undefined;
  resultIssues: DiagnosticIssueResult[];
  selectedIssues: string[];
  detailsText: string;
  onDetailsTextChange: (value: string) => void;
  onToggleIssue: (issueId: string) => void;
  onEditIssue: () => void;
  onRequestQuotes: () => void;
  selectedVehicle?: Vehicle | null;
  nextSteps?: NextStep[];
  confidenceScore?: number;
  onRegenerateDiagnosis?: (notes: string) => Promise<void>;
  diyType?: 'repair' | 'troubleshooting' | 'none';
};

interface DiagnosisSummaryData {
  primaryIssue: string;
  symptoms: string[];
  severity: string;
  confidence: string;
  additionalNotes?: string;
}

type Evidence = {
  symptoms: string[];
  rawNotes: string;
  hasRecentTireService: boolean;
  hasRecentBrakeService: boolean;
  hasRecentBatteryService: boolean;
  hasRecentAcRecharge: boolean;
  hasTransmissionFluidService: boolean;
  hasOverheating: boolean;
  hasSteeringIssues: boolean;
  hasBrakeIssues: boolean;
  hasStartingIssues: boolean;
  hasAcIssues: boolean;
  hasTransmissionIssues: boolean;
  hasEnginePerformanceIssues: boolean;
};

type DiagnosticCause = {
  id: string;
  name: string;
  severity: string;
  baseScore: number;
  finalScore: number;
  supportedBy: string[];
  weakenedBy: string[];
};

type ReasoningResult = {
  primaryDiagnosis: DiagnosticCause;
  alternativeDiagnosis: DiagnosticCause | null;
  keyEvidence: string;
  supportReason: string;
  rejectionReason: string;
};

type Observation = {
  type: 'symptom' | 'maintenance' | 'condition' | 'system';
  value: string;
  source: 'questionnaire' | 'additional_info';
};

type CandidateDiagnosis = {
  id: string;
  name: string;
  severity: string;
  baseProbability: number;
  supportedBy: Observation[];
  contradictedBy: Observation[];
  eliminated: boolean;
  eliminationReason?: string;
  confidenceContribution: number;
};

type ReasoningState = {
  observations: Observation[];
  candidates: CandidateDiagnosis[];
  mostProbable: CandidateDiagnosis | null;
  baseConfidence: number;
  finalConfidence: number;
  missingEvidence: string[];
  nextSteps: string;
};

function extractEvidencePipeline(symptoms: string[], notes = ""): Observation[] {
  const obs: Observation[] = [];

  symptoms.forEach(s => {
    obs.push({ type: 'symptom', value: s.toLowerCase(), source: 'questionnaire' });
  });

  if (notes) {
    const notesLower = notes.toLowerCase();

    // Extract maintenance
    const maintenanceKeywords = ['replace', 'new', 'refill', 'recharge', 'service', 'flush', 'jump', 'change'];
    maintenanceKeywords.forEach(k => {
      if (notesLower.includes(k)) {
        obs.push({ type: 'maintenance', value: notesLower, source: 'additional_info' });
      }
    });

    // Extract conditions
    const conditionKeywords = ['highway', 'speed', 'idle', 'turn', 'cold', 'hot', 'rain', 'bump', 'pothole', 'accident', 'start'];
    conditionKeywords.forEach(k => {
      if (notesLower.includes(k)) {
        obs.push({ type: 'condition', value: notesLower, source: 'additional_info' });
      }
    });

    // Extract raw symptoms if none of the above matched distinctly, or just add the whole note
    if (obs.filter(o => o.source === 'additional_info').length === 0) {
      obs.push({ type: 'symptom', value: notesLower, source: 'additional_info' });
    }
  }
  return obs;
}

function evaluateCandidates(observations: Observation[]): CandidateDiagnosis[] {
  // Define initial candidates across major systems
  const candidates: CandidateDiagnosis[] = [
    { id: "ac_leak", name: "A/C Compressor or Leak Fault", severity: "Medium", baseProbability: 40, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "ac_deplete", name: "A/C Refrigerant Depletion", severity: "Low", baseProbability: 60, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "steer_align", name: "Wheel Alignment Issue", severity: "Low", baseProbability: 50, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "steer_susp", name: "Suspension Component Wear", severity: "Medium", baseProbability: 50, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "brake_rotor", name: "Brake Rotor or Caliper Fault", severity: "High", baseProbability: 40, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "brake_pad", name: "Brake Pad Depletion", severity: "High", baseProbability: 70, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "start_alt", name: "Alternator or Starter Failure", severity: "High", baseProbability: 40, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "start_bat", name: "Battery Degradation", severity: "Medium", baseProbability: 70, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "trans_valve", name: "Transmission Valve Body Fault", severity: "High", baseProbability: 30, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "trans_fluid", name: "Transmission Fluid Degradation", severity: "High", baseProbability: 60, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "eng_ign", name: "Ignition System Misfire", severity: "Medium", baseProbability: 60, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 },
    { id: "eng_fuel", name: "Fuel Delivery Issue", severity: "Medium", baseProbability: 40, supportedBy: [], contradictedBy: [], eliminated: false, confidenceContribution: 0 }
  ];

  // Evaluate against observations
  observations.forEach(obs => {
    const val = obs.value;

    // AC
    if (val.includes("ac ") || val.includes("cool") || val.includes("air")) {
      candidates.find(c => c.id === "ac_leak")!.supportedBy.push(obs);
      candidates.find(c => c.id === "ac_deplete")!.supportedBy.push(obs);
    }
    if (obs.type === 'maintenance' && (val.includes("recharg") || val.includes("refill") || val.includes("freon"))) {
      candidates.find(c => c.id === "ac_deplete")!.contradictedBy.push(obs);
      candidates.find(c => c.id === "ac_leak")!.supportedBy.push(obs);
    }

    // Steering/Suspension
    if (val.includes("steer") || val.includes("pull") || val.includes("vibrat") || val.includes("align")) {
      candidates.find(c => c.id === "steer_align")!.supportedBy.push(obs);
      candidates.find(c => c.id === "steer_susp")!.supportedBy.push(obs);
    }
    if (obs.type === 'maintenance' && (val.includes("tire") || val.includes("wheel"))) {
      candidates.find(c => c.id === "steer_align")!.supportedBy.push(obs);
    }
    if (obs.type === 'condition' && (val.includes("pothole") || val.includes("bump"))) {
      candidates.find(c => c.id === "steer_susp")!.supportedBy.push(obs);
      candidates.find(c => c.id === "steer_align")!.supportedBy.push(obs);
    }

    // Brakes
    if (val.includes("brake") || val.includes("squeak") || val.includes("grind") || val.includes("stop")) {
      candidates.find(c => c.id === "brake_rotor")!.supportedBy.push(obs);
      candidates.find(c => c.id === "brake_pad")!.supportedBy.push(obs);
    }
    if (obs.type === 'maintenance' && (val.includes("pad") || val.includes("brake"))) {
      candidates.find(c => c.id === "brake_pad")!.contradictedBy.push(obs);
      candidates.find(c => c.id === "brake_rotor")!.supportedBy.push(obs);
    }

    // Starting
    if (val.includes("start") || val.includes("crank") || val.includes("click") || val.includes("battery")) {
      candidates.find(c => c.id === "start_alt")!.supportedBy.push(obs);
      candidates.find(c => c.id === "start_bat")!.supportedBy.push(obs);
    }
    if (obs.type === 'maintenance' && (val.includes("jump") || val.includes("battery"))) {
      candidates.find(c => c.id === "start_bat")!.contradictedBy.push(obs);
      candidates.find(c => c.id === "start_alt")!.supportedBy.push(obs);
    }

    // Transmission
    if (val.includes("shift") || val.includes("gear") || val.includes("trans")) {
      candidates.find(c => c.id === "trans_valve")!.supportedBy.push(obs);
      candidates.find(c => c.id === "trans_fluid")!.supportedBy.push(obs);
    }
    if (obs.type === 'maintenance' && val.includes("fluid")) {
      candidates.find(c => c.id === "trans_fluid")!.contradictedBy.push(obs);
      candidates.find(c => c.id === "trans_valve")!.supportedBy.push(obs);
    }

    // Engine
    if (val.includes("engine") || val.includes("idle") || val.includes("stall") || val.includes("misfire") || val.includes("rough")) {
      candidates.find(c => c.id === "eng_ign")!.supportedBy.push(obs);
      candidates.find(c => c.id === "eng_fuel")!.supportedBy.push(obs);
    }
  });

  return candidates;
}

function reasonOverEvidencePipeline(candidates: CandidateDiagnosis[]): CandidateDiagnosis[] {
  // Eliminate candidates with direct contradictions
  candidates.forEach(c => {
    if (c.contradictedBy.length > 0) {
      c.eliminated = true;
      c.eliminationReason = `contradicted by ${c.contradictedBy[0].value}`;
      c.confidenceContribution = -20;
    } else if (c.supportedBy.length > 0) {
      c.confidenceContribution = 20 + (c.supportedBy.length * 10);
    }
  });

  // Filter to only those with support
  let viable = candidates.filter(c => c.supportedBy.length > 0);

  if (viable.length === 0) {
    viable = [{
      id: "mech_general",
      name: "Drivetrain or Component Failure",
      severity: "Medium",
      baseProbability: 50,
      supportedBy: [],
      contradictedBy: [],
      eliminated: false,
      confidenceContribution: 10
    }];
  }

  // Sort by combination of base probability and confidence contribution
  viable.sort((a, b) => {
    const scoreA = a.eliminated ? 0 : a.baseProbability + a.confidenceContribution;
    const scoreB = b.eliminated ? 0 : b.baseProbability + b.confidenceContribution;
    return scoreB - scoreA;
  });

  return viable;
}

function calculateConfidence(state: ReasoningState): number {
  let confidence = 70; // Base baseline

  if (state.mostProbable) {
    // Increase for multiple supporting observations
    if (state.mostProbable.supportedBy.length > 1) confidence += 15;

    // Increase if alternative was explicitly eliminated
    const eliminatedAlts = state.candidates.filter(c => c.eliminated && c.id.split('_')[0] === state.mostProbable!.id.split('_')[0]);
    if (eliminatedAlts.length > 0) confidence += 10;
  }

  // Decrease if too many viable alternatives remain in the same category
  const viableAlts = state.candidates.filter(c => !c.eliminated);
  if (viableAlts.length > 1) {
    confidence -= (viableAlts.length - 1) * 5;
  }

  // Cap at 98, floor at 40
  return Math.max(40, Math.min(98, confidence));
}

function generateNaturalSummary(state: ReasoningState): string {
  const primary = state.mostProbable;
  if (!primary) return "There is not enough specific evidence to pinpoint a single component failure.";

  const hasAddInfo = state.observations.some(o => o.source === 'additional_info');
  const addInfoObs = state.observations.find(o => o.source === 'additional_info');

  const eliminatedAlt = state.candidates.find(c => c.eliminated && c.id.split('_')[0] === primary.id.split('_')[0]);

  let summary = "";

  // Introduction based on evidence
  if (eliminatedAlt && hasAddInfo) {
    summary += `Looking at the new information provided (${addInfoObs?.value}), we can likely rule out a simple ${eliminatedAlt.name.toLowerCase()}. `;
    summary += `Since the symptoms persist despite that, the issue is highly likely a ${primary.name.toLowerCase()}. `;
  } else if (primary.supportedBy.length > 1) {
    summary += `The combination of the reported symptoms strongly aligns with a ${primary.name.toLowerCase()}. `;
  } else {
    summary += `Based on the primary symptom, this appears to be a ${primary.name.toLowerCase()}. `;
  }

  // Reasoning body
  if (primary.id.includes("ac_leak")) summary += "When the system is recharged but loses cooling again, it confirms a physical breach in the pressurized lines or a failing compressor seal rather than just normal depletion. ";
  if (primary.id.includes("steer_align")) summary += "Vibrations or pulling that coincide with tire changes or impacts usually point to the geometry of the wheels being knocked out of spec. ";
  if (primary.id.includes("brake_rotor")) summary += "Since the pads are relatively new, the persistent noise or vibration is typically caused by warped rotors or a caliper piston failing to retract completely. ";
  if (primary.id.includes("start_alt")) summary += "If the battery has been replaced or jumped and starting issues remain, the alternator is likely failing to generate the voltage needed to keep the system charged. ";
  if (primary.id.includes("trans_valve")) summary += "Fresh fluid should resolve minor shifting hesitation; if it doesn't, the internal valve body or shift solenoids are likely sticking under pressure. ";

  // Conclusion / Next Steps
  summary += "To confirm this, ";
  if (primary.id.includes("ac")) summary += "a UV dye test and pressure check should be performed on the A/C lines.";
  else if (primary.id.includes("steer")) summary += "a technician should check the suspension bushings and put the vehicle on an alignment rack.";
  else if (primary.id.includes("brake")) summary += "the rotor runout should be measured and the caliper slide pins inspected for binding.";
  else if (primary.id.includes("start")) summary += "a full charging system test (measuring alternator output under load) is required.";
  else if (primary.id.includes("trans")) summary += "a diagnostic scan of the transmission control module and a line pressure test are the best next steps.";
  else summary += "a hands-on physical inspection of the system is the logical next step.";

  return summary;
}

function DiagnoseResultsScreen({
  issueText,
  answerSummaryItems,
  activeCategory,
  resultIssues,
  selectedIssues,
  detailsText,
  onDetailsTextChange,
  onToggleIssue,
  onEditIssue,
  onRequestQuotes,
  selectedVehicle,
  nextSteps,
  confidenceScore,
  onRegenerateDiagnosis,
  diyType = 'none',
}: DiagnoseResultsScreenProps) {
  const selectedCount = selectedIssues.length;
  const detailsTabs = ['Text Details', 'Photo', 'Video', 'Audio'];
  const [activeIssueDetails, setActiveIssueDetails] =
    useState<DiagnosticIssueResult | null>(null);
  const resultSummaryItems = getResultSummaryItems(
    activeCategory,
    resultIssues
  );

  const primaryLLMIssue = resultIssues[0];
  const [diagnosisState, setDiagnosisState] = useState({
    primaryIssue: primaryLLMIssue ? primaryLLMIssue.title : "Diagnosis Pending",
    severity: primaryLLMIssue?.risks?.[0] || "Medium",
    confidence: confidenceScore ? `${confidenceScore}%` : "85%",
    summary: primaryLLMIssue?.description || "WrectifAI has identified potential issues.",
    symptoms: answerSummaryItems.map(item => item.value),
    isRefined: false,
  });
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDiyDrawerOpen, setIsDiyDrawerOpen] = useState(false);
  const [showCallSupport, setShowCallSupport] = useState(false);
  const [showRoadside, setShowRoadside] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => {
      setCopiedText('');
    }, 2000);
  };

  useEffect(() => {
    if (resultIssues[0]) {
      setDiagnosisState(prev => ({
        ...prev,
        primaryIssue: resultIssues[0].title,
        severity: resultIssues[0].risks?.[0] || "Medium",
        summary: resultIssues[0].description || "WrectifAI has identified potential issues."
      }));
      setIsRegenerating(false);
      setAdditionalNotes('');
    }
  }, [resultIssues]);

  const handleRegenerateDiagnosis = async () => {
    if (!additionalNotes.trim()) return;
    setIsRegenerating(true);
    if (onRegenerateDiagnosis) {
      setDiagnosisState(prev => ({ ...prev, isRefined: true }));
      try {
        await onRegenerateDiagnosis(additionalNotes);
      } catch (err) {
        setIsRegenerating(false);
      }
    } else {
      setIsRegenerating(false);
    }
  };
  return (
    <div className="space-y-5 pb-6">
      <IssueDetailsModal
        issue={activeIssueDetails}
        onClose={() => setActiveIssueDetails(null)}
        vehicleImageSrc={selectedVehicle?.image || getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)}
      />
      <div>
        <div>
          <h1 className={homeHeroHeadingClass}>WrectifAI Diagnosis Results</h1>
          <p className="mt-1 text-[12px] text-[#5f7099]">
            Smart diagnosis, clear insights, and the next best steps for your
            car
          </p>
        </div>
      </div>

      <Card className="rounded-[22px] border-[#e6ecfb] bg-white px-6 py-4 shadow-[0_12px_28px_rgba(37,73,153,0.04)] overflow-y-auto [scrollbar-width:thin]">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className={homeSectionHeadingClass}>Your Issue</div>

            <div className="mt-3">
              <div className="text-[14.5px] font-bold text-[#17307a]">{diagnosisState.primaryIssue}</div>
              {diagnosisState.isRefined && (
                <div className="mt-1 text-[11px] font-semibold text-[#25a24a] flex items-center gap-1">
                  ✓ Refined using your additional information
                </div>
              )}
              <div className="mt-1.5 flex gap-2">
                <span className="rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-[11px] font-bold text-[#b54708]">Severity: {diagnosisState.severity}</span>
                <span className="rounded-full bg-[#e8f8eb] px-2.5 py-0.5 text-[11px] font-bold text-[#25a24a]">Confidence: {diagnosisState.confidence}</span>
              </div>
              <div className="mt-4">
                <div className="text-[14.5px] font-bold text-[#17307a]">Why this diagnosis?</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#4c5f8f]">
                  {diagnosisState.summary}
                </p>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {diagnosisState.symptoms.map((sym, index) => (
                  <span key={`${sym}-${index}`} className="rounded-md bg-[#f4f7ff] px-2.5 py-1 text-[11.5px] font-medium text-[#1a56db]">{sym}</span>
                ))}
              </div>


            </div>



            <div className="mt-4 border-t border-[#e6ecfb] pt-3">
              <label className="text-[14.5px] font-bold text-[#17307a]">Additional Information</label>
              <p className="mt-0.5 text-[12.5px] text-[#6b7ba5]">Add any new observations not covered in the original questionnaire.</p>
              <textarea
                className="mt-2.5 w-full rounded-xl border border-[#dbe6ff] p-3 text-[13.5px] text-[#17307a] focus:border-[#1a56db] focus:ring-1 focus:ring-[#1a56db] focus:outline-none placeholder:text-[#8ea0c7] transition-all resize-y"
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="e.g. Issue started after hitting a pothole"
              />
              <div className="mt-3 flex flex-wrap gap-2.5 pb-1">
                <button type="button" onClick={handleRegenerateDiagnosis} disabled={isRegenerating || !additionalNotes.trim()} className="inline-flex h-[36px] items-center justify-center rounded-[10px] bg-[#1a56db] px-4 text-[13px] font-semibold text-white hover:bg-[#17307a] transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                  {isRegenerating ? 'Regenerating...' : 'Regenerate Diagnosis'}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onEditIssue}
            className="shrink-0 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#dde6ff] px-5 text-[12px] font-semibold text-[#1a56db] transition-colors hover:bg-[#f8fbff]"
          >
            <PenLine className="h-4 w-4" />
            <span>Edit Issue</span>
          </button>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="rounded-[22px] border-[#e6ecfb] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className={homeSectionHeadingClass}>
                WrectifAI Diagnosis Summary
              </h2>
              <span className="rounded-full bg-[#e8f8eb] px-3 py-1 text-[11px] font-semibold text-[#25a24a]">
                Analysis completed in 8.4s
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center rounded-[14px] bg-[radial-gradient(circle_at_top,#f8faff_0%,#ffffff_70%)] border border-[#e8ecf8] px-4 py-4 text-center">
                <Image
                  src={selectedVehicle?.image || getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)}
                  alt="Car"
                  width={230}
                  height={132}
                  className="h-auto w-[180px] object-contain"
                  unoptimized={true}
                />
                <div className={cn('mt-3', homeCardHeadingClass)}>
                  {selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : 'Honda City (TS07 AB 1234)'}
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-left text-[11px] text-[#5f7099]">
                  <span>{selectedVehicle?.vin ? 'VIN' : 'Petrol'}</span>
                  <span className="font-mono truncate max-w-[80px]">{selectedVehicle?.vin ? selectedVehicle.vin.slice(-6) : '2018'}</span>
                  <span className="col-span-2">
                    {selectedVehicle?.mileage !== undefined && selectedVehicle?.mileage !== null
                      ? `Mileage: ${selectedVehicle.mileage.toLocaleString()} mi`
                      : 'KM Driven: 58,320 km'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-center text-[11px] text-[#5f7099] lg:text-left">
                  WrectifAI analysis indicates potential issues that need
                  immediate attention.
                </p>
                <div className="mt-4 space-y-4">
                  {resultSummaryItems.map(
                    ({
                      title,
                      heading,
                      body,
                      pill,
                      pillClass,
                      icon: Icon,
                      iconClass,
                    }) => (
                      <div key={title} className="flex items-start gap-3">
                        <span
                          className={cn(
                            'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                            iconClass
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-[#5f7099]">
                            {title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <div className={homeCardHeadingClass}>
                              {heading}
                            </div>
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                pillClass
                              )}
                            >
                              {pill}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] leading-5 text-[#5f7099]">
                            {body}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[22px] border-[#e6ecfb] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={homeSectionHeadingClass}>Top Possible Issues</h2>
                <span className="text-[11px] text-[#5f7099]">
                  (Select one or more to request quotes)
                </span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#1a56db]"
              >
                <Info className="h-3.5 w-3.5" />
                <span>Understand Results</span>
              </button>
            </div>

            <div className="mt-4 divide-y divide-[#edf1fb]">
              {resultIssues.map((issue, index) => {
                const checked = selectedIssues.includes(issue.id);
                return (
                  <div
                    key={issue.id}
                    className="grid gap-3 py-4 md:grid-cols-[24px_64px_minmax(0,1fr)_80px_102px] md:items-center"
                  >
                    <label className="flex items-start justify-center pt-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleIssue(issue.id)}
                        className="h-4.5 w-4.5 rounded border-[#cdd9fb] text-[#2551f6] focus:ring-[#2551f6]"
                      />
                    </label>
                    <div className="flex justify-center md:justify-start">
                      <IssueVisual issue={issue} size={56} vehicleImageSrc={selectedVehicle?.image || getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={homeCardHeadingClass}>
                          {index + 1}. {issue.title}
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                            issue.badgeClass
                          )}
                        >
                          {issue.badge}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-5 text-[#5f7099]">
                        {issue.description}
                      </p>
                      <div className="mt-2.5 text-[11px] font-semibold text-[#17307a]">
                        Risk if ignored:
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#5f7099]">
                        {issue.risks.map((risk) => (
                          <span key={risk}>• {risk}</span>
                        ))}
                      </div>
                      <div className="mt-2.5 text-[11px] text-[#5f7099]">
                        <span className="font-semibold text-[#17307a]">
                          Estimated Cost:
                        </span>{' '}
                        <span>{issue.estimatedCost}</span>
                      </div>
                    </div>
                    <div className="text-left md:text-center">
                      <div className="text-[20px] font-semibold tracking-[-0.03em] text-[#1a56db]">
                        {issue.match}%
                      </div>
                      <div className="text-[11px] text-[#5f7099]">Match</div>
                    </div>
                    <div className="flex items-center md:justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveIssueDetails(issue)}
                        className="inline-flex h-9 items-center justify-center rounded-[12px] border border-[#dde6ff] px-3.5 text-[12px] font-semibold text-[#1a56db] transition-colors hover:bg-[#f8fbff]"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="rounded-[22px] border-[#e6ecfb] bg-white px-4 py-4 text-center shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
            <h3 className={homeCardHeadingClass}>Diagnosis Confidence</h3>
            <div className="mt-3">
              <ConfidenceGauge value={confidenceScore ?? 92} />
            </div>
            <p className="mx-auto mt-2 max-w-[180px] text-[11px] leading-5 text-[#5f7099]">
              Based on WrectifAI analysis of your issue description and
              thousands of similar cases.
            </p>
          </Card>

          <Card className="rounded-[22px] border-[#ffe4e2] bg-[linear-gradient(180deg,#fff8f7_0%,#fffdfd_100%)] px-4 py-6 shadow-[0_12px_30px_rgba(255,102,102,0.06)]">
            <h3 className={homeCardHeadingClass}>Need Immediate Help?</h3>
            <p className="mt-3 text-[11px] leading-6 text-[#5f7099]">
              Talk to our experts or get roadside assistance
            </p>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => setShowCallSupport(true)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#dde6ff] bg-white text-[12px] font-semibold text-[#1a56db] hover:bg-slate-50 transition-colors"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Call Support</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRoadside(true)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#dde6ff] bg-white text-[12px] font-semibold text-[#1a56db] hover:bg-slate-50 transition-colors"
              >
                <Headset className="h-4 w-4" />
                <span>Roadside Assistance</span>
              </button>
            </div>
            <div className="mt-4 inline-flex rounded-full bg-[#ffe8e7] px-3 py-1 text-[11px] font-semibold text-[#ff584d]">
              24/7 Available
            </div>
          </Card>
        </div>
      </div>

      <Card className="rounded-[22px] border-[#e6ecfb] bg-[linear-gradient(180deg,#fbfcff_0%,#ffffff_100%)] px-6 py-4 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f2f5ff] text-[#365ff1]">
              <ShieldCheck className="h-5.5 w-5.5" />
            </span>
            <div>
              <div className={homeCardHeadingClass}>
                Ready to get the best quotes from trusted garages?
              </div>
              <p className="mt-1 text-[11px] text-[#5f7099]">
                Send your selected issues and compare the best offers.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsDiyDrawerOpen(true)}
                className="flex h-[46px] items-center justify-center gap-2 rounded-[12px] bg-white border border-[#dbe6ff] px-6 text-[12.5px] font-bold text-[#17307a] shadow-[0_4px_12px_rgba(37,73,153,0.04)] transition-all hover:bg-[#f4f7ff] hover:border-[#1a56db] hover:text-[#1a56db]"
              >
                <Wrench className="h-4.5 w-4.5" />
                <span>Get DIY Guide</span>
              </button>
              <button
                type="button"
                onClick={onRequestQuotes}
                className="flex h-[46px] items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(90deg,#1a46e8_0%,#245cff_100%)] px-6 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(37,82,235,0.18)] transition-transform hover:scale-[1.01]"
              >
                <Send className="h-4.5 w-4.5" />
                <span>Request Quotes ({selectedCount})</span>
              </button>
            </div>
            <div className="text-[11px] text-[#5f7099]">
              You will receive quotes within 30 mins
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 rounded-[22px] border border-[#e6ecfb] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(37,73,153,0.04)] md:grid-cols-2 xl:grid-cols-4">
        {resultTrustItems.map(({ title, description, icon: Icon }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f7ff] text-[#3158e1]">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[15px] font-semibold text-[#2243a3]">
                {title}
              </div>
              <div className="mt-1 text-[13px] text-[#7586b0]">
                {description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DIY Centered Modal */}
      {isDiyDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDiyDrawerOpen(false)} />

          {(diyType === 'repair' || diyType === 'troubleshooting') && nextSteps && nextSteps.length > 0 ? (
            <div className="relative w-full max-w-2xl bg-white shadow-2xl rounded-[24px] flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[#e6ecfb] px-6 py-5 bg-white z-10 rounded-t-[24px]">
                <h2 className="text-[20px] font-bold text-[#17307a]">
                  {diyType === 'troubleshooting' ? 'Troubleshooting Guide' : 'DIY Guide'}
                </h2>
                <button onClick={() => setIsDiyDrawerOpen(false)} className="rounded-full p-2 text-[#5f7099] hover:bg-[#f4f7ff] hover:text-[#1a56db] transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="mb-6 rounded-[16px] border border-[#dbe6ff] bg-[#fbfcff] p-5">
                  <div className="flex items-center gap-2 font-bold text-[#17307a] mb-2">
                    <Wrench className="h-4.5 w-4.5 text-[#1a56db]" /> Before you start
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#4c5f8f]">
                    Please ensure you have the proper tools and a safe working environment. If you feel uncomfortable at any point, we strongly recommend requesting quotes from trusted garages instead.
                  </p>
                </div>

                <h3 className="text-[16px] font-bold text-[#17307a] mb-5">Step-by-step Instructions</h3>
                <div className="space-y-6">
                  {nextSteps.map((step) => (
                    <div key={step.step} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f7ff] text-[13px] font-bold text-[#1a56db]">
                        {step.step}
                      </div>
                      <div>
                        <div className="text-[14.5px] font-bold text-[#17307a]">{step.title}</div>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#4c5f8f]">
                          {step.body}
                        </p>
                        {step.meta && (
                          <div className="mt-2.5 text-[11.5px] font-bold text-[#1a56db] bg-[#f4f7ff] inline-block px-2.5 py-1 rounded-md">
                            {step.meta}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-md bg-white shadow-2xl rounded-[24px] flex flex-col animate-in zoom-in-95 duration-200 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4e5] text-[#b54708] mb-4">
                <Wrench className="h-6 w-6" />
              </div>
              <h2 className="text-[20px] font-bold text-[#17307a] mb-2">DIY Repair Not Recommended</h2>
              <p className="text-[14px] leading-relaxed text-[#4c5f8f] mb-6">
                This issue requires professional diagnosis, specialised tools or safety procedures and is not recommended for self-repair.
                <br /><br />
                Please visit a trusted garage for professional inspection and repair.
              </p>
              <button
                type="button"
                onClick={() => setIsDiyDrawerOpen(false)}
                className="flex h-[46px] w-full items-center justify-center rounded-[12px] bg-[#f4f7ff] px-6 text-[13.5px] font-bold text-[#1a56db] hover:bg-[#e6ecfb] transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* Call Support Modal */}
      {showCallSupport && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-[24px] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
              <PhoneCall className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17307a] mb-2">Call Support</h3>
            <p className="text-xs text-[#5f7099] leading-relaxed mb-6">
              Our support helpline is available 24/7. Call us for any assistance with your vehicle or quotes.
            </p>
            <div className="bg-[#f4f7ff] p-3 rounded-[12px] text-[#1a56db] font-bold text-lg tracking-wide mb-3">
              +1 (800) 555-0199
            </div>
            <div className="h-6 mb-3 flex items-center justify-center">
              {copiedText === 'support' && (
                <p className="text-[11px] text-green-600 font-semibold animate-in fade-in duration-200">
                  ✓ Number copied to clipboard!
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCallSupport(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-slate-100 text-[12px] font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleCopy('+1 (800) 555-0199', 'support')}
                className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-[#1a56db] text-[12px] font-bold text-white hover:bg-[#17307a] transition-colors"
              >
                {copiedText === 'support' ? 'Copied!' : 'Copy Number'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roadside Assistance Modal */}
      {showRoadside && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-[24px] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17307a] mb-2">Roadside Assistance</h3>
            <p className="text-xs text-[#5f7099] leading-relaxed mb-6">
              Need immediate towing or roadside help? Speak to our emergency response dispatch service now.
            </p>
            <div className="bg-[#fff1f1] p-3 rounded-[12px] text-red-600 font-bold text-lg tracking-wide mb-3">
              +1 (800) 555-0244
            </div>
            <div className="h-6 mb-3 flex items-center justify-center">
              {copiedText === 'roadside' && (
                <p className="text-[11px] text-green-600 font-semibold animate-in fade-in duration-200">
                  ✓ Number copied to clipboard!
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowRoadside(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-slate-100 text-[12px] font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleCopy('+1 (800) 555-0244', 'roadside')}
                className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-red-600 text-[12px] font-bold text-white hover:bg-red-700 transition-colors"
              >
                {copiedText === 'roadside' ? 'Copied!' : 'Copy Number'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type FindingQuotesScreenProps = {
  resultIssues: DiagnosticIssueResult[];
  selectedIssues: string[];
  onBack: () => void;
  selectedVehicle?: Vehicle | null;
};

function FindingQuotesScreen({
  resultIssues,
  selectedIssues,
  onBack,
  selectedVehicle,
}: FindingQuotesScreenProps) {
  const chosenIssues = resultIssues.filter((issue) =>
    selectedIssues.includes(issue.id)
  );
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep < 4) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      router.push(`/request-aent?issues=${selectedIssues.join(',')}`);
    }
  }, [currentStep, selectedIssues, router]);

  return (
    <div className="space-y-5 pb-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-[#2f54d1] transition-colors hover:text-[#163cb3]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to WrectifAI Diagnosis Results</span>
        </button>
      </div>

      <div className="rounded-[24px] px-4 py-4">
        <div className="mx-auto max-w-[760px] text-center">
          <h1 className={homeHeroHeadingClass}>
            Finding the best garages for you...
          </h1>
          <p className="mt-2 text-[12px] text-[#5f7099]">
            This will only take a few seconds
          </p>

          <div className="relative mx-auto mt-8 h-[210px] w-[390px] max-w-full">
            <div className="absolute inset-x-1/2 top-0 h-[124px] w-[124px] -translate-x-1/2 rounded-[26px] border border-[#cfe0ff] bg-[radial-gradient(circle_at_top,#ffffff_0%,#edf3ff_78%)] shadow-[0_16px_40px_rgba(44,92,255,0.12)]">
              <div className="absolute inset-0 rounded-[26px] border border-[#edf3ff]" />
              <div className="absolute inset-[13px] rounded-[18px] border-2 border-dashed border-[#b6cbff]" />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Image
                  src="/Logo_noBg.png"
                  alt="WrectifAI Logo"
                  width={80}
                  height={80}
                  priority
                  className="object-contain"
                  style={{ width: '80px', height: 'auto' }}
                />
              </div>
            </div>
            <div className="absolute left-1/2 top-[92px] h-[95px] w-[320px] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(74,121,255,0.16)_0%,rgba(74,121,255,0)_72%)] blur-md" />
            <div className="absolute left-1/2 top-[106px] -translate-x-1/2">
              <div className="relative z-10 flex h-full items-center justify-center">
                <Image
                  src={selectedVehicle?.image || getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)}
                  alt="Car"
                  width={420}
                  height={180}
                  className="h-auto w-[380px] object-contain drop-shadow-[0_16px_24px_rgba(28,74,188,0.25)] mix-blend-multiply"
                  style={{ width: '380px', height: 'auto' }}
                  unoptimized={true}
                />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 hidden md:block">
              <div className="absolute left-[20px] top-[86px] h-px w-[98px] bg-[#d7e3ff]" />
              <div className="absolute right-[20px] top-[86px] h-px w-[98px] bg-[#d7e3ff]" />
              <div className="absolute left-[48px] top-[72px] h-2 w-2 rounded-full bg-[#bfd1ff]" />
              <div className="absolute left-[82px] top-[120px] h-1.5 w-1.5 rounded-full bg-[#bfd1ff]" />
              <div className="absolute right-[54px] top-[68px] h-2 w-2 rounded-full bg-[#bfd1ff]" />
              <div className="absolute right-[86px] top-[124px] h-1.5 w-1.5 rounded-full bg-[#bfd1ff]" />
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-[22px] border-[#e7edfd] bg-white px-5 py-0 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
        <div className="grid md:grid-cols-4">
          {[
            { label: 'Analyzing your issue' },
            { label: 'Finding nearby trusted garages' },
            { label: 'Matching with best service providers' },
            { label: 'Sending your request' },
          ].map((step, index) => {
            const isComplete = index < currentStep;
            const isActive = index === currentStep;
            return (
              <div
                key={step.label}
                className={cn(
                  'flex items-center gap-4 px-5 py-7',
                  index < 3
                    ? 'border-b border-[#eef2ff] md:border-b-0 md:border-r md:border-[#eef2ff]'
                    : ''
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300',
                    isComplete
                      ? 'border-[#17884f] bg-[#17884f] text-white'
                      : isActive
                        ? 'border-[#2351f6] bg-white text-[#2351f6]'
                        : 'border-[#7d85ba] bg-white text-transparent'
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <span className="h-3 w-3 rounded-full bg-current" />
                  )}
                </span>
                <div
                  className={cn(
                    'text-[12px] font-semibold transition-colors duration-300',
                    isActive ? 'text-[#1a56db]' : 'text-[#17307a]'
                  )}
                >
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-[20px] border-[#e7edfd] bg-[linear-gradient(180deg,#fbfcff_0%,#ffffff_100%)] px-6 py-5 shadow-[0_12px_28px_rgba(37,73,153,0.04)]">
        <div className="flex items-center justify-center gap-3 text-center text-[12px] font-semibold text-[#1a56db]">
          <ShieldCheck className="h-5 w-5" />
          <span>
            We share your request only with verified and trusted garages.
          </span>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[254px_minmax(0,1fr)_390px]">
        <Card className="rounded-[22px] border-[#e7edfd] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
          <h3 className={homeSectionHeadingClass}>Your Vehicle</h3>
          <div className="mt-10 flex flex-col items-center text-center">
            <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#f5f8ff_0%,#edf2ff_100%)] text-[#244fe5] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <CarFront className="h-11 w-11" />
            </span>
            <div className={cn('mt-8', homeCardHeadingClass)}>
              {selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : 'Honda City (TS07 AB 1234)'}
            </div>
            <div className="mt-5 flex items-center gap-4 text-[11px] text-[#5f7099]">
              <span>{selectedVehicle?.vin ? 'VIN' : 'Petrol'}</span>
              <span className="h-1 w-1 rounded-full bg-[#8997bc]" />
              <span className="font-mono">{selectedVehicle?.vin ? selectedVehicle.vin.slice(-6) : '2018'}</span>
            </div>
            <div className="mt-4 text-[11px] text-[#5f7099]">
              {selectedVehicle?.mileage !== undefined && selectedVehicle?.mileage !== null
                ? `Mileage: ${selectedVehicle.mileage.toLocaleString()} mi`
                : 'KM Driven: 58,320 km'}
            </div>
          </div>
        </Card>

        <Card className="rounded-[22px] border-[#e7edfd] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
          <div className="flex items-center gap-3">
            <h3 className={homeSectionHeadingClass}>Your Selected Issues</h3>
            <span className="text-[11px] text-[#5f7099]">
              ({chosenIssues.length} Selected)
            </span>
          </div>
          <div className="mt-5 divide-y divide-[#edf2fb]">
            {chosenIssues.map((issue, index) => (
              <div
                key={issue.id}
                className="grid gap-4 py-5 md:grid-cols-[76px_minmax(0,1fr)_92px] md:items-center"
              >
                <div className="flex justify-center md:justify-start">
                  <Image
                    src={selectedVehicle?.image || getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)}
                    alt={issue.title}
                    width={72}
                    height={72}
                    className="h-[66px] w-[66px] object-contain"
                    style={{ width: '66px', height: '66px' }}
                    unoptimized={true}
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={homeCardHeadingClass}>
                      {index + 1}. {issue.title}
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        issue.badgeClass
                      )}
                    >
                      {issue.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-6 text-[#5f7099]">
                    {issue.description}
                  </p>
                </div>
                <div className="text-left md:text-center">
                  <div className="text-[32px] font-semibold tracking-[-0.05em] text-[#1a56db]">
                    {issue.match}%
                  </div>
                  <div className="text-[11px] text-[#5f7099]">Match</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[22px] border-[#e7edfd] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
          <h3 className={homeSectionHeadingClass}>What&apos;s Happening?</h3>
          <div className="mt-8 space-y-7">
            {[
              { title: 'Analyzing your issue' },
              { title: 'Finding nearby trusted garages' },
              { title: 'Matching with best service providers' },
              { title: 'Sending your request' },
            ].map((step, index, array) => {
              const isComplete = index < currentStep;
              const isActive = index === currentStep;
              const status = isComplete
                ? 'Completed'
                : isActive
                  ? 'In progress'
                  : 'Pending';
              return (
                <div key={step.title} className="relative flex gap-4">
                  {index < array.length - 1 ? (
                    <div className="absolute left-[13px] top-[32px] h-[34px] w-px border-l border-dashed border-[#d8e4ff]" />
                  ) : null}
                  <span
                    className={cn(
                      'relative z-10 mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300',
                      isComplete
                        ? 'border-[#17884f] bg-[#17884f] text-white'
                        : isActive
                          ? 'border-[#2351f6] bg-white text-[#2351f6]'
                          : 'border-[#707ab3] bg-white text-transparent'
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    )}
                  </span>
                  <div>
                    <div className={homeCardHeadingClass}>{step.title}</div>
                    <div
                      className={cn(
                        'mt-2 text-[11px] font-medium transition-colors duration-300',
                        isComplete
                          ? 'text-[#5f7099]'
                          : isActive
                            ? 'text-[#1a56db]'
                            : 'text-[#7f8db3]'
                      )}
                    >
                      {status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 rounded-[22px] border border-[#e6ecfb] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(37,73,153,0.04)] md:grid-cols-2 xl:grid-cols-4">
        {resultTrustItems.map(({ title, description, icon: Icon }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f7ff] text-[#3158e1]">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className={homeCardHeadingClass}>{title}</div>
              <div className="mt-1 text-[11px] text-[#5f7099]">
                {description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type IntentCategory = 'component' | 'system' | 'symptom' | 'maintenance' | 'warning_light' | 'operating_condition' | 'timing' | 'environmental' | 'recent_event' | 'unknown';

type ExtractedEntity = {
  category: IntentCategory;
  value: string;
};

const ENTITY_DICTIONARY: Record<string, string[]> = {
  component: ['radiator', 'thermostat', 'battery', 'alternator', 'spark plug', 'brake pad', 'compressor', 'fuel pump', 'rotor', 'caliper', 'tire', 'wheel', 'clutch', 'belt', 'hose', 'sensor'],
  system: ['engine', 'cooling', 'ac', 'brakes', 'steering', 'suspension', 'transmission', 'hvac', 'electrical', 'exhaust', 'fuel', 'ignition'],
  symptom: ['leak', 'overheat', 'squeak', 'grind', 'click', 'vibrat', 'pull', 'rough', 'idle', 'stall', 'misfire', 'hesitat', 'noise', 'smell', 'smoke', 'warm', 'cold', 'won\'t start', 'dead', 'shaking', 'knock', 'rattle', 'whine'],
  maintenance: ['replace', 'refill', 'recharge', 'flush', 'jump', 'new', 'service', 'fix', 'change', 'repair', 'rebuilt', 'swap'],
  warning_light: ['check engine', 'abs', 'battery light', 'oil', 'warning light', 'tpms', 'cel', 'mil', 'light on', 'flashing'],
  operating_condition: ['cold start', 'braking', 'acceleration', 'highway', 'speed', 'idle', 'turn', 'start', 'driving', 'stopping', 'cruising', 'load', 'uphill'],
  timing: ['morning', 'intermittent', 'constant', 'always', 'sometimes', 'every time', 'random', 'first thing', 'once a week', 'sporadic'],
  environmental: ['rain', 'wet', 'hot', 'cold', 'freezing', 'snow', 'weather', 'puddle', 'humid', 'dry'],
  recent_event: ['pothole', 'accident', 'crash', 'hit', 'bump', 'repair', 'curb', 'jumped', 'dead battery', 'tow']
};

function normalizeInput(text: string): string {
  return text.toLowerCase().trim().replace(/[.,!?;:]/g, '');
}

function extractEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  for (const [category, keywords] of Object.entries(ENTITY_DICTIONARY)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        entities.push({ category: category as IntentCategory, value: keyword });
      }
    }
  }

  if (entities.length === 0) {
    entities.push({ category: 'unknown', value: text });
  }
  return entities;
}

function determineMissingContext(entities: ExtractedEntity[], turns: number): { isSufficient: boolean, missing: IntentCategory[] } {
  const hasSymptom = entities.some(e => e.category === 'symptom' || e.category === 'warning_light');
  const hasCondition = entities.some(e => e.category === 'operating_condition' || e.category === 'timing' || e.category === 'environmental' || e.category === 'recent_event');

  const missing: IntentCategory[] = [];

  if (!hasSymptom) {
    missing.push('symptom');
  } else if (!hasCondition && turns < 2) {
    // Ask for condition if we have a symptom but no condition, up to a limit
    missing.push('operating_condition');
  }

  // It is sufficient if we have a symptom, and we've either collected condition/context or we've asked at least twice.
  const isSufficient = hasSymptom && (hasCondition || turns >= 2);

  return { isSufficient, missing };
}

function generateContextAwareFollowUp(missing: IntentCategory[], entities: ExtractedEntity[]): string {
  const components = entities.filter(e => e.category === 'component' || e.category === 'system').map(e => e.value);
  const symptoms = entities.filter(e => e.category === 'symptom' || e.category === 'warning_light').map(e => e.value);
  const maintenance = entities.filter(e => e.category === 'maintenance' || e.category === 'recent_event').map(e => e.value);

  if (missing.includes('symptom')) {
    if (components.length > 0) {
      return `I understand you're referring to the ${components[0]}. Could you describe exactly what it's doing? Are there any unusual noises, leaks, or performance issues?`;
    }
    if (maintenance.length > 0) {
      return `You mentioned a recent ${maintenance[0]}. What specific symptoms or problems have you noticed since then?`;
    }
    return `Could you provide more details about the symptoms you're experiencing? What exactly is the vehicle doing or not doing?`;
  }

  if (missing.includes('operating_condition')) {
    if (symptoms.length > 0) {
      return `You mentioned a ${symptoms[0]} issue. When exactly does this happen? Is it during acceleration, braking, idling, or at certain speeds?`;
    }
    return `To help me narrow this down, can you tell me under what conditions this happens? For example, during a cold start, turning, or on the highway?`;
  }

  return `Could you tell me a little more about when this issue happens or what you were doing when it started?`;
}

export function AIDiagnosePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const initialIssueParam = searchParams?.get('issue')?.trim() ?? '';
  const initialFlow = buildInitialFlow(initialIssueParam);
  const [pageLoadTime] = useState(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const hasInitialIssue = !!initialIssueParam;

  const [issueText, setIssueText] = useState(initialFlow.issueText);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    initialFlow.activeCategoryId
  );

  // Persist media across the whole session even when composer is cleared
  const sessionMediaRef = useRef<Array<{ mediaType: 'image' | 'video' | 'audio'; url: string; name: string }>>([]);

  const [messages, setMessages] = useState<ChatEntry[]>(() => {
    return [{
      id: 'msg-initial',
      sender: 'assistant',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      kind: 'message',
      text: initialFlow.introText,
      highlighted: true,
    }];
  });

  const [previousHistory, setPreviousHistory] = useState<ChatEntry[]>([]);

  // Load existing history once when vehicle changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const vId = selectedVehicleId || 'guest';

      const loadHistory = async () => {
        let savedHistory: ChatEntry[] = [];

        // 1. Try backend
        if (vId !== 'guest') {
          try {
            // Dynamically import to avoid circular dep or top-level await issues if any
            const { getChatHistory } = await import('../../lib/diagnosis-api');
            const res = await getChatHistory(vId);
            if (res?.messages && res.messages.length > 0) {
              savedHistory = res.messages;
            }
          } catch (e) {
            // Ignore API error
          }
        }

        // 2. Fallback to localStorage
        if (savedHistory.length === 0) {
          const saved = localStorage.getItem(`ai_chat_history_${vId}`);
          if (saved) {
            try {
              savedHistory = JSON.parse(saved);
            } catch (e) {
              savedHistory = [];
            }
          }
        }

        setPreviousHistory(savedHistory);

        // We intentionally do NOT restore sessionMediaRef from savedHistory.
        // The chat UI starts a fresh session, so we should not silently attach past images to new symptoms.
        sessionMediaRef.current = [];
      };

      loadHistory();
    }
  }, [selectedVehicleId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      // Only append and save if the user has actually interacted (messages > 1)
      if (messages.length === 1) return;

      const vId = selectedVehicleId || 'guest';
      // Combine all previous history with the entire current session
      const combined = [...previousHistory, ...messages];

      localStorage.setItem(`ai_chat_history_${vId}`, JSON.stringify(combined));

      // Fire-and-forget background sync to PostgreSQL (safe fallback)
      if (vId !== 'guest') {
        syncChatHistory(vId, combined).catch(err => {
          // Explicitly suppress to avoid UI errors/disruption
        });
      }
    }
  }, [messages, previousHistory, selectedVehicleId]);

  const [answers, setAnswers] = useState<AnswerMap>({});

  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('WrectifAI is thinking...');
  const [isDiagnosed, setIsDiagnosed] = useState(false);
  const [isFindingQuotes, setIsFindingQuotes] = useState(false);
  const [isAnalyzingResults, setIsAnalyzingResults] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [detailsText, setDetailsText] = useState('');

  // Dynamic Question Flow States
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(-1);
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, string>>({});
  const [hasStartedDiagnose, setHasStartedDiagnose] = useState<boolean>(false);
  const [hasFailedDiagnose, setHasFailedDiagnose] = useState<boolean>(false);
  const [accumulatedIntakeContext, setAccumulatedIntakeContext] = useState<string>('');
  const [clarificationTurns, setClarificationTurns] = useState<number>(0);

  // Custom API Integration States
  const [apiResult, setApiResult] = useState<DiagnosisResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [timerFinished, setTimerFinished] = useState(false);
  const [customResultIssues, setCustomResultIssues] = useState<DiagnosticIssueResult[] | null>(null);
  type MediaStatus = 'UPLOAD_PENDING' | 'UPLOAD_SUCCESS' | 'UPLOAD_FAILED' | 'VALIDATION_PENDING' | 'VALIDATION_SUCCESS' | 'VALIDATION_REJECTED' | 'VALIDATION_UNAVAILABLE' | 'AVAILABLE_FOR_DIAGNOSIS';

  interface AttachedMedia {
    id: string;
    mediaType: 'image' | 'video' | 'audio';
    file?: File;
    name: string;
    url?: string;
    previewUrl: string;
    status: MediaStatus;
    errorMessage?: string;
  }

  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const pageRootRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  // Ref that always holds the latest complete answers map — prevents race condition
  // where setDynamicAnswers() state flush lags behind setIsAnalyzingResults(true)
  const completedAnswersRef = useRef<Record<string, string>>({});

  // Derived progress and step states to prevent static stuck/inconsistent states
  const progress = useMemo(() => {
    if (isDiagnosed) return 100;
    if (isAnalyzingResults) return 90;
    if (!hasStartedDiagnose) return 0;

    // We have started diagnosis and are answering questions
    if (dynamicQuestions.length > 0 && currentQuestionIdx >= 0) {
      return 20 + Math.round((currentQuestionIdx / dynamicQuestions.length) * 60);
    }
    return 20;
  }, [isDiagnosed, isAnalyzingResults, hasStartedDiagnose, dynamicQuestions, currentQuestionIdx]);

  const stepTitle = useMemo(() => {
    if (progress === 100) return 'Analysis Complete!';
    if (progress === 90) return 'Synthesizing Details';
    if (!selectedVehicleId) return 'Select Vehicle';
    if (!hasStartedDiagnose) return 'Describe Symptom';
    return 'Identifying Issues';
  }, [progress, selectedVehicleId, hasStartedDiagnose]);

  const stepDesc = useMemo(() => {
    if (progress === 100) return 'Review the suggestions below.';
    if (progress === 90) return 'Preparing your diagnosis results...';
    if (!selectedVehicleId) return 'Please select a vehicle to start.';
    if (!hasStartedDiagnose) return 'Please describe your symptom to begin.';
    return 'Please answer the questions...';
  }, [progress, selectedVehicleId, hasStartedDiagnose]);

  const handleAnalysisComplete = useCallback(() => {
    setTimerFinished(true);
  }, []);

  const handleVehicleChange = useCallback((id: string, vehicle?: Vehicle) => {
    setSelectedVehicleId(id);
    if (vehicle) setSelectedVehicle(vehicle);
  }, []);

  useEffect(() => {
    const pageScroller = (() => {
      let node = pageRootRef.current?.parentElement ?? null;
      while (node) {
        if (node.scrollHeight > node.clientHeight) {
          return node;
        }
        node = node.parentElement;
      }
      return null;
    })();

    window.scrollTo({ top: 0, behavior: 'auto' });
    pageScroller?.scrollTo({ top: 0, behavior: 'auto' });
    chatScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const chatScroller = chatScrollRef.current;
    if (!chatScroller) return;
    chatScroller.scrollTo({
      top: chatScroller.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isTyping]);

  const startDiagnoseSession = async (vehicleId: string, symptom: string) => {
    const hasMedia = sessionMediaRef.current.length > 0;
    // Allow proceeding if we have media, even with a default symptom text
    if (!vehicleId || !symptom) return;
    if (!hasMedia && symptom === DEFAULT_ISSUE_TEXT) return;
    if (hasStartedDiagnose) return;

    setHasStartedDiagnose(true);
    setIsTyping(true);
    setTypingText('WrectifAI is fetching database matching issues...');

    try {
      const response = await submitDiagnosis({
        vehicleId,
        symptomText: symptom,
        media: sessionMediaRef.current.map(m => ({ mediaType: m.mediaType as 'image' | 'video' | 'audio', url: m.url! })),
        stage: 'questions',
      });

      interface QuestionsStageResponse {
        questions: Array<{ id: string; question: string; options: string[] }>;
        matchedIssues: Array<{ id: string; issue_name: string; safety_critical: boolean }>;
      }
      const resData = response as unknown as QuestionsStageResponse;
      setIsTyping(false);

      if (response && response.success === false) {
        throw new Error(response.message || 'API request failed');
      }

      if (!resData.questions || resData.questions.length === 0) {
        // Zero-Match Fallback should no longer occur with backend defaults, but if it does, synthesize immediately
        setIsAnalyzingResults(true);
        return;
      }

      setDynamicQuestions(resData.questions);
      setCurrentQuestionIdx(0);
      setDynamicAnswers({});
      completedAnswersRef.current = {};

      setMessages((prev) => [
        ...prev,
        {
          id: resData.questions[0].id || `dyn-q-0-${Date.now()}`,
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          kind: 'question',
          question: resData.questions[0].question,
          options: resData.questions[0].options,
          selected: '',
        },
      ]);
    } catch (err) {
      console.error('Failed to start diagnosis session:', err);
      setIsTyping(false);
      setHasStartedDiagnose(false);
      setHasFailedDiagnose(true);
      const errMessage = err instanceof Error ? err.message : 'Connection error';
      const errStatus = (err as any)?.status;
      const isUnavailable = errMessage.includes('temporarily unavailable') || errMessage.includes('AI diagnostic');
      const isAuthError = errStatus === 401 || errStatus === 403 || errMessage.toLowerCase().includes('session') || errMessage.toLowerCase().includes('log in');

      let displayMessage = 'I had trouble connecting. Please check your internet connection and try submitting your symptom again.';
      if (isAuthError) {
        displayMessage = 'Your session has expired or is invalid. Please log out and log back in, then try again.';
      } else if (isUnavailable) {
        displayMessage = 'The AI diagnostic service is temporarily unavailable. Please wait a moment and try submitting your symptom again.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          kind: 'message',
          text: displayMessage,
        },
      ]);
    }
  };

  // Triggers real API call when transitioning to analyzing state (Final Synthesis)
  useEffect(() => {
    if (isAnalyzingResults && !apiResult && !apiError) {
      const runApiDiagnosis = async () => {
        try {
          // Use the ref rather than state to guarantee all 5 answers are included,
          // even if the last setDynamicAnswers() flush hasn't committed yet.
          const allAnswers = Object.keys(completedAnswersRef.current).length > 0
            ? completedAnswersRef.current
            : dynamicAnswers;

          const payload = {
            vehicleId: selectedVehicleId || '00000000-0000-0000-0000-000000000002',
            symptomText: issueText,
            media: sessionMediaRef.current.map(m => ({ mediaType: m.mediaType as 'image' | 'video' | 'audio', url: m.url! })),
            intakeAnswers: {
              questions: dynamicQuestions.map(q => q.question),
              qas: allAnswers,
            },
            stage: 'final' as const,
          };

          const response = await submitDiagnosis(payload);
          if (response.success === false) {
            setApiError(response.message || "We couldn't generate the diagnosis right now. Please try again.");
            return;
          }

          setApiResult(response);

          if (response.result && response.result.issues) {
            const mapped = response.result.issues.map((issue: LlmIssue, index: number) =>
              mapLlmIssueToDiagnosticResult(issue, index, response.result.riskLevel, response.result.diySteps, selectedVehicle)
            );
            setCustomResultIssues(mapped);
            setSelectedIssues(mapped.map((m: any) => m.id));
            if (typeof window !== 'undefined') {
              localStorage.setItem('wrectifai_custom_issues', JSON.stringify(mapped));
            }
          }
        } catch (err) {
          console.error('API Diagnosis failed:', err);
          // Never expose ApiError or stack traces to the user
          setApiError("We couldn't generate the diagnosis right now. Please try again.");
        }
      };

      runApiDiagnosis();
    }
  }, [isAnalyzingResults, apiResult, apiError, dynamicAnswers, dynamicQuestions, issueText, selectedVehicleId, attachedMedia, selectedVehicle]);

  // Transition to results screen only when both timer is finished and API response has arrived
  useEffect(() => {
    if (apiResult && timerFinished) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAnalyzingResults(false);
      setIsDiagnosed(true);
    }
  }, [apiResult, timerFinished]);

  const applyDiagnoseFlow = (nextIssue: string) => {
    const flow = buildInitialFlow(nextIssue);

    setMessages([
      {
        id: 'message-1',
        sender: 'assistant',
        time: pageLoadTime,
        kind: 'message',
        text: flow.introText,
        highlighted: true,
      },
    ]);
    setIssueText(flow.issueText);
    setActiveCategoryId(flow.activeCategoryId);
    setAnswers({});
    setIsTyping(false);
    setTypingText('WrectifAI is thinking...');
    setIsDiagnosed(false);
    setIsFindingQuotes(false);
    setIsAnalyzingResults(false);
    setTypedMessage('');
    setSelectedIssues([]);
    setDetailsText('');
    setDynamicQuestions([]);
    setCurrentQuestionIdx(-1);
    setDynamicAnswers({});
    completedAnswersRef.current = {};
    setHasStartedDiagnose(false);
    setAccumulatedIntakeContext('');
    setClarificationTurns(0);
    sessionMediaRef.current = [];
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyDiagnoseFlow(initialIssueParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIssueParam]);

  useEffect(() => {
    if (selectedVehicleId && issueText && issueText !== DEFAULT_ISSUE_TEXT && !hasStartedDiagnose && !hasFailedDiagnose) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startDiagnoseSession(selectedVehicleId, issueText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId, issueText, hasStartedDiagnose, hasFailedDiagnose]);

  const resetDiagnoseFlow = () => {
    setDynamicQuestions([]);
    setCurrentQuestionIdx(-1);
    setDynamicAnswers({});
    completedAnswersRef.current = {};
    setHasStartedDiagnose(false);
    setHasFailedDiagnose(false);
    sessionMediaRef.current = [];
    setApiResult(null);
    setApiError(null);
    setTimerFinished(false);
    setCustomResultIssues(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wrectifai_custom_issues');
    }
    setSelectedIssues([]);
    applyDiagnoseFlow(initialIssueParam);
  };

  const handleSelectOption = async (questionId: string, option: string) => {
    if (isAnalyzingResults) return;

    // Prevent re-selecting options once chosen
    const question = messages.find((m) => m.id === questionId);
    if (question && question.kind === 'question' && question.selected) return;

    // Update selected option in the question bubble
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === questionId && msg.kind === 'question'
          ? { ...msg, selected: option }
          : msg
      )
    );

    // Add User's reply bubble
    const currentTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const userReply: ChatEntry = {
      id: `reply-${questionId}`,
      sender: 'user',
      time: currentTime,
      kind: 'reply',
      text: option,
    };
    setMessages((prev) => [...prev, userReply]);

    // Save the answer — write to ref synchronously to avoid stale-closure race
    if (currentQuestionIdx >= 0 && currentQuestionIdx < dynamicQuestions.length) {
      const currentQuestion = dynamicQuestions[currentQuestionIdx];
      const nextAnswers = { ...dynamicAnswers, [currentQuestion.question]: option };
      // Synchronously commit to ref so the final-diagnosis useEffect always sees all answers
      completedAnswersRef.current = nextAnswers;
      setDynamicAnswers(nextAnswers);

      setIsTyping(true);
      setTypingText('WrectifAI is processing...');

      try {
        const payload = {
          vehicleId: selectedVehicleId || '00000000-0000-0000-0000-000000000002',
          symptomText: issueText,
          media: sessionMediaRef.current.map(m => ({ mediaType: m.mediaType as 'image' | 'video' | 'audio', url: m.url! })),
          stage: 'questions' as const,
          intakeAnswers: { qas: nextAnswers },
        };
        const response = await submitDiagnosis(payload) as any;

        setIsTyping(false);

        if (response && response.questions && response.questions.length > 0) {
          const nextQuestion = response.questions[0];
          const isNonAutomotive = response.questions.length === 1 && (response.questions[0].options.includes('Cancel') || response.questions[0].options.includes('Understood'));

          if (isNonAutomotive) {
            setMessages((prev) => [
              ...prev,
              {
                id: `sys-reject-${Date.now()}`,
                sender: 'assistant',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                kind: 'message',
                text: 'Diagnosis session ended. Please describe an automotive issue to begin a new diagnosis.'
              }
            ]);
            setHasStartedDiagnose(false);
            setHasFailedDiagnose(true);
            setDynamicQuestions([]);
            setCurrentQuestionIdx(-1);
            return;
          }

          setDynamicQuestions((prev) => [...prev, nextQuestion]);
          const nextIdx = currentQuestionIdx + 1;
          setMessages((prev) => [
            ...prev,
            {
              id: nextQuestion.id || `dyn-q-${nextIdx}-${Date.now()}`,
              sender: 'assistant',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              kind: 'question',
              question: nextQuestion.question,
              options: nextQuestion.options,
              selected: '',
            },
          ]);
          setCurrentQuestionIdx(nextIdx);
        } else {
          // Backend returned no questions, meaning we hit the limit, proceed to final analysis
          setIsTyping(true);
          setTypingText('Analyzing diagnostics...');
          setTimeout(() => {
            setHasStartedDiagnose(true);
            setIsAnalyzingResults(true);
          }, 1000);
        }
      } catch (err) {
        console.error('Failed to fetch next question:', err);
        setIsTyping(true);
        setTypingText('Analyzing diagnostics...');
        setTimeout(() => {
          setHasStartedDiagnose(true);
          setIsAnalyzingResults(true);
        }, 1000);
      }
    }
  };

  const toggleSelectedIssue = (issueId: string) => {
    setSelectedIssues((current) =>
      current.includes(issueId)
        ? current.filter((item) => item !== issueId)
        : [...current, issueId]
    );
  };

  const activeCategory = activeCategoryId
    ? getCategoryById(activeCategoryId)
    : undefined;
  const resultIssues = customResultIssues || (activeCategoryId
    ? getResolvedIssues(activeCategoryId)
    : legacyResultIssues);
  const answerSummaryItems = buildAnswerSummaryItems(
    Object.keys(dynamicAnswers).length > 0 ? dynamicAnswers : answers
  );

  const rawDiySteps = apiResult?.result?.diySteps || [];
  const categoryStep = rawDiySteps.find(s => s.toLowerCase().startsWith('diy category:'));
  const diyTypeRaw = categoryStep ? categoryStep.split(':')[1]?.trim().toLowerCase() : (apiResult?.result?.diyAllowed ? 'repair' : 'none');
  const diyType = ['repair', 'troubleshooting'].includes(diyTypeRaw) ? diyTypeRaw as 'repair' | 'troubleshooting' : 'none';

  const nextSteps = apiResult && apiResult.result && apiResult.result.diyAllowed && rawDiySteps.length > 0
    ? rawDiySteps
      .filter(s => !s.toLowerCase().startsWith('diy category:'))
      .map((stepText: string, index: number) => ({
        step: `0${index + 1}`,
        title: `Step ${index + 1}`,
        body: stepText,
        meta: diyType === 'troubleshooting' ? 'Troubleshooting' : 'DIY Guidance',
      }))
    : undefined;

  const confidenceScore = apiResult?.result?.confidenceScore;

  // --- Media helpers ---
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileChange = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    mediaType: 'image' | 'video'
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const newMedia: AttachedMedia[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      mediaType,
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      status: 'UPLOAD_PENDING'
    }));

    setAttachedMedia(prev => [...prev, ...newMedia]);

    newMedia.forEach(async (mediaItem) => {
      try {
        const res = await uploadMedia(mediaItem.file!);

        setAttachedMedia(prev => prev.map(m => {
          if (m.id === mediaItem.id) {
            return { ...m, status: 'AVAILABLE_FOR_DIAGNOSIS', url: res.url };
          }
          return m;
        }));
      } catch (err: any) {
        setAttachedMedia(prev => prev.map(m => {
          if (m.id === mediaItem.id) {
            return { ...m, status: 'UPLOAD_FAILED', errorMessage: err.message || 'Failed to upload media' };
          }
          return m;
        }));
      }
    });

    e.target.value = '';
  }, []);

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const name = `recording-${Date.now()}.wav`;
        const file = new File([blob], name, { type: 'audio/wav' });

        const newAudio: AttachedMedia = {
          id: Math.random().toString(36).substring(7),
          mediaType: 'audio',
          file,
          name,
          previewUrl: '', // No preview for audio right now
          status: 'UPLOAD_PENDING'
        };

        setAttachedMedia(prev => [...prev, newAudio]);

        try {
          const res = await uploadMedia(file);
          setAttachedMedia(prev => prev.map(m => m.id === newAudio.id ? { ...m, status: 'AVAILABLE_FOR_DIAGNOSIS', url: res.url } : m));
        } catch (err: any) {
          setAttachedMedia(prev => prev.map(m => m.id === newAudio.id ? { ...m, status: 'UPLOAD_FAILED', errorMessage: err.message } : m));
        }

        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      console.error('Microphone access denied');
    }
  }, [isRecording]);

  const removeMedia = useCallback((id: string) => {
    setAttachedMedia((prev) => {
      const item = prev.find(m => m.id === id);
      if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const handleSendMessage = async () => {
    if (isAnalyzingResults) return;
    if (!selectedVehicleId) return;

    const inputMsg = typedMessage.trim();
    const readyMedia = attachedMedia.filter(m => m.status === 'AVAILABLE_FOR_DIAGNOSIS' && m.url);
    const pendingMedia = attachedMedia.filter(m => m.status === 'UPLOAD_PENDING');

    // If upload is still in-flight, don't send yet
    if (pendingMedia.length > 0) return;

    // Allow sending with ONLY media (no typed text) — generate a smart default symptom
    const hasMedia = readyMedia.length > 0;
    if (!inputMsg && !hasMedia) {
      // Nothing to send — show a hint
      setMessages(prev => [
        ...prev,
        {
          id: `bot-hint-${Date.now()}`,
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          kind: 'message',
          text: 'Please describe your vehicle\'s issue or upload a photo/video of the problem to start diagnosis.',
        } as ChatEntry,
      ]);
      return;
    }

    // If only media was provided (no text), create a descriptive symptom from media type
    const effectiveMsg = inputMsg || (
      readyMedia.some(m => m.mediaType === 'image')
        ? 'Please diagnose my vehicle based on the uploaded image.'
        : readyMedia.some(m => m.mediaType === 'video')
          ? 'Please diagnose my vehicle based on the uploaded video.'
          : readyMedia.some(m => m.mediaType === 'audio')
            ? 'Please diagnose my vehicle based on the recorded sound.'
            : 'Please help diagnose my vehicle.'
    );

    // Store any successful media into the session ref so it persists across API calls
    const successfulMedia = readyMedia.filter(m => m.status === 'AVAILABLE_FOR_DIAGNOSIS' && m.url);
    successfulMedia.forEach(m => {
      if (!sessionMediaRef.current.some(sm => sm.url === m.url)) {
        sessionMediaRef.current.push({ mediaType: m.mediaType, url: m.url!, name: m.name });
      }
    });

    // Show user's message in the chat
    const currentTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Extract image urls for the chat entry
    const newImages = successfulMedia.filter(m => m.mediaType === 'image').map(m => m.url!);

    const userMsg: ChatEntry = {
      id: `user-manual-${Date.now()}`,
      sender: 'user',
      time: currentTime,
      kind: 'reply',
      text: inputMsg || (newImages.length > 0 ? '' : `📎 ${readyMedia.map(m => m.name).join(', ')}`),
      mediaUrls: newImages.length > 0 ? newImages : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setTypedMessage('');
    // CLEAR COMPOSER ATTACHMENTS AFTER SEND
    setAttachedMedia([]);

    // If we haven't started the session yet, this input is the initial symptom!
    if (!hasStartedDiagnose) {
      setIssueText(effectiveMsg);
      setHasFailedDiagnose(false);
      startDiagnoseSession(selectedVehicleId, effectiveMsg);
      return;
    }

    // If questions are in progress, remind user to use the MCQ buttons above
    if (currentQuestionIdx >= 0 && currentQuestionIdx < dynamicQuestions.length) {
      setIsTyping(true);
      setTypingText('WrectifAI is thinking...');
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-hint-${Date.now()}`,
            sender: 'assistant',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            kind: 'message',
            text: 'Please tap one of the options above to answer the question.',
          },
        ]);
      }, 600);
      return;
    }

    // Free-form chat context update after diagnosis is complete
    setIsTyping(true);
    setTypingText('WrectifAI is thinking...');

    try {
      const historyForApi = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: (m as any).text || (m as any).question || ''
      })).filter(m => m.content !== '');

      historyForApi.push({ role: 'user', content: inputMsg });

      const reply = await chatDiagnosis({
        vehicleId: selectedVehicleId,
        conversationHistory: historyForApi
      });

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-reply-${Date.now()}`,
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          kind: 'message',
          text: reply?.text || reply?.data?.text || "I couldn't process that. Could you rephrase?",
        },
      ]);
    } catch (err) {
      console.error('Chat failed', err);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-reply-${Date.now()}`,
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          kind: 'message',
          text: "I'm having trouble connecting right now. Please try again.",
        },
      ]);
    }
  };




  if (isDiagnosed) {
    if (isFindingQuotes) {
      return (
        <DashboardShell header={<TopNavbar />}>
          <div ref={pageRootRef} className="pt-1">
            <FindingQuotesScreen
              resultIssues={resultIssues}
              selectedIssues={selectedIssues}
              onBack={() => setIsFindingQuotes(false)}
              selectedVehicle={selectedVehicle}
            />
          </div>
        </DashboardShell>
      );
    }

    return (
      <DashboardShell header={<TopNavbar />}>
        <div ref={pageRootRef} className="pt-1">
          <DiagnoseResultsScreen
            issueText={issueText}
            answerSummaryItems={answerSummaryItems}
            activeCategory={activeCategory}
            resultIssues={resultIssues}
            selectedIssues={selectedIssues}
            detailsText={detailsText}
            onDetailsTextChange={setDetailsText}
            onToggleIssue={toggleSelectedIssue}
            onEditIssue={resetDiagnoseFlow}
            onRequestQuotes={() =>
              router.push(`/finding-quotes?issues=${selectedIssues.join(',')}${apiResult?.id ? `&diagnosisRequestId=${apiResult.id}` : ''}`)
            }
            selectedVehicle={selectedVehicle}
            nextSteps={nextSteps}
            confidenceScore={confidenceScore}
            diyType={diyType}
            onRegenerateDiagnosis={async (notes) => {
              const newSymptom = issueText + '\\n\\nAdditional information: ' + notes;
              setIssueText(newSymptom);
              try {
                const payload = {
                  vehicleId: selectedVehicleId || '00000000-0000-0000-0000-000000000002',
                  symptomText: newSymptom,
                  media: sessionMediaRef.current.map(m => ({ mediaType: m.mediaType as 'image' | 'video' | 'audio', url: m.url })),
                  intakeAnswers: {
                    questions: dynamicQuestions.map(q => q.question),
                    qas: dynamicAnswers,
                  },
                  stage: 'final' as const,
                };

                const response = await submitDiagnosis(payload);
                setApiResult(response);

                if (response.result && response.result.issues) {
                  const issues = response.result.issues.map((issue: any, index: number) =>
                    mapLlmIssueToDiagnosticResult(issue, index, response.result.riskLevel, response.result.diySteps, selectedVehicle)
                  );
                  setCustomResultIssues(issues);
                  setSelectedIssues(issues.map((m: any) => m.id));
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('wrectifai_custom_issues', JSON.stringify(issues));
                  }
                }
              } catch (err) {
                console.error('API Diagnosis failed:', err);
                throw err;
              }
            }}
          />
        </div>
      </DashboardShell>
    );
  }



  if (isAnalyzingResults) {
    return (
      <DashboardShell header={<TopNavbar />}>
        <div ref={pageRootRef} className="pt-1">
          {apiError ? (
            <div className="mx-auto max-w-md rounded-[20px] border border-[#ffe4e2] bg-white p-6 text-center shadow-lg mt-12">
              <h2 className="text-[16px] font-bold text-[#ea3838]">Diagnosis Failed</h2>
              <p className="mt-3 text-[12px] leading-5 text-[#5f7099]">{apiError}</p>
              <button
                type="button"
                onClick={() => {
                  setApiError(null);
                  setIsAnalyzingResults(false);
                }}
                className="mt-6 inline-flex h-10 items-center justify-center rounded-[12px] bg-[#1a56db] px-6 text-[12px] font-semibold text-white transition-colors hover:bg-[#163cb3]"
              >
                Go Back & Retry
              </button>
            </div>
          ) : (
            <DiagnoseAnalyzingScreen onComplete={handleAnalysisComplete} />
          )}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell header={<TopNavbar />}>
      <div ref={pageRootRef} className="space-y-4 pb-6 pt-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className={homeHeroHeadingClass}>WrectifAI Diagnose</h1>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,860px)_286px] xl:items-start">
          {/* LEFT CHAT CONTAINER */}
          <div className="min-w-0 flex min-h-[560px] flex-col md:h-[calc(100dvh-172px)] md:min-h-0 xl:h-[calc(100dvh-124px)]">
            <div className="flex-1 flex flex-col rounded-[18px] border border-[#edf1fa] bg-white p-3 shadow-[0_12px_28px_rgba(35,64,143,0.03)] h-full overflow-hidden">
              <div className="flex-1 flex flex-col rounded-[18px] bg-[radial-gradient(circle_at_top,#f5f7ff_0%,#ffffff_62%)] p-0 overflow-hidden">
                {/* Bot Header Card */}
                <div className="shrink-0 w-full rounded-[18px] bg-[linear-gradient(90deg,#dce3ff_0%,#e7e9ff_48%,#e7e4ff_100%)] px-3 py-2 pr-7 shadow-[0_14px_34px_rgba(39,73,154,0.08)]">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/assets/New_chatbot.png"
                      alt="WrectifAI assistant"
                      width={90}
                      height={90}
                      className="h-[58px] w-[58px] object-contain shrink-0 block"
                      priority
                      style={{ width: '58px', height: '58px' }}
                    />
                    <div>
                      <h2 className={homeCardHeadingClass}>
                        {isDiagnosed
                          ? 'WrectifAI Diagnostics Complete!'
                          : isAnalyzingResults
                            ? 'WrectifAI is analyzing your issue.'
                            : 'I need a bit more information to diagnose accurately.'}
                      </h2>
                      <p className="mt-0.5 text-[11px] text-[#5f7099]">
                        {isDiagnosed
                          ? 'Review your results and connect with garages below.'
                          : isAnalyzingResults
                            ? 'Please wait while we prepare your diagnosis.'
                            : 'Please answer a few quick questions.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Conversational Timeline container (SCROLLABLE FEED) */}
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto px-3 pt-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-100 [&::-webkit-scrollbar-thumb]:rounded-full"
                >
                  {isAnalyzingResults ? (
                    <DiagnoseAnalyzingScreen />
                  ) : (
                    <>
                      {!selectedVehicleId && (
                        <div className="mb-4 rounded-[12px] bg-amber-50 border border-amber-200 p-4 text-[12px] text-amber-800 flex items-center gap-3">
                          <CircleAlert className="h-5 w-5 text-amber-600 shrink-0" />
                          <span>Please select your vehicle from the <strong>Diagnosing Vehicle</strong> panel on the right to start your AI diagnostic session.</span>
                        </div>
                      )}

                      {/* Initial User message */}
                      {hasInitialIssue && (
                        <div className="mb-7 flex justify-end">
                          <div className="w-full max-w-[250px] rounded-[14px] border border-[#dfe9fb] bg-[#f8fbff] px-4 py-3 shadow-[0_10px_22px_rgba(39,73,154,0.04)]">
                            <div className="mb-1 flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-[#3155a8]">
                                You
                              </span>
                              <span className="text-[#a4b1cb]">{pageLoadTime}</span>
                            </div>
                            <p className="text-[12px] leading-6 text-[#17307a]">
                              {issueText}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Dynamic messages rendering */}
                      <div className="relative mt-6 pb-3">
                        {/* Vertical Dashed Timeline Line */}
                        <div className="absolute left-[13.5px] top-2 bottom-0 w-0 border-l border-dashed border-[#c7d8ff] z-0" />
                        <div className="space-y-8">
                          {messages.map((entry) => {
                            if (entry.sender === 'user') {
                              return (
                                <div
                                  key={entry.id}
                                  className="relative flex justify-end animate-in fade-in slide-in-from-right-3 duration-300"
                                >
                                  {/* Timeline dot for user reply */}
                                  <div className="absolute left-0 flex h-7 w-7 items-center justify-center z-20">
                                    <div className="h-2.5 w-2.5 rounded-full bg-[#2b61f0] border-2 border-white shadow-[0_2px_6px_rgba(43,97,240,0.2)]" />
                                  </div>
                                  <div className="w-full max-w-[250px] rounded-[14px] border border-[#dfe9fb] bg-[#f8fbff] px-4 py-3 shadow-[0_10px_22px_rgba(39,73,154,0.04)]">
                                    <div className="mb-1 flex items-center justify-between text-[10px]">
                                      <span className="font-semibold text-[#3155a8]">
                                        You
                                      </span>
                                      <span className="text-[#a4b1cb]">
                                        {entry.time}
                                      </span>
                                    </div>
                                    {entry.mediaUrls && entry.mediaUrls.length > 0 && (
                                      <div className="mb-2 flex flex-wrap gap-2">
                                        {entry.mediaUrls.map((url, i) => (
                                          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border border-[#c7d8ff]">
                                            <Image
                                              src={getMediaUrl(url)}
                                              alt="Attached media"
                                              fill
                                              className="object-cover"
                                              unoptimized
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {entry.text && (
                                      <p className="text-[12px] leading-6 text-[#17307a]">
                                        {entry.text}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            if (entry.kind === 'message') {
                              const isFirstMessage = entry.id === 'message-1';
                              return (
                                <div
                                  key={entry.id}
                                  className="relative flex gap-4 animate-in fade-in duration-400"
                                >
                                  {/* Chevron pointing down above the bot avatar if it's NOT the first message */}
                                  {!isFirstMessage && (
                                    <div className="absolute left-0 -top-6 flex h-4 w-7 items-center justify-center text-[#9db5ff] z-20">
                                      <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                                    </div>
                                  )}
                                  <div className="relative z-10 mt-[2px]">
                                    <AssistantPill />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="mb-2 flex items-center gap-2 text-[10px]">
                                      <span className="font-semibold text-[#3a60ba]">
                                        WrectifAI
                                      </span>
                                      <span className="text-[#a4b1cb]">
                                        {entry.time}
                                      </span>
                                    </div>
                                    <div
                                      className={cn(
                                        'inline-flex rounded-[12px] border px-4 py-3 shadow-[0_8px_20px_rgba(39,73,154,0.04)]',
                                        entry.highlighted
                                          ? 'border-[#ebf0fb] bg-white'
                                          : 'border-[#e7ecf8] bg-[#fafdff]'
                                      )}
                                    >
                                      <p className="whitespace-pre-line text-[12px] leading-6 text-[#17307a]">
                                        {entry.text}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // Question card rendering
                            const hasSelected = !!entry.selected;
                            const isQuestion1 = entry.id === 'question-1';
                            return (
                              <div
                                key={entry.id}
                                className="relative flex gap-4 animate-in fade-in duration-400"
                              >
                                {/* Chevron pointing down above the bot avatar/pill container if it's NOT question-1 */}
                                {!isQuestion1 && (
                                  <div className="absolute left-0 -top-6 flex h-4 w-7 items-center justify-center text-[#9db5ff] z-20">
                                    <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                                  </div>
                                )}
                                <div className="relative z-10 mt-[2px]">
                                  {isQuestion1 ? (
                                    <div className="flex h-7 w-7 items-center justify-center bg-white rounded-full z-20">
                                      <div className="h-2.5 w-2.5 rounded-full bg-[#2b61f0] border-2 border-white shadow-[0_2px_6px_rgba(43,97,240,0.2)]" />
                                    </div>
                                  ) : (
                                    <AssistantPill />
                                  )}
                                </div>
                                <div className="min-w-0 w-full">
                                  <div className="mb-2 flex items-center gap-2 text-[10px]">
                                    <span className="font-semibold text-[#3a60ba]">
                                      WrectifAI
                                    </span>
                                    <span className="text-[#a4b1cb]">
                                      {entry.time}
                                    </span>
                                  </div>

                                  <div className="w-full max-w-[290px] rounded-[14px] border border-[#ebf0fb] bg-white p-4 shadow-[0_12px_24px_rgba(35,64,143,0.05)]">
                                    <h3
                                      className={cn(
                                        'leading-5',
                                        homeSubheadingClass
                                      )}
                                    >
                                      {entry.question}
                                    </h3>
                                    <div className="mt-3 space-y-2">
                                      {entry.options.map((option, idx) => {
                                        const isSelected =
                                          option === entry.selected;
                                        return (
                                          <button
                                            key={`${entry.id}-${idx}`}
                                            type="button"
                                            disabled={hasSelected || !selectedVehicleId}
                                            onClick={() =>
                                              handleSelectOption(
                                                entry.id,
                                                option
                                              )
                                            }
                                            className={cn(
                                              'flex w-full h-[42px] items-center justify-between rounded-[9px] border px-3.5 text-[13px] font-medium transition-all text-left',
                                              isSelected
                                                ? 'border-[#4d81ff] bg-[#fbfdff] text-[#2a5eea] shadow-[inset_0_0_0_1px_rgba(77,129,255,0.14)] font-bold'
                                                : (hasSelected || !selectedVehicleId)
                                                  ? 'border-[#f2f4f8] bg-[#fafbfc] text-[#b0c0df] cursor-not-allowed'
                                                  : 'border-[#e8edf8] bg-white text-[#52658f] hover:border-[#b9ccf9] hover:bg-[#f6f9ff]'
                                            )}
                                          >
                                            <span>{option}</span>
                                            {isSelected ? (
                                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2c62f0] text-white">
                                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                                              </span>
                                            ) : null}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Typing indicator bubble */}
                          {isTyping && (
                            <div className="relative flex gap-4 animate-pulse duration-700">
                              <div className="relative z-10 mt-[2px]">
                                <AssistantPill />
                              </div>
                              <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2 text-[10px]">
                                  <span className="font-semibold text-[#3a60ba]">
                                    WrectifAI
                                  </span>
                                </div>
                                <div className="inline-flex rounded-[12px] border border-[#e7ecf8] bg-[#fafdff] px-4 py-3 shadow-[0_8px_20px_rgba(39,73,154,0.04)]">
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-[12px] text-[#17307a] font-medium whitespace-pre-line leading-relaxed">
                                      {typingText}
                                    </span>
                                    <span className="flex items-center gap-1 shrink-0">
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#3a60ba] animate-bounce [animation-delay:-0.3s]" />
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#3a60ba] animate-bounce [animation-delay:-0.15s]" />
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#3a60ba] animate-bounce" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Dynamic Booking / Matching CTA Buttons */}
                          {isDiagnosed && (
                            <div className="mt-8 flex flex-wrap gap-4 pl-11 animate-in fade-in slide-in-from-bottom-4 duration-700">
                              <button
                                type="button"
                                className="flex h-[42px] items-center gap-2 rounded-[11px] bg-[#1a56db] px-5 text-[12px] font-semibold text-white shadow-[0_8px_22px_rgba(26,86,219,0.3)] hover:bg-[#1546b8] transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <span>View Matching Garages</span>
                                <ArrowRight className="h-4.5 w-4.5" />
                              </button>
                              <button
                                type="button"
                                className="flex h-[42px] items-center gap-2 rounded-[11px] border border-[#dbe6ff] bg-white px-5 text-[12px] font-semibold text-[#1a56db] hover:bg-[#f8fbff] transition-all shadow-[0_4px_12px_rgba(26,86,219,0.02)] active:scale-[0.98]"
                              >
                                <span>Get Free Quotes</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Chat Input section */}
              <div className="sticky bottom-0 z-10 mt-2 shrink-0 rounded-[16px] border border-[#edf1fa] bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(35,64,143,0.08)]">
                <div className="text-[10px] font-medium text-[#8f9cbc]">
                  Add more details (optional)
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-medium text-[#7284ab]">
                  {/* Hidden file inputs */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'image')}
                  />

                  <button
                    type="button"
                    disabled={!selectedVehicleId || isAnalyzingResults}
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1.5 hover:text-[#1a56db] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-[#6a8cff]" />
                    <span>Upload Photo</span>
                  </button>
                  <button
                    type="button"
                    disabled={!selectedVehicleId || isAnalyzingResults}
                    onClick={handleToggleRecording}
                    className={`flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isRecording
                      ? 'text-red-500 animate-pulse'
                      : 'hover:text-[#1a56db]'
                      }`}
                  >
                    <Mic className="h-3.5 w-3.5 text-[#6a8cff]" />
                    <span>{isRecording ? 'Stop Recording' : 'Record Sound'}</span>
                  </button>
                </div>


                {/* Media preview chips */}
                {attachedMedia.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachedMedia.map((m) => (
                      <div
                        key={m.id}
                        title={m.errorMessage || m.status}
                        className={cn(
                          "flex items-center gap-1.5 rounded-[12px] border px-2.5 py-1 text-[10px] font-medium transition-all relative overflow-hidden",
                          (m.status === 'UPLOAD_FAILED') ? "border-red-200 bg-red-50 text-red-600" :
                            (m.status === 'UPLOAD_PENDING') ? "border-amber-200 bg-amber-50 text-amber-600" :
                              "border-[#d6e4ff] bg-[#eef4ff] text-[#1a56db]"
                        )}
                      >
                        {m.mediaType === 'image' && m.previewUrl ? (
                          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-[4px] bg-black/5">
                            <img src={m.previewUrl} alt={m.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <>
                            {m.mediaType === 'image' && <ImageIcon className="h-3 w-3 shrink-0" />}
                            {m.mediaType === 'video' && <Video className="h-3 w-3 shrink-0" />}
                            {m.mediaType === 'audio' && <Mic className="h-3 w-3 shrink-0" />}
                          </>
                        )}
                        <div className="flex flex-col">
                          <span className="max-w-[120px] truncate leading-tight">{m.name}</span>
                          {(m.status === 'UPLOAD_PENDING') && (
                            <span className="text-[8px] opacity-70 animate-pulse leading-none">Uploading</span>
                          )}
                          {(m.status === 'UPLOAD_FAILED') && (
                            <span className="text-[8px] opacity-70 leading-none truncate max-w-[120px]" title={m.errorMessage}>{m.errorMessage || 'Failed'}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedia(m.id)}
                          className={cn(
                            "ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors",
                            (m.status === 'UPLOAD_FAILED') ? "bg-red-100 hover:bg-red-200 text-red-600" :
                              (m.status === 'UPLOAD_PENDING') ? "bg-amber-100 hover:bg-amber-200 text-amber-600" :
                                "bg-[#c1d5ff] text-[#1a56db] hover:bg-red-100 hover:text-red-500"
                          )}
                          aria-label="Remove"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-3 rounded-[12px] border border-[#e4eafb] bg-[#fbfcff] px-4 py-1">
                  <input
                    type="text"
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={
                      !selectedVehicleId
                        ? 'Please select a vehicle to start diagnosing...'
                        : attachedMedia.some(m => m.status === 'UPLOAD_PENDING')
                          ? 'Waiting for upload to finish...'
                          : attachedMedia.some(m => m.status === 'AVAILABLE_FOR_DIAGNOSIS')
                            ? 'Photo attached — click ➤ to start diagnosis, or add details here...'
                            : 'Describe your vehicle issue here, or upload a photo above...'
                    }
                    disabled={isAnalyzingResults || !selectedVehicleId}
                    className="w-full bg-transparent py-2 text-[12px] text-[#17307a] placeholder-[#a7b2ca] outline-none border-none focus:ring-0 shadow-none disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={
                      isAnalyzingResults ||
                      !selectedVehicleId ||
                      attachedMedia.some(m => m.status === 'UPLOAD_PENDING') ||
                      // Disabled only if BOTH no text AND no ready media
                      (!typedMessage.trim() && !attachedMedia.some(m => m.status === 'AVAILABLE_FOR_DIAGNOSIS'))
                    }
                    className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a56db]/5 text-[#1a56db] hover:bg-[#1a56db] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR PANEL */}
          <div className="space-y-6">
            {/* Vehicle Selector Panel */}
            <Card className="rounded-[18px] border-[#e8edf8] bg-white p-5 shadow-[0_12px-28px_rgba(35,64,143,0.04)]">
              <h2 className={homeSubheadingClass}>Diagnosing Vehicle</h2>
              <div className="mt-4">
                <VehicleSelector
                  value={selectedVehicleId}
                  onChange={handleVehicleChange}
                />
              </div>
            </Card>

            {/* Progress Panel */}
            <Card className="rounded-[18px] border-[#e8edf8] bg-white p-5 shadow-[0_12px_28px_rgba(35,64,143,0.04)]">
              <h2 className={homeSubheadingClass}>Diagnosis in Progress</h2>
              <div className="mt-5 flex items-center gap-4">
                <ProgressRing progress={progress} />
                <div>
                  <h3 className={homeCardHeadingClass}>
                    {stepTitle}
                  </h3>
                  <p className="mt-1 text-[11px] leading-5 text-[#5f7099]">
                    {stepDesc}
                  </p>
                </div>
              </div>
            </Card>

            {/* Summary Panel */}
            <Card className="rounded-[18px] border-[#e8edf8] bg-white p-5 shadow-[0_12px_28px_rgba(35,64,143,0.04)]">
              <div className="flex items-center justify-between">
                <h2 className={homeSubheadingClass}>Your Issue Summary</h2>
                <button
                  type="button"
                  onClick={() => {
                    resetDiagnoseFlow();
                    return;
                    // Reset back to initial state
                    setMessages([
                      {
                        id: 'message-1',
                        sender: 'assistant',
                        time: '10:30 AM',
                        kind: 'message',
                        text: "Thanks! Let's narrow this down ✨",
                        highlighted: true,
                      },
                      {
                        id: 'question-1',
                        sender: 'assistant',
                        time: '10:30 AM',
                        kind: 'question',
                        question: 'When do you feel the vibration?',
                        options: [
                          'Only while braking',
                          'While accelerating',
                          'At constant speed',
                          'Always',
                        ],
                        selected: '',
                      },
                    ]);
                    setAnswers({
                      occursAt: '-',
                      wheelShakes: '-',
                      started: '-',
                    });
                    setIsDiagnosed(false);
                    setIsAnalyzingResults(false);
                  }}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#1a56db] hover:text-[#184aff] transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="mt-4 rounded-[14px] border border-[#edf1fa] bg-white px-4 py-4">
                <div>
                  <div className={homeBodyStrongClass}>Original Issue</div>
                  <p className="mt-3 max-w-[235px] text-[12px] leading-6 text-[#17307a]">
                    {issueText}
                  </p>
                </div>

                <div className="mt-5 space-y-4 border-t border-[#eef2fb] pt-4">
                  {answerSummaryItems.map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-4"
                    >
                      <div className="flex items-center gap-2 text-[#273f75]">
                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-[#cfe0ff] text-[#3566f0]">
                          <Icon className="h-2.5 w-2.5" />
                        </span>
                        <span>{label}</span>
                      </div>
                      <span className="max-w-[112px] text-right text-[12px] font-semibold leading-5 text-[#1b316e] break-words">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-[14px] border border-[#ddf3e3] bg-[#f3fff6] px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#1e9b57] shadow-[0_4px_10px_rgba(30,155,87,0.1)]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <p className="text-[12px] leading-5 text-[#4b8a61]">
                    Accurate answers help us improve accuracy and match you with
                    the right garages.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer Features banner */}
        <div className="grid gap-4 rounded-[18px] border border-[#edf1fa] bg-white p-4 shadow-[0_12px_28px_rgba(35,64,143,0.03)] md:grid-cols-2 xl:grid-cols-4">
          {footerFeatures.map(({ title, description, icon: Icon }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4f7ff] text-[#5d7df4]">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-[12px] font-semibold text-[#35508e]">
                  {title}
                </h3>
                <p className="mt-1 text-[10px] leading-4 text-[#5a709b]">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

const getMediaUrl = (url: string) => {
  if (url.startsWith('http')) return url;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';
  const hostUrl = baseUrl.replace(/\/api(\/v1)?\/?$/, '');
  return `${hostUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default AIDiagnosePage;
