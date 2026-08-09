'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Star, CarFront } from 'lucide-react';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { Card } from '@/components/common/card';
import { resultIssues } from '@/components/ai-diagnose/diagnose-flow-shared';
import { cn } from '@/utils/cn';



const BULLET = '\u2022';

const homeSectionHeadingClass = 'ui-page-title';
const homeCardHeadingClass = 'ui-card-title';
function IssuePreview({
  issueTitle,
  selectedVehicle,
}: {
  issueTitle: string;
  selectedVehicle: Vehicle | null;
}) {
  const [showFallbackIcon, setShowFallbackIcon] = useState(false);

  if (showFallbackIcon) {
    return (
      <span className="flex h-[60px] w-[60px] items-center justify-center rounded-[14px] bg-[radial-gradient(circle_at_top,#f6f8ff_0%,#eef2ff_100%)] text-[#2451e5]">
        <CarFront className="h-8 w-8" />
      </span>
    );
  }

  return (
    <Image
      src={getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)}
      alt={issueTitle}
      width={60}
      height={60}
      className="h-[60px] w-[60px] object-contain"
      onError={() => setShowFallbackIcon(true)}
      unoptimized={true}
    />
  );
}

function VehiclePreview({ selectedVehicle }: { selectedVehicle: Vehicle | null }) {
  return (
    <div className="flex h-[112px] w-[112px] items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_top,#f7f9ff_0%,#eef3ff_62%,#e9efff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
      <Image
        src={getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)}
        alt="Car"
        width={94}
        height={56}
        className="h-auto w-[94px] object-contain"
        priority
        unoptimized={true}
      />
    </div>
  );
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage?: number;
}

import { getQuoteRequest } from '@/lib/quotes-api';
import { getDiagnosis } from '@/lib/diagnosis-api';
import { getVehicleImage } from '@/lib/vehicle-image-catalog';

export function RequestAentPage({ issues, requestId }: { issues?: string; requestId?: string }) {
  const router = useRouter();
  const pageRootRef = useRef<HTMLDivElement>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [garages, setGarages] = useState<any[]>([]);

  useEffect(() => {
    async function fetchGarages() {
      try {
        const { apiClient } = await import('@/lib/api-client');
        const data = await apiClient.get<any[]>('/garages');
        if (data) {
          setGarages(data.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load garages:', err);
      }
    }
    fetchGarages();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        if (!requestId) {
          const vehicleStr = typeof window !== 'undefined' ? localStorage.getItem('wrectifai_selected_vehicle') : null;
          const parsedVehicle = vehicleStr ? JSON.parse(vehicleStr) : null;
          setSelectedVehicle(parsedVehicle);
          
          const selectedIssueIds = (issues || 'wheel-balance,wheel-alignment')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

          let allIssues = [...resultIssues];
          if (typeof window !== 'undefined') {
            const storedCustom = localStorage.getItem('wrectifai_custom_issues');
            if (storedCustom) {
              try {
                const customIssues = JSON.parse(storedCustom);
                allIssues = [...allIssues, ...customIssues];
              } catch (e) {
                console.error('Failed to parse custom issues:', e);
              }
            }
          }
          const filtered = allIssues.filter((issue) => selectedIssueIds.includes(issue.id));
          setSelectedIssues(filtered);
          return;
        }

        const qr = await getQuoteRequest(requestId);
        if (qr) {
          setSelectedVehicle(qr.vehicle ? { id: qr.vehicleId, ...qr.vehicle } : null);

          if (qr.diagnosisRequestId) {
            try {
              const diag = await getDiagnosis(qr.diagnosisRequestId);
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
                    id: `db_issue_${index}`,
                    title: issue.name || issue.title,
                    badge,
                    badgeClass,
                    description: `Diagnosed issue: ${issue.name || issue.title}. Requires parts: ${issue.requiredParts?.join(', ') || 'None specified'}.`,
                    imageSrc: getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)
                  };
                });
                setSelectedIssues(mapped);
                return;
              }
            } catch (err) {
              console.error('Failed to fetch linked diagnosis:', err);
            }
          }

          if (qr.issueSummary) {
            const summaryIssues = qr.issueSummary.split(',').map((name, index) => {
              const found = resultIssues.find(r => r.title.toLowerCase() === name.trim().toLowerCase());
              if (found) {
                return found;
              }
              return {
                id: `summary_issue_${index}`,
                title: name.trim(),
                badge: 'Caution',
                badgeClass: 'text-[#e27622] bg-[#fdf5ed]',
                description: `Requested issue: ${name.trim()}`,
                match: 85,
                imageSrc: getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)
              };
            });
            setSelectedIssues(summaryIssues);
          }
        }
      } catch (err) {
        console.error('Failed to load quote request details:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [requestId, issues]);

  const featuredGarages = garages;

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
        <Card className="overflow-hidden rounded-[18px] border-[#dceee5] bg-[radial-gradient(circle_at_top,#fcfffd_0%,#f8fffb_62%,#f6fbff_100%)] px-6 py-[18px] shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
          <div className="flex items-center gap-4">
            <div className="relative flex h-[58px] w-[58px] shrink-0 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(26,168,93,0.08)_0%,rgba(26,168,93,0)_72%)]" />
              {[
                '#ffb800',
                '#7c3aed',
                '#1a56db',
                '#ff6b6b',
                '#0ea5e9',
                '#f97316',
                '#22c55e',
                '#8b5cf6',
              ].map((color, index) => {
                const positions = [
                  'left-[4px] top-[14px]',
                  'left-[12px] top-[6px]',
                  'right-[10px] top-[8px]',
                  'right-[4px] top-[18px]',
                  'left-[8px] bottom-[12px]',
                  'left-[18px] bottom-[6px]',
                  'right-[6px] bottom-[10px]',
                  'right-[18px] bottom-[4px]',
                ];
                return (
                  <span
                    key={`${color}-${index}`}
                    className={cn(
                      'absolute h-[4px] w-[4px] rounded-full',
                      positions[index]
                    )}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
              <span className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#1b8d56] text-white shadow-[0_6px_16px_rgba(27,141,86,0.18)]">
                <Check className="h-5 w-5 stroke-[3]" />
              </span>
            </div>

            <div>
              <h1 className="text-[15.5px] font-semibold tracking-[-0.03em] text-[#238453]">
                Thank you.
              </h1>
              <p className="mt-1 text-[12px] text-[#5f7099]">
                Your request has been sent to all available garages. You will start receiving quotations shortly.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.32fr)_minmax(0,0.68fr)] items-stretch">
          <div className="flex flex-col gap-5">
            <Card className="rounded-[18px] border-[#e6ecfb] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
              <div className="flex items-center gap-3">
                <h3 className={homeSectionHeadingClass}>Your Vehicle</h3>
              </div>

              <div className="mt-4 rounded-[16px] border border-[#e8eefc] bg-[linear-gradient(135deg,#fbfcff_0%,#f6f9ff_100%)] px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
                  <div className="flex justify-center sm:justify-start">
                    <VehiclePreview selectedVehicle={selectedVehicle} />
                  </div>

                  <div className="min-w-0">
                    <div className={homeCardHeadingClass}>
                      {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.vin ? `(${selectedVehicle.vin.slice(-6)})` : ''}` : 'Honda City (TS07 AB 1234)'}
                    </div>
                    <div className="mt-1 text-[12px] text-[#5f7099]">
                      Active vehicle linked to this garage request
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-[12px] border border-[#e3ebff] bg-white px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8ea0c7]">
                          Fuel
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-[#17307a]">
                          {selectedVehicle ? (selectedVehicle.vin ? 'VIN Verified' : 'Petrol') : 'Petrol'}
                        </div>
                      </div>
                      <div className="rounded-[12px] border border-[#e3ebff] bg-white px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8ea0c7]">
                          Year
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-[#17307a]">
                          {selectedVehicle ? selectedVehicle.year : '2018'}
                        </div>
                      </div>
                      <div className="rounded-[12px] border border-[#e3ebff] bg-white px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8ea0c7]">
                          KM Driven
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-[#17307a]">
                          {selectedVehicle && selectedVehicle.mileage !== undefined && selectedVehicle.mileage !== null
                            ? `${selectedVehicle.mileage.toLocaleString()} mi`
                            : '58,320 km'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="flex-1 rounded-[18px] border-[#e6ecfb] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <h3 className={homeSectionHeadingClass}>
                    Your Selected Issues
                  </h3>
                  <span className="text-[12px] font-medium text-[#5f7099]">
                    ({selectedIssues.length} Selected)
                  </span>
                </div>
              </div>

              <div className="mt-2 divide-y divide-[#edf2fb]">
                {selectedIssues.map((issue, index) => (
                  <div
                    key={issue.id}
                    className="grid gap-3 py-3 md:grid-cols-[52px_minmax(0,1fr)_72px] md:items-center"
                  >
                    <div className="flex justify-center md:justify-start">
                      <IssuePreview
                        key={issue.id}
                        issueTitle={issue.title}
                        selectedVehicle={selectedVehicle}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className={homeCardHeadingClass}>
                          {index + 1}. {issue.title}
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            issue.badgeClass
                          )}
                        >
                          {issue.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-[#5f7099]">
                        {issue.description}
                      </p>
                    </div>

                    <div className="md:text-center">
                      <div className="text-[20px] font-semibold leading-none tracking-[-0.03em] text-[#17307a]">
                        {issue.match}%
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-[#5f7099]">
                        Match
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="rounded-[18px] border-[#e6ecfb] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
            <div className="flex flex-col gap-2">
              <div>
                <h3 className={homeSectionHeadingClass}>
                  Top Garages Near You
                </h3>
                <p className="mt-1 text-[12px] text-[#5f7099]">
                  These garages are receiving your request based on your
                  selected issues and location.
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[14px] border border-[#e8eefc] bg-white">
              {featuredGarages.map((garage, index) => (
                <div
                  key={`${garage.name}-${index}`}
                  className={cn(
                    'grid gap-3 px-3 py-3 md:grid-cols-[96px_minmax(0,1fr)_auto] md:items-center',
                    index < featuredGarages.length - 1
                      ? 'border-b border-[#edf2fb]'
                      : ''
                  )}
                >
                  <div className="flex items-center justify-center md:justify-start">
                    <Image
                      src={garage.image}
                      alt={garage.name}
                      width={96}
                      height={56}
                      className="rounded-[10px] object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="ui-card-title truncate">{garage.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[12px] font-medium text-[#5f7099]">
                      <span className="inline-flex items-center gap-1 text-[#17307a]">
                        <span>{garage.rating}</span>
                        <Star className="h-3.5 w-3.5 fill-[#ffb800] text-[#ffb800]" />
                        <span>({garage.reviews})</span>
                      </span>
                      <span>{BULLET}</span>
                      <span className="truncate">{garage.distance} away</span>
                    </div>
                    <div className="mt-1 truncate text-[11px] leading-5 text-[#5f7099]">
                      {garage.badge || 'Trusted partner'} {BULLET} Verified
                      technicians
                    </div>
                  </div>

                  <div className="flex items-center justify-start md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/garages?garage=${encodeURIComponent(
                            garage.name
                          )}&source=request-aent&issues=${selectedIssues.map((i) => i.id).join(',')}`
                        )
                      }
                      className="ui-link inline-flex h-[34px] min-w-[84px] items-center justify-center rounded-[10px] border border-[#b9caff] px-3 transition-colors hover:bg-[#f7faff]"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </DashboardShell>
  );
}

export default RequestAentPage;
