'use client';

import { SupportModal } from '@/components/common/support-modal';
import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { useRouter } from 'next/navigation';
import { Plus, Send, History, CreditCard, ChevronRight, HelpCircle, Gift, ArrowDownToLine, ArrowUpRight, Gift as GiftIcon, Download, Smartphone } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/common/modal';
 
import jsPDF from 'jspdf';
 
import autoTable from 'jspdf-autotable';

import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { formatCurrency } from '@/lib/currency';
import { fetchWalletBalance, fetchWalletTransactions, addWalletFunds } from '@/lib/wallet-api';

const mockInitialTransactions = [
  { id: 1, date: '04 Aug 2026', time: '2:19 PM', desc: 'Added Money', subdesc: 'via UPI', type: 'Credit', amount: 1000.00, status: 'Completed', icon: ArrowDownToLine, color: 'text-green-600', bg: 'bg-green-50', customer: 'Surabi N', garage: 'N/A', vehicle: 'N/A', invoice: 'INV-1001', method: 'UPI (surabi@okaxis)' },
  { id: 2, date: '03 Aug 2026', time: '11:45 AM', desc: 'Payment for Booking', subdesc: 'Job-48EAEB9D', type: 'Debit', amount: 550.00, status: 'Completed', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50', customer: 'Surabi N', garage: 'Speed Car Garage', vehicle: 'Toyota Camry', invoice: 'INV-1002', method: 'Wallet Balance' },
  { id: 3, date: '02 Aug 2026', time: '5:30 PM', desc: 'Cashback Received', subdesc: 'Referral Bonus', type: 'Credit', amount: 50.00, status: 'Completed', icon: GiftIcon, color: 'text-green-600', bg: 'bg-green-50', customer: 'Surabi N', garage: 'N/A', vehicle: 'N/A', invoice: 'N/A', method: 'Promo Code' },
  { id: 4, date: '01 Aug 2026', time: '9:10 AM', desc: 'Payment for Quote', subdesc: 'REQ-C2FEB431', type: 'Debit', amount: 220.00, status: 'Failed', icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50', customer: 'Surabi N', garage: 'Metro Auto Bay', vehicle: 'Toyota Camry', invoice: 'INV-1004', method: 'Chase Bank **** 4242' },
  { id: 5, date: '31 Jul 2026', time: '7:22 PM', desc: 'Added Money', subdesc: 'via Card', type: 'Credit', amount: 500.00, status: 'Pending', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50', customer: 'Surabi N', garage: 'N/A', vehicle: 'N/A', invoice: 'INV-1005', method: 'Chase Bank **** 4242' },
  { id: 6, date: '28 Jul 2026', time: '10:15 AM', desc: 'Payment for Service', subdesc: 'General Maintenance', type: 'Debit', amount: 120.00, status: 'Completed', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50', customer: 'Surabi N', garage: 'Prime Auto Care', vehicle: 'Toyota Camry', invoice: 'INV-1006', method: 'Wallet Balance' },
  { id: 7, date: '25 Jul 2026', time: '4:40 PM', desc: 'Added Money', subdesc: 'via Card', type: 'Credit', amount: 200.00, status: 'Completed', icon: ArrowDownToLine, color: 'text-green-600', bg: 'bg-green-50', customer: 'Surabi N', garage: 'N/A', vehicle: 'N/A', invoice: 'INV-1007', method: 'Chase Bank **** 4242' },
  { id: 8, date: '22 Jul 2026', time: '1:20 PM', desc: 'Payment for Repair', subdesc: 'Brake Pad Replacement', type: 'Debit', amount: 310.00, status: 'Completed', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50', customer: 'Surabi N', garage: 'AutoFix Garage', vehicle: 'Toyota Camry', invoice: 'INV-1008', method: 'Wallet Balance' },
  { id: 9, date: '19 Jul 2026', time: '9:00 AM', desc: 'Refund', subdesc: 'Overcharged Service', type: 'Credit', amount: 45.00, status: 'Completed', icon: ArrowDownToLine, color: 'text-green-600', bg: 'bg-green-50', customer: 'Surabi N', garage: 'Speed Car Garage', vehicle: 'Toyota Camry', invoice: 'INV-1009', method: 'Wallet Balance' },
  { id: 10, date: '15 Jul 2026', time: '11:11 AM', desc: 'Payment for Tires', subdesc: '2x Michelin Pilot Sport', type: 'Debit', amount: 450.00, status: 'Completed', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50', customer: 'Surabi N', garage: 'Tyre Hub', vehicle: 'Toyota Camry', invoice: 'INV-1010', method: 'Chase Bank **** 4242' },
  { id: 11, date: '10 Jul 2026', time: '3:30 PM', desc: 'Added Money', subdesc: 'via UPI', type: 'Credit', amount: 800.00, status: 'Completed', icon: ArrowDownToLine, color: 'text-green-600', bg: 'bg-green-50', customer: 'Surabi N', garage: 'N/A', vehicle: 'N/A', invoice: 'INV-1011', method: 'UPI (surabi@okaxis)' },
  { id: 12, date: '05 Jul 2026', time: '2:45 PM', desc: 'Payment for Diagnostics', subdesc: 'Engine Check Light', type: 'Debit', amount: 85.00, status: 'Completed', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50', customer: 'Surabi N', garage: 'Metro Auto Bay', vehicle: 'Toyota Camry', invoice: 'INV-1012', method: 'Wallet Balance' },
  { id: 13, date: '01 Jul 2026', time: '10:00 AM', desc: 'Cashback Received', subdesc: 'July Promo', type: 'Credit', amount: 20.00, status: 'Completed', icon: GiftIcon, color: 'text-green-600', bg: 'bg-green-50', customer: 'Surabi N', garage: 'N/A', vehicle: 'N/A', invoice: 'N/A', method: 'Promo Code' },
  { id: 14, date: '28 Jun 2026', time: '4:15 PM', desc: 'Payment for Wash', subdesc: 'Premium Detailing', type: 'Debit', amount: 150.00, status: 'Completed', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50', customer: 'Surabi N', garage: 'Prime Auto Care', vehicle: 'Toyota Camry', invoice: 'INV-1014', method: 'Wallet Balance' },
  { id: 15, date: '25 Jun 2026', time: '12:30 PM', desc: 'Added Money', subdesc: 'via Card', type: 'Credit', amount: 300.00, status: 'Completed', icon: ArrowDownToLine, color: 'text-green-600', bg: 'bg-green-50', customer: 'Surabi N', garage: 'N/A', vehicle: 'N/A', invoice: 'INV-1015', method: 'Chase Bank **** 4242' },
];

export function WalletPaymentsPage() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('wrectifai-user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.mobile_number) setUserPhone(user.mobile_number);
        else if (user && user.phone) setUserPhone(user.phone);
      }
    } catch(e) {}
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(0);

  const loadWalletData = async () => {
    try {
      const [{ balance: fetchedBalance }, fetchedTxs] = await Promise.all([
        fetchWalletBalance(),
        fetchWalletTransactions()
      ]);
      
      setBalance(fetchedBalance);
      
      const mappedTxs = fetchedTxs.map(tx => {
        const dateObj = new Date(tx.createdAt);
        const isCredit = tx.type === 'CREDIT' || tx.type === 'RELEASE';
        
        let desc = 'Wallet Transaction';
        let subdesc = tx.referenceType || 'Wallet';
        
        if (tx.type === 'HOLD') desc = 'Payment Hold';
        if (tx.type === 'RELEASE') desc = 'Hold Released';
        if (tx.type === 'DEBIT') desc = 'Payment for Booking';
        if (tx.type === 'CREDIT') desc = 'Added Money';
        if (tx.description) subdesc = tx.description;

        const statusMap: any = { 'PENDING': 'Pending', 'COMPLETED': 'Completed', 'FAILED': 'Failed' };

        return {
          ...tx,
          date: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          time: dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          desc,
          subdesc,
          type: isCredit ? 'Credit' : 'Debit',
          amount: Number(tx.amount),
          status: statusMap[tx.status] || 'Completed',
          icon: isCredit ? ArrowDownToLine : ArrowUpRight,
          color: isCredit ? 'text-green-600' : 'text-red-600',
          bg: isCredit ? 'bg-green-50' : 'bg-red-50',
          customer: 'N/A',
          garage: 'N/A',
          vehicle: 'N/A',
          invoice: 'N/A',
          method: 'Wallet'
        };
      });
      
      setTransactions(mappedTxs);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  // Modals
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  
  const [isLearnWalletOpen, setIsLearnWalletOpen] = useState(false);
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
  const [newMethodType, setNewMethodType] = useState('Card');
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wallet_methods');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          icon: m.type === 'UPI' ? Smartphone : CreditCard
        }));
      }
    }
    return [
      { id: 2, type: 'Card', details: 'Chase Bank **** 4242', expiry: '12/28', isDefault: true, icon: CreditCard },
    ];
  });

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Hydration fallback removed since states are lazily initialized

  // Save to localStorage when state changes
  // Not used anymore as we fetch from DB


  useEffect(() => {
    // Avoid serializing the React component icon
    const toSave = paymentMethods.map(({ icon, ...rest }: any) => rest);
    localStorage.setItem('wallet_methods', JSON.stringify(toSave));
  }, [paymentMethods]);

  useEffect(() => {
    const handleSearch = (e: CustomEvent) => setSearchQuery(e.detail);
    window.addEventListener('dashboard-search', handleSearch as EventListener);
    return () => window.removeEventListener('dashboard-search', handleSearch as EventListener);
  }, []);

  const filteredTransactions = transactions.filter((tx: any) => {
    if (activeTab === 'Payment History') {
      return tx.type === 'Debit' && (tx.desc.toLowerCase().includes(searchQuery.toLowerCase()) || tx.subdesc.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    const matchesTab = activeTab === 'All' || tx.status === activeTab;
    const matchesSearch = tx.desc.toLowerCase().includes(searchQuery.toLowerCase()) || tx.subdesc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const downloadReceipt = (tx: any) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Transaction Receipt', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [['Date', 'Description', 'Type', 'Amount', 'Status']],
      body: [[
        tx.date,
        tx.desc,
        tx.type,
        `${tx.type === 'Credit' ? '+' : '-'} ${formatCurrency(tx.amount, userPhone)}`,
        tx.status
      ]],
    });
    
    doc.save(`receipt_${tx.id}.pdf`);
  };

  const handleAddMoney = async () => {
    const amount = parseFloat(addMoneyAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    const method = paymentMethods.find((m: any) => m.isDefault)?.details || 'Card';
    try {
      const { razorpayOrderId, amount: orderAmount, currency } = await addWalletFunds(amount, `via ${method}`);
      
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert('Razorpay SDK failed to load. Are you online?');
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock123',
        amount: orderAmount,
        currency: currency,
        name: 'WrectifAI Wallet',
        description: 'Add Money to Wallet',
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          try {
            await import('@/lib/wallet-api').then(m => m.verifyWalletTopup({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amount
            }));
            await loadWalletData();
            setIsAddMoneyOpen(false);
            setAddMoneyAmount('');
          } catch (err) {
            console.error('Wallet verification failed', err);
            alert('Payment verification failed.');
          }
        },
        prefill: {
          contact: userPhone || '',
        },
        theme: { color: '#2563EB' }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed', response.error);
        alert('Payment failed: ' + response.error.description);
      });
      rzp.open();
    } catch (err) {
      console.error('Failed to add money:', err);
    }
  };

  const setAsDefault = (id: number) => {
    setPaymentMethods((methods: any[]) => methods.map((m: any) => ({ ...m, isDefault: m.id === id })));
  };

  return (
    <DashboardShell header={<TopNavbar />}>
      <div className="flex flex-col lg:flex-row gap-6 p-4">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Wallet & Payments</h1>
            <p className="text-slate-500 text-sm">Manage your wallet balance, payments and transaction history</p>
          </div>

          {/* Top Cards Row */}
          <div className="flex flex-col md:flex-row gap-4">
            <Card className="flex-1 p-6 relative overflow-hidden bg-gradient-to-r from-blue-50 to-white shadow-sm rounded-[24px]">
              <div className="relative z-10 w-2/3">
                <h3 className="text-slate-900 font-bold mb-1 text-sm">Wallet Balance</h3>
                <p className="text-4xl font-extrabold text-slate-900 mb-1">{formatCurrency(balance, userPhone)}</p>
                <p className="text-slate-500 text-xs mb-6">Total Balance</p>
                <Button onClick={() => setIsAddMoneyOpen(true)} className="bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm"><Plus className="w-4 h-4 mr-2"/> Add Money</Button>
              </div>
              <div className="absolute right-0 bottom-0 h-full w-40 opacity-90 hidden sm:flex items-center justify-center">
                 <Image src="/assets/Electrical.png" alt="Wallet" width={140} height={140} className="object-contain" />
              </div>
            </Card>

            <Card className="w-full md:w-80 p-6 shadow-sm border-slate-100 flex flex-col justify-between rounded-[24px]">
              <div>
                <h3 className="font-bold text-slate-900 mb-4 text-sm">Balance Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Main Balance</span>
                    <span className="font-bold text-slate-900">{formatCurrency(balance - 50, userPhone)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Bonus Balance</span>
                    <span className="font-bold text-green-600">{formatCurrency(50, userPhone)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Pending Refunds</span>
                    <span className="font-bold text-orange-500">{formatCurrency(0, userPhone)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button onClick={() => setIsLearnWalletOpen(true)} className="flex items-center text-blue-600 text-xs font-semibold hover:underline">
                   <HelpCircle className="w-3.5 h-3.5 mr-1" /> Learn about Wallet <ChevronRight className="w-3 h-3 ml-auto" />
                </button>
              </div>
            </Card>
          </div>

          {searchQuery && (
            <div className="text-sm font-medium text-slate-600">
              Searching transactions for: <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">&quot;{searchQuery}&quot;</span>
            </div>
          )}

          {/* Transactions Tabs */}
          <Card className="p-0 shadow-sm border-slate-100 rounded-[24px] overflow-hidden">
             <div className="flex justify-between items-center pr-4 border-b border-slate-100 bg-white">
               <div className="flex overflow-x-auto">
                 {['All', 'Completed', 'Pending', 'Failed', 'Payment History'].map(tab => (
                   <button 
                     key={tab}
                     onClick={() => setActiveTab(tab)}
                     className={cn("px-6 py-4 font-bold text-sm border-b-2 whitespace-nowrap", activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800")}
                   >
                     {tab === 'All' ? 'Transactions' : tab}
                   </button>
                 ))}
               </div>
             </div>
             
             <div className="p-0 overflow-x-auto bg-white">
               <table className="w-full min-w-[700px] text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-100">
                   <tr>
                     <th className="px-6 py-4 font-medium">Date & Time</th>
                     <th className="px-6 py-4 font-medium">Description</th>
                     <th className="px-6 py-4 font-medium">Type</th>
                     <th className="px-6 py-4 font-medium">Amount</th>
                     <th className="px-6 py-4 font-medium text-center">Status</th>
                     <th className="px-6 py-4"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredTransactions.map((tx: any) => (
                     <tr key={tx.id} onClick={() => setSelectedTransaction(tx)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", tx.bg, tx.color)}>
                             <tx.icon className="w-5 h-5" />
                           </div>
                           <div>
                             <p className="font-semibold text-slate-900">{tx.date}</p>
                             <p className="text-xs text-slate-500">{tx.time}</p>
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         <p className="font-semibold text-slate-900">{tx.desc}</p>
                         <p className="text-xs text-slate-500">{tx.subdesc}</p>
                       </td>
                       <td className="px-6 py-4">
                         <span className={cn("px-2 py-1 rounded text-xs font-bold", tx.type === 'Credit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}>
                           {tx.type}
                         </span>
                       </td>
                       <td className="px-6 py-4">
                         <p className={cn("font-bold", tx.type === 'Credit' ? 'text-green-600' : 'text-slate-900')}>
                           {tx.type === 'Credit' ? '+ ' : '- '} {formatCurrency(tx.amount, userPhone)}
                         </p>
                       </td>
                       <td className="px-6 py-4 text-center">
                         <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", 
                           tx.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' :
                           tx.status === 'Pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                           'bg-red-50 text-red-600 border-red-100'
                         )}>{tx.status}</span>
                       </td>
                       <td className="px-6 py-4 text-right">
                         <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 ml-auto" />
                       </td>
                     </tr>
                   ))}
                   {filteredTransactions.length === 0 && (
                     <tr>
                       <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                         No transactions found.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[320px] space-y-6">
          <Card className="p-5 shadow-sm border-slate-100 rounded-[20px] bg-white">
            <h3 className="font-bold text-slate-900 mb-4">Saved Payment Methods</h3>
            <div className="space-y-4">
               {paymentMethods.map((method: any) => (
                 <div key={method.id} onClick={() => setAsDefault(method.id)} className={cn("flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors", method.isDefault ? "border-blue-500 bg-blue-50/30" : "border-slate-100 hover:border-blue-200 bg-white")}>
                    <div className="w-10 h-10 bg-slate-50 rounded flex items-center justify-center">
                      <method.icon className={cn("w-5 h-5", method.isDefault ? "text-blue-600" : "text-slate-500")} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{method.type === 'Card' ? method.details : 'UPI ID'}</p>
                      <p className="text-xs text-slate-500">{method.type === 'Card' ? `Expires ${method.expiry}` : method.details}</p>
                    </div>
                    {method.isDefault && <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded">Default</span>}
                 </div>
               ))}
               
               <Button variant="outline" className="w-full text-blue-600 border-dashed border-slate-300 hover:bg-slate-50" onClick={() => setIsAddMethodOpen(true)}>
                 <Plus className="w-4 h-4 mr-2" /> Add New Card / UPI
               </Button>
            </div>
          </Card>
          
          <Card className="p-5 shadow-sm border-slate-100 bg-white rounded-[20px]">
            <h3 className="font-bold text-slate-900 mb-2">Need Help?</h3>
            <p className="text-sm text-slate-500 mb-4">Facing issues with payments? We&apos;re here to help you.</p>
            <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => setIsSupportModalOpen(true)}>
              <HelpCircle className="w-4 h-4 mr-2" /> Contact Support
            </Button>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isAddMoneyOpen} onClose={() => setIsAddMoneyOpen(false)} title="Add Money to Wallet">
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Enter Amount ({formatCurrency(0, userPhone).charAt(0)})</label>
            <input type="number" className="w-full border border-slate-200 rounded-lg p-3 text-lg font-bold focus:outline-none focus:border-blue-500" placeholder="100.00" value={addMoneyAmount} onChange={(e) => setAddMoneyAmount(e.target.value)} />
          </div>
          <Button className="w-full bg-blue-600 text-white" onClick={handleAddMoney}>Confirm & Add</Button>
        </div>
      </Modal>

      <Modal isOpen={isLearnWalletOpen} onClose={() => setIsLearnWalletOpen(false)} title="About Your Wallet">
        <div className="space-y-4 py-2 text-sm text-slate-600">
          <p><strong className="text-slate-900">Main Balance:</strong> The actual money you have added via cards or UPI.</p>
          <p><strong className="text-slate-900">Bonus Balance:</strong> Promotional credits or cashback. Cannot be withdrawn, only used for bookings.</p>
          <p><strong className="text-slate-900">Pending Refunds:</strong> Refunds currently processing back to your original payment method.</p>
          <p><strong className="text-slate-900">Wallet Usage:</strong> Your wallet balance is automatically prioritized during checkout for services and parts.</p>
          <Button className="w-full mt-4" onClick={() => setIsLearnWalletOpen(false)}>Got it</Button>
        </div>
      </Modal>

      <Modal isOpen={isAddMethodOpen} onClose={() => setIsAddMethodOpen(false)} title="Add Payment Method">
        <div className="space-y-4 py-2">
          <div className="flex border-b border-slate-200 mb-4">
            <button className={cn("flex-1 py-2 text-sm font-bold border-b-2", newMethodType === 'Card' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500")} onClick={() => setNewMethodType('Card')}>Credit/Debit Card</button>
            <button className={cn("flex-1 py-2 text-sm font-bold border-b-2", newMethodType === 'UPI' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500")} onClick={() => setNewMethodType('UPI')}>UPI</button>
          </div>
          
          {newMethodType === 'Card' ? (
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Card Number" 
                maxLength={16}
                onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '') }}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500" 
              />
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="MM/YY" 
                  maxLength={5}
                  onInput={(e) => {
                    let val = e.currentTarget.value.replace(/\D/g, '');
                    if (val.length >= 2) {
                      val = val.substring(0, 2) + '/' + val.substring(2, 4);
                    }
                    e.currentTarget.value = val;
                  }}
                  onBlur={(e) => {
                    const val = e.currentTarget.value;
                    if (val.length === 5) {
                      const [m, y] = val.split('/');
                      const month = parseInt(m, 10);
                      const year = parseInt(y, 10);
                      if (year < 26 || (year === 26 && month < 8) || month < 1 || month > 12) {
                        e.currentTarget.value = '';
                      }
                    } else {
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-1/2 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500" 
                />
                <input 
                  type="text" 
                  placeholder="CVV" 
                  maxLength={3}
                  onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '') }}
                  className="w-1/2 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500" 
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input type="text" placeholder="UPI ID (e.g. name@bank)" className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          )}
          
          <Button className="w-full mt-4 bg-blue-600 text-white" onClick={() => {
            setPaymentMethods([...paymentMethods, { id: Date.now(), type: newMethodType, details: newMethodType === 'Card' ? 'New Bank **** 1234' : 'new@upi', expiry: '11/29', isDefault: false, icon: newMethodType === 'Card' ? CreditCard : Smartphone }]);
            setIsAddMethodOpen(false);
          }}>Save Method</Button>
        </div>
      </Modal>

      <Modal isOpen={!!selectedTransaction} onClose={() => setSelectedTransaction(null)} title="Transaction Details">
        {selectedTransaction && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", selectedTransaction.bg, selectedTransaction.color)}>
                 <selectedTransaction.icon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedTransaction.type === 'Credit' ? '+ ' : '- '} {formatCurrency(selectedTransaction.amount, userPhone)}</h2>
              <p className="text-slate-500">{selectedTransaction.status}</p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Customer</span>
                <span className="font-bold text-slate-900">{selectedTransaction.customer}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Garage</span>
                <span className="font-bold text-slate-900">{selectedTransaction.garage}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Vehicle</span>
                <span className="font-bold text-slate-900">{selectedTransaction.vehicle}</span>
              </div>

              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Invoice</span>
                <span className="font-bold text-slate-900">{selectedTransaction.invoice}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-bold text-slate-900">{selectedTransaction.method}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Date</span>
                <span className="font-bold text-slate-900">{selectedTransaction.date} {selectedTransaction.time}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
               <Button className="flex-1" variant="outline" onClick={() => setSelectedTransaction(null)}>Close</Button>
               <Button className="flex-1 bg-blue-600 text-white" onClick={() => downloadReceipt(selectedTransaction)}>Download PDF</Button>
            </div>
          </div>
        )}
      </Modal>
      <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
    </DashboardShell>
  );
}

export default WalletPaymentsPage;