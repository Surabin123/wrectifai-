'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Headset, Info, PenLine, FileText, ThumbsUp, Zap, Check, ImageIcon, Video, Mic, Trash2 } from 'lucide-react';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { Card } from '@/components/common/card';
import {
  ConfidenceGauge,
  ResultTrustFooter,
  resultIssues,
  resultNextSteps,
  resultSummaryItems,
  sharedIcons,
} from '@/components/ai-diagnose/diagnose-flow-shared';
import { cn } from '@/utils/cn';
import { getVehicleImage } from '@/lib/vehicle-image-catalog';

const { PhoneCall, Send, ShieldCheck } = sharedIcons;

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage?: number;
}

export function AIDiagnoseResultsPage() {
  const router = useRouter();
  const pageRootRef = useRef<HTMLDivElement>(null);
  const [selectedVehicle] = useState<Vehicle | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wrectifai_selected_vehicle');
      if (stored) {
        try {
          return JSON.parse(stored) as Vehicle;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return null;
  });
  const [selectedIssues, setSelectedIssues] = useState<string[]>(['wheel-balance', 'wheel-alignment']);
  const [detailsText, setDetailsText] = useState('');
  const [activeTab, setActiveTab] = useState('Text Details');
  const [uploadedPhotos, setUploadedPhotos] = useState<{ id: string; url: string; name: string }[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<{ name: string; size: string } | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<{ name: string; size: string } | null>(null);


  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setUploadedPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    setUploadedVideo({
      name: file.name,
      size: `${sizeMB} MB`
    });
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    setUploadedAudio({
      name: file.name,
      size: `${sizeMB} MB`
    });
  };

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

  const selectedCount = selectedIssues.length;
  const detailsTabs = ['Text Details', 'Photo', 'Video', 'Audio'];

  return (
    <DashboardShell header={<TopNavbar />}>
      <div ref={pageRootRef} className="space-y-5 pb-6 pt-1">
        <div className="space-y-2">
          <Link
            href="/home"
            className="inline-flex items-center gap-1 text-[13px] font-bold text-[#17307a] transition-colors hover:text-[#1a56db]"
          >
            <ChevronLeft className="h-4 w-4 shrink-0 -ml-1" />
            <span>Back to Home</span>
          </Link>
          <div>
            <h1 className="text-[28px] lg:text-[32px] font-bold tracking-tight text-[#17307a]">
              WrectifAI Diagnosis Results
            </h1>
            <p className="mt-1 text-[14.5px] text-[#5f7099]">Here&apos;s what WrectifAI found based on your input</p>
          </div>
        </div>

        <Card className="rounded-[18px] border-[#e6ecfb] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[15.5px] font-bold text-[#17307a]">Your Issue</div>
              <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-[#4c5f8f]">
                Car is shaking at 70-80 kmph and I can feel vibration in the steering wheel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/ai-diagnose')}
              className="inline-flex h-[36px] items-center justify-center gap-2 rounded-[10px] border border-[#dbe6ff] bg-white px-4 text-[13px] font-semibold text-[#1a56db] hover:bg-[#f5f8ff] transition-all shadow-sm"
            >
              <PenLine className="h-4 w-4" />
              <span>Edit Issue</span>
            </button>
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_242px]">
          <div className="space-y-5">
            <Card className="rounded-[18px] border-[#e6ecfb] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[17px] font-bold text-[#17307a]">WrectifAI Diagnosis Summary</h2>
                <span className="rounded-full bg-[#e8f8eb] px-2.5 py-0.5 text-[11px] font-bold text-[#25a24a]">
                  Analysis completed in 8.4s
                </span>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="flex flex-col items-center justify-center rounded-[14px] bg-[radial-gradient(circle_at_top,#f8faff_0%,#ffffff_70%)] border border-[#e8ecf8] px-4 py-4 text-center">
                  <Image
                    src={getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year)}
                    alt="Car"
                    width={230}
                    height={132}
                    className="h-auto w-[180px] object-contain"
                    unoptimized={true}
                  />
                  <div className="mt-3 text-[14px] font-bold text-[#17307a]">
                    {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.vin ? `(${selectedVehicle.vin.slice(-6)})` : ''}` : 'Honda City (TS07 AB 1234)'}
                  </div>
                  <div className="mt-1.5 flex items-center justify-center gap-2 text-[12.5px] text-[#5f7099]">
                    <span>{selectedVehicle ? (selectedVehicle.vin ? 'VIN Verified' : 'Petrol') : 'Petrol'}</span>
                    <span className="text-[#8ea0c7]">•</span>
                    <span>{selectedVehicle ? selectedVehicle.year : '2018'}</span>
                  </div>
                  <div className="mt-1 text-[12.5px] text-[#5f7099]">
                    {selectedVehicle && selectedVehicle.mileage !== undefined && selectedVehicle.mileage !== null
                      ? `Mileage: ${selectedVehicle.mileage.toLocaleString()} miles`
                      : 'KM Driven: 58,320 km'}
                  </div>
                </div>

                <div>
                  <p className="text-center text-[13px] text-[#6b7ba5] lg:text-left leading-relaxed">
                    WrectifAI analysis indicates potential issues that need immediate attention.
                  </p>
                  <div className="mt-5 space-y-4">
                    {resultSummaryItems.map(({ title, heading, body, pill, pillClass, icon: Icon, iconClass }) => (
                      <div key={title} className="flex items-start gap-3.5">
                        <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', iconClass)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] font-semibold text-[#8ea0c7]">{title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2.5">
                            <div className="text-[14.5px] font-bold text-[#17307a] leading-tight">{heading}</div>
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', pillClass)}>
                              {pill}
                            </span>
                          </div>
                          {body ? <p className="mt-1.5 text-[13px] leading-relaxed text-[#5f7099]">{body}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-[18px] border-[#e6ecfb] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-bold text-[#17307a]">Top Possible Issues</h2>
                  <span className="text-[12.5px] font-medium text-[#5f7099]">(Select one or more to request quotes)</span>
                </div>
                <button type="button" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2451f6]">
                  <Info className="h-3.5 w-3.5" />
                  <span>Understand Results</span>
                </button>
              </div>

              <div className="mt-4 divide-y divide-[#edf1fb]">
                {resultIssues.map((issue, index) => {
                  const checked = selectedIssues.includes(issue.id);
                  const finalImageSrc = getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year);
                  return (
                    <div key={issue.id} className="grid gap-4 py-5 md:grid-cols-[30px_70px_minmax(0,1fr)_90px_105px] md:items-center">
                      <div className="flex items-start justify-center pt-1">
                        <div
                          onClick={() =>
                            setSelectedIssues((current) =>
                              current.includes(issue.id)
                                ? current.filter((item) => item !== issue.id)
                                : [...current, issue.id]
                            )
                          }
                          className={cn(
                            'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border transition-all',
                            checked
                              ? 'border-[#2451f6] bg-[#2451f6] text-white'
                              : 'border-[#cdd9fb] bg-white hover:border-[#2451f6]'
                          )}
                        >
                          {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </div>
                      <div className="flex justify-center md:justify-start">
                        <Image
                          src={finalImageSrc}
                          alt={issue.title}
                          width={72}
                          height={72}
                          className="h-[64px] w-[64px] object-contain"
                          unoptimized={finalImageSrc.includes('/api/v1/vehicles/image')}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="text-[15.5px] font-bold text-[#17307a]">
                            {index + 1}. {issue.title}
                          </div>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', issue.badgeClass)}>
                            {issue.badge}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5f7099]">{issue.description}</p>
                        <div className="mt-2.5 text-[12px] font-bold text-[#3d568f]">Risk if ignored:</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#5f7099]">
                          {issue.risks.map((risk) => (
                            <span key={risk} className="flex items-center gap-1">
                              <span className="text-[#8ea0c7]">•</span>
                              <span>{risk}</span>
                            </span>
                          ))}
                        </div>
                        <div className="mt-2.5 text-[12.5px] text-[#5f7099]">
                          <span className="font-bold text-[#3d568f]">Estimated Cost:</span>{' '}
                          <span className="font-bold text-[#17307a]">{issue.estimatedCost}</span>
                        </div>
                      </div>
                      <div className="text-left md:text-center">
                        <div className="text-[36px] font-bold tracking-tight text-[#17307a] leading-none">{issue.match}%</div>
                        <div className="text-[11.5px] font-semibold text-[#8ea0c7] mt-1">Match</div>
                      </div>
                      <div className="flex items-center md:justify-end">
                        <button
                          type="button"
                          className="inline-flex h-[36px] items-center justify-center rounded-[10px] border border-[#dbe6ff] bg-white px-4 text-[13px] font-semibold text-[#1a56db] hover:bg-[#f5f8ff] transition-all shadow-sm"
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
            <Card className="rounded-[18px] border-[#e6ecfb] bg-white px-4 py-5 text-center shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
              <h3 className="text-[15.5px] font-bold text-[#17307a]">Diagnosis Confidence</h3>
              <div className="mt-5">
                <ConfidenceGauge value={92} />
              </div>
              <p className="mx-auto mt-5 max-w-[190px] text-[12.5px] leading-relaxed text-[#5f7099]">
                Based on WrectifAI analysis of your issue description and thousands of similar cases.
              </p>
            </Card>

            <Card className="rounded-[18px] border-[#ffe4e2] bg-[linear-gradient(180deg,#fff8f7_0%,#fffdfd_100%)] px-4 py-5 shadow-[0_8px_24px_rgba(255,102,102,0.04)]">
              <h3 className="text-[15.5px] font-bold text-[#ff4a43]">Need Immediate Help?</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#735a66]">
                Talk to our experts or get roadside assistance
              </p>
              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  className="flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#c7d6ff] bg-white text-[13px] font-bold text-[#2451f6] hover:bg-[#f5f8ff] transition-all shadow-sm"
                >
                  <PhoneCall className="h-4 w-4 text-[#2451f6]" />
                  <span>Call Support</span>
                </button>
                <button
                  type="button"
                  className="flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#c7d6ff] bg-white text-[13px] font-bold text-[#2451f6] hover:bg-[#f5f8ff] transition-all shadow-sm"
                >
                  <Headset className="h-4 w-4 text-[#2451f6]" />
                  <span>Roadside Assistance</span>
                </button>
              </div>
              <div className="mt-4 inline-flex rounded-full bg-[#ffe8e7] px-3 py-1 text-[11px] font-semibold text-[#ff584d]">
                24/7 Available
              </div>
            </Card>

            <Card className="rounded-[22px] border-[#e6ecfb] bg-white px-4 py-6 shadow-[0_12px_30px_rgba(37,73,153,0.04)]">
              <h3 className="text-[16px] font-semibold text-[#183db1]">Next Steps</h3>
              <div className="relative mt-6 space-y-6">
                <div className="absolute left-[15px] top-4 bottom-4 w-[1.5px] bg-[#e4ecff] z-0" />
                {resultNextSteps.map((step, index) => {
                  const stepIcons = [FileText, ThumbsUp, Zap, ShieldCheck];
                  const IconComponent = stepIcons[index];
                  return (
                    <div key={step.step} className="flex gap-3 relative z-10">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2f5ff] text-[12px] font-semibold text-[#3059e1] z-10 border border-white">
                        {step.step}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-[#2243a4]">{step.title}</div>
                        <p className="mt-1 text-[12px] leading-5 text-[#6b7ca8]">{step.body}</p>
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-[6px] bg-[#f2f5ff] px-2.5 py-1 text-[11px] font-medium text-[#2451f6]">
                          {IconComponent && <IconComponent className="h-3 w-3 text-[#2451f6]" />}
                          <span>{step.meta}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                <div className="text-[17px] font-bold text-[#17307a]">
                  Ready to get the best quotes from trusted garages?
                </div>
                <p className="mt-1 text-[13px] text-[#5f7099]">
                  Send your selected issues and compare the best offers.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-1.5 lg:items-end">
              <button
                type="button"
                onClick={() => {
                  const returnGarage = sessionStorage.getItem('return_to_garage');
                  if (returnGarage) {
                    const diagnosisText = selectedIssues.map(id => resultIssues.find(r => r.id === id)?.title).filter(Boolean).join(', ');
                    sessionStorage.setItem('ai_diagnose_result', `WrectifAI Diagnosis: ${diagnosisText}`);
                    sessionStorage.removeItem('return_to_garage');
                    router.push(`/garages/${returnGarage}?quote=true`);
                  } else {
                    router.push(`/finding-quotes?issues=${selectedIssues.join(',')}`);
                  }
                }}
                className="flex h-[46px] items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(90deg,#1a46e8_0%,#245cff_100%)] px-6 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_rgba(37,82,235,0.18)] transition-transform hover:scale-[1.01]"
              >
                <Send className="h-4.5 w-4.5" />
                <span>Request Quotes ({selectedCount})</span>
              </button>
              <div className="text-[11.5px] text-[#7f8eb5]">You will receive quotes within 30 mins</div>
            </div>
          </div>
        </Card>

        <ResultTrustFooter />
      </div>
    </DashboardShell>
  );
}

export default AIDiagnoseResultsPage;
