'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CarFront, Check } from 'lucide-react';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { Card } from '@/components/common/card';
import { ResultTrustFooter, resultIssues } from '@/components/ai-diagnose/diagnose-flow-shared';
import { cn } from '@/utils/cn';

import { createQuoteRequest } from '@/lib/quotes-api';
import { getDiagnosis } from '@/lib/diagnosis-api';
import { getVehicleImage } from '@/lib/vehicle-image-catalog';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage?: number;
  image?: string;
}

export function FindingQuotesPage({ issues, diagnosisRequestId }: { issues?: string; diagnosisRequestId?: string }) {
  const pageRootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [customIssues, setCustomIssues] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('wrectifai_selected_vehicle');
        if (stored) {
          try {
            setSelectedVehicle(JSON.parse(stored) as Vehicle);
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (diagnosisRequestId) {
        try {
          const diag = await getDiagnosis(diagnosisRequestId);
          if (diag && diag.result && diag.result.issues) {
            const getBadgeForIssue = (name: string, overallRisk?: string, index?: number) => {
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
            };

            const mapped = diag.result.issues.map((issue: any, index: number) => {
              const match = issue.confidence || 85;
              const { badge, badgeClass } = getBadgeForIssue(issue.name || issue.title, diag.result.riskLevel, index);
              return {
                id: `llm_issue_${index}`,
                title: issue.name || issue.title,
                badge,
                badgeClass,
                description: `Diagnosed issue: ${issue.name || issue.title}. Requires parts: ${issue.requiredParts?.join(', ') || 'None specified'}.`,
                match,
                imageSrc: selectedVehicle?.image || getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)
              };
            });
            setCustomIssues(mapped);
            setIsMounted(true);
            return;
          }
        } catch (err) {
          console.error('Failed to load diagnosis from DB, falling back to localStorage:', err);
        }
      }

      if (typeof window !== 'undefined') {
        const storedCustom = localStorage.getItem('wrectifai_custom_issues');
        if (storedCustom) {
          try {
            setCustomIssues(JSON.parse(storedCustom) as any[]);
          } catch (e) {
            console.error(e);
          }
        }
      }
      setIsMounted(true);
    }

    loadData();
  }, [diagnosisRequestId]);

  const selectedIssueIds = useMemo(() => {
    return (issues || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, [issues]);

  const chosenIssues = useMemo(() => {
    const allIssues = [...resultIssues, ...customIssues];
    return allIssues.filter((issue) => selectedIssueIds.includes(issue.id));
  }, [selectedIssueIds, customIssues]);

  const hasSubmitted = useRef(false);
  const isUnmounted = useRef(false);

  useEffect(() => {
    isUnmounted.current = false;
    return () => {
      isUnmounted.current = true;
    };
  }, []);

  useEffect(() => {
    console.log('[FindingQuotes] Mount effect ran. isMounted:', isMounted, 'hasSubmitted:', hasSubmitted.current);
    if (!isMounted) return;
    if (hasSubmitted.current) return;
    if (chosenIssues.length === 0) return;
    async function submitRequest() {
      try {
        setErrorMsg(null);
        hasSubmitted.current = true;
        const vehicleId = selectedVehicle?.id || '00000000-0000-0000-0000-000000000002';
        const issueSummary = chosenIssues.map((i) => i.title).join(', ');
        console.log('[FindingQuotes] Submitting quote request payload:', { vehicleId, issueSummary, diagnosisRequestId });
        const response = await createQuoteRequest({
          vehicleId,
          issueSummary,
          diagnosisRequestId,
          garageId: 'ALL' // Broadcast to all approved garages
        });
        console.log('[FindingQuotes] Received quote request response:', response);
        if (!isUnmounted.current) {
          console.log('[FindingQuotes] Setting requestId to:', response.id);
          setRequestId(response.id);
          // Dispatch Notifications for Broadcast Quote
          const notifs = JSON.parse(localStorage.getItem('wrectifai_notifications') || '[]');
          notifs.unshift({ id: Date.now(), type: 'Quote', title: 'New Quote Request', desc: `Customer requested a quote from all garages for: ${issueSummary}.`, time: 'Just now', read: false, icon: 'FileText', color: 'text-purple-500', bg: 'bg-purple-50', audience: 'Admin' });
          notifs.unshift({ id: Date.now() + 1, type: 'Quote', title: 'New Quote Request', desc: `You received a new quote request from a customer.`, time: 'Just now', read: false, icon: 'FileText', color: 'text-purple-500', bg: 'bg-purple-50', audience: 'Garage' });
          localStorage.setItem('wrectifai_notifications', JSON.stringify(notifs));
          window.dispatchEvent(new Event('notifications-updated'));
        } else {
          console.log('[FindingQuotes] API completed but page was unmounted.');
        }
      } catch (err: any) {
        console.error('[FindingQuotes] Failed to create quote request:', err);
        hasSubmitted.current = false;
        setErrorMsg(err.message || 'Failed to request quotes. Please try again.');
      }
    }
    submitRequest();
  }, [isMounted, selectedVehicle?.id, diagnosisRequestId, chosenIssues, retryCount]);

  useEffect(() => {
    console.log('[FindingQuotes] Redirect check effect. currentStep:', currentStep, 'requestId:', requestId);
    if (currentStep < 4) {
      const timer = setTimeout(() => {
        console.log('[FindingQuotes] Step incrementing from:', currentStep);
        setCurrentStep((prev) => prev + 1);
      }, 1000);
      return () => {
        console.log('[FindingQuotes] Clearing step timer for step:', currentStep);
        clearTimeout(timer);
      };
    } else if (requestId) {
      console.log('[FindingQuotes] Redirect condition met! Pushing to request-aent with requestId:', requestId);
      router.push(`/request-aent?requestId=${requestId}`);
      // Fallback redirection in case next-router navigation stalls
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = `/request-aent?requestId=${requestId}`;
        }
      }, 300);
    } else {
      console.log('[FindingQuotes] Steps complete but requestId is null.');
    }
  }, [currentStep, router, requestId]);

  useEffect(() => {
    const pageScroller = (() => {
      let node = pageRootRef.current?.parentElement ?? null;
      while (node) {
        if (node.scrollHeight > node.clientHeight) return node;
        node = node.parentElement;
      }
      return null;
    })();

    window.scrollTo({ top: 0, behavior: 'auto' });
    pageScroller?.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <DashboardShell header={<TopNavbar />}>
      <div ref={pageRootRef} className="space-y-5 pb-6 pt-1">
        <div>
          <Link
            href="/ai-diagnose-results"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#2f54d1] transition-colors hover:text-[#163cb3]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to WrectifAI Diagnosis Results</span>
          </Link>
        </div>

        <div className="rounded-[24px] px-4 py-4">
          <div className="mx-auto max-w-[760px] text-center">
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#173cab]">
              Finding the best garages for you...
            </h1>
            <p className="mt-2 text-[14.5px] text-[#4f65aa]">This will only take a few seconds</p>

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

              <div className="pointer-events-none absolute inset-0 hidden md:block">
                <div className="absolute left-[20px] top-[86px] h-px w-[98px] bg-[#d7e3ff]" />
                <div className="absolute right-[20px] top-[86px] h-px w-[98px] bg-[#d7e3ff]" />
                <div className="absolute left-[48px] top-[72px] h-2 w-2 rounded-full bg-[#bfd1ff]" />
                <div className="absolute left-[82px] top-[120px] h-1.5 w-1.5 rounded-full bg-[#bfd1ff]" />
                <div className="absolute right-[54px] top-[68px] h-2 w-2 rounded-full bg-[#bfd1ff]" />
                <div className="absolute right-[86px] top-[124px] h-1.5 w-1.5 rounded-full bg-[#bfd1ff]" />
              </div>
            </div>

            {errorMsg && (
              <div className="mx-auto mt-6 max-w-[400px] rounded-[14px] border border-[#ffcfcf] bg-[#fff5f5] px-4 py-3 text-[14px] font-medium text-[#d32f2f] shadow-sm">
                <p>{errorMsg}</p>
                <button
                  onClick={() => {
                    hasSubmitted.current = false;
                    setErrorMsg(null);
                    setCurrentStep(0);
                    setRetryCount(r => r + 1);
                  }}
                  className="mt-3 inline-flex h-8 items-center justify-center rounded-[8px] bg-[#d32f2f] px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-[#b71c1c] transition-all"
                >
                  Retry Now
                </button>
              </div>
            )}
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
                    index < 3 ? 'border-b border-[#eef2ff] md:border-b-0 md:border-r md:border-[#eef2ff]' : ''
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300',
                      isComplete
                        ? 'border-[#17884f] bg-[#17884f] text-white'
                        : isActive
                          ? 'border-[#2351f6] bg-white text-[#2351f6]'
                          : 'border-[#cbd5e1] bg-white text-transparent'
                    )}
                  >
                    {isComplete ? <Check className="h-4 w-4 stroke-[3]" /> : null}
                  </span>
                  <div className={cn('text-[14px] font-medium transition-colors duration-300', isActive ? 'text-[#1e46ce]' : 'text-[#213882]')}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-[20px] border-[#e7edfd] bg-[linear-gradient(180deg,#fbfcff_0%,#ffffff_100%)] px-6 py-5 shadow-[0_12px_28px_rgba(37,73,153,0.04)]">
          <div className="flex items-center justify-center gap-3 text-center text-[15px] font-medium text-[#1f46c7]">
            <Check className="h-5 w-5 rounded-full bg-[#edf2ff] p-0.5 text-[#1f46c7]" />
            <span>We share your request only with verified and trusted garages.</span>
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[254px_minmax(0,1fr)_390px]">
          <Card className="rounded-[22px] border-[#e7edfd] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
            <h3 className="text-[15.5px] font-semibold text-[#183db1]">Your Vehicle</h3>
            <div className="mt-10 flex flex-col items-center text-center">
              <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#f5f8ff_0%,#edf2ff_100%)] text-[#244fe5] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <CarFront className="h-11 w-11" />
              </span>
              <div className="mt-8 text-[15.5px] font-semibold tracking-[-0.03em] text-[#193daa]">
                {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.vin ? `(${selectedVehicle.vin.slice(-6)})` : ''}` : 'Honda City (TS07 AB 1234)'}
              </div>
              <div className="mt-5 flex items-center gap-4 text-[12px] text-[#6679a6]">
                <span>{selectedVehicle ? (selectedVehicle.vin ? 'VIN Verified' : 'Petrol') : 'Petrol'}</span>
                <span className="h-1 w-1 rounded-full bg-[#8997bc]" />
                <span>{selectedVehicle ? selectedVehicle.year : '2018'}</span>
              </div>
              <div className="mt-4 text-[12px] text-[#546a9f]">
                {selectedVehicle && selectedVehicle.mileage !== undefined && selectedVehicle.mileage !== null
                  ? `Mileage: ${selectedVehicle.mileage.toLocaleString()} miles`
                  : 'KM Driven: 58,320 km'}
              </div>
            </div>
          </Card>

          <Card className="rounded-[22px] border-[#e7edfd] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
            <div className="flex items-center gap-3">
              <h3 className="text-[15.5px] font-semibold text-[#183db1]">Your Selected Issues</h3>
              <span className="text-[12px] text-[#6c80b0]">({chosenIssues.length} Selected)</span>
            </div>
            <div className="mt-5 divide-y divide-[#edf2fb]">
              {chosenIssues.map((issue, index) => (
                <div key={issue.id} className="grid gap-4 py-5 md:grid-cols-[76px_minmax(0,1fr)_92px] md:items-center">
                  <div className="flex justify-center md:justify-start">
                    <Image
                      src={issue.imageSrc || selectedVehicle?.image || getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year) || '/assets/Engine_oil.png'}
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
                      <div className="text-[14px] font-semibold text-[#183aa7]">
                        {index + 1}. {issue.title}
                      </div>
                      <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', issue.badgeClass)}>
                        {issue.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-7 text-[#61729f]">{issue.description}</p>
                  </div>
                  <div className="text-left md:text-center">
                    <div className="text-[28px] font-semibold tracking-[-0.05em] text-[#173ab3]">{issue.match}%</div>
                    <div className="text-[12px] text-[#7382ab]">Match</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[22px] border-[#e7edfd] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
            <h3 className="text-[15.5px] font-semibold text-[#183db1]">What&apos;s Happening?</h3>
            <div className="mt-8 space-y-7">
              {[
                { title: 'Analyzing your issue' },
                { title: 'Finding nearby trusted garages' },
                { title: 'Matching with best service providers' },
                { title: 'Sending your request' },
              ].map((step, index, array) => {
                const isComplete = index < currentStep;
                const isActive = index === currentStep;
                const status = isComplete ? 'Completed' : isActive ? 'In progress' : 'Pending';
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
                            : 'border-[#cbd5e1] bg-white text-transparent'
                      )}
                    >
                      {isComplete ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : null}
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold text-[#183aa7]">{step.title}</div>
                      <div
                        className={cn(
                          'mt-2 text-[12px] font-medium transition-colors duration-300',
                          isComplete ? 'text-[#6477a6]' : isActive ? 'text-[#2351f6]' : 'text-[#7f8db3]'
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

        <ResultTrustFooter />
      </div>
    </DashboardShell>
  );
}

export default FindingQuotesPage;
