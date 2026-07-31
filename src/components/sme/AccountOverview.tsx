"use client";

import React, { useState } from "react";
import { SMEProfile } from "@/types";
import { Wallet, ArrowUpRight, ArrowDownRight, History, Database, FileText, Search, PieChart as PieIcon } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AccountOverviewProps {
  sme: SMEProfile;
}

export default function AccountOverview({ sme }: AccountOverviewProps) {
  const [showLedger, setShowLedger] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const MONTHS = ["M1", "M2", "M3", "M4", "M5 (Forecast)", "M6 (Forecast)"];
  const chartData = MONTHS.map((m, i) => ({
    month: m,
    inflow: sme.monthlyInflows[i],
    outflow: sme.monthlyOutflows[i],
    net: sme.monthlyInflows[i] - sme.monthlyOutflows[i],
    isForecast: i >= 4,
  }));

  const avgInflow = sme.monthlyInflows.reduce((a, b) => a + b, 0) / sme.monthlyInflows.length;
  const avgOutflow = sme.monthlyOutflows.reduce((a, b) => a + b, 0) / sme.monthlyOutflows.length;

  // Donut Chart Data (Design Spec Section 3.2 & Section 4.4)
  const donutData = [
    { name: "Cashflow Consistency", value: 25, color: "#2F96B4" },
    { name: "Revenue Trend", value: 25, color: "#4FACBE" },
    { name: "Expense Buffer", value: 20, color: "#74C0D1" },
    { name: "Supplier Behavior", value: 15, color: "#A1D4E0" },
    { name: "Seasonality Balance", value: 15, color: "#CEE8EF" },
  ];

  const sampleLedger = [
    { id: "TXN-9018", date: "2026-06-28", desc: "Wholesale Customer Collection", type: "INFLOW", category: "Sales Revenue", amount: 450000 },
    { id: "TXN-9017", date: "2026-06-25", desc: "Bulk Inventory Supplier Settlement", type: "OUTFLOW", category: "Supplier Payment", amount: 320000 },
    { id: "TXN-9016", date: "2026-06-20", desc: "Digital Store Collection via Raast QR", type: "INFLOW", category: "Sales Revenue", amount: 280000 },
    { id: "TXN-9015", date: "2026-06-15", desc: "Commercial Electricity & Utility Expense", type: "OUTFLOW", category: "Utilities", amount: 45000 },
    { id: "TXN-9014", date: "2026-06-10", desc: "Commercial Store Rent Payment", type: "OUTFLOW", category: "Rent & Overhead", amount: 110000 },
    { id: "TXN-9013", date: "2026-06-05", desc: "Distributor Payment Transfer", type: "INFLOW", category: "Sales Revenue", amount: 520000 },
  ];

  const filteredTxns = sampleLedger.filter(
    (t) =>
      t.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans w-full max-w-full overflow-x-hidden">
      {/* Account Info Banner */}
      <div className="bg-[#081921] text-white rounded-2xl p-5 sm:p-6 border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#2F96B4] uppercase tracking-wider">
              Your UBL Bank Account
            </span>
            <h2 className="text-xl font-bold text-white leading-tight">{sme.name}</h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {sme.sector} • {sme.city}, Pakistan • IBAN: {sme.iban}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                <Wallet className="w-3.5 h-3.5 text-[#2F96B4]" />
                <span>Account Balance</span>
              </span>
              <span className="text-base font-extrabold text-white mt-1 block">
                PKR {sme.currentBalance.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-[#2F96B4]" />
                <span>Avg Monthly In</span>
              </span>
              <span className="text-base font-extrabold text-[#2F96B4] mt-1 block">
                PKR {(avgInflow / 1000).toFixed(0)}k
              </span>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-[#D9534F]" />
                <span>Avg Monthly Out</span>
              </span>
              <span className="text-base font-extrabold text-[#D9534F] mt-1 block">
                PKR {(avgOutflow / 1000).toFixed(0)}k
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cashflow History & 6-Month Forecast Chart (Full Width) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2E6E7] shadow-sm space-y-4 w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E6E7] pb-3 gap-2">
          <div>
            <h3 className="font-semibold text-[#081921] text-base">
              Cashflow History & 6-Month Forecast
            </h3>
            <p className="text-xs text-[#5C6B70]">
              Monthly actuals (M1-M4) and projected cashflow (M5-M6)
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#2F96B4] inline-block"></span>
              <span className="text-[#081921]">Money In</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#D9534F] inline-block"></span>
              <span className="text-[#081921]">Money Out</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2 min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2F96B4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2F96B4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E6E7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5C6B70" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#5C6B70" }}
                tickFormatter={(val) => `PKR ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(value: any) => [`PKR ${Number(value || 0).toLocaleString()}`, "Amount"]} />
              <Area type="monotone" dataKey="inflow" fill="url(#colorInflow)" stroke="none" legendType="none" />
              <Line
                type="monotone"
                name="Money In"
                dataKey="inflow"
                stroke="#2F96B4"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#2F96B4" }}
              />
              <Line
                type="monotone"
                name="Money Out"
                dataKey="outflow"
                stroke="#D9534F"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: "#D9534F" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Past Transaction Ledger Window */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2E6E7] shadow-sm space-y-4 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E6E7] pb-3 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-[#2F96B4]" />
              <h3 className="font-semibold text-[#081921] text-base">Past Transactions</h3>
            </div>
            <p className="text-xs text-[#5C6B70]">History of payments and deposits</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto min-w-0 sm:min-w-[200px]">
              <Search className="w-4 h-4 text-[#5C6B70] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E2E6E7] focus:outline-none focus:border-[#2F96B4] focus:ring-2 focus:ring-[#2F96B4]/15"
              />
            </div>

            <button
              onClick={() => setShowLedger(!showLedger)}
              className="px-3 py-1.5 bg-[#F6F6F6] hover:bg-[#E2E6E7] text-[#081921] rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 border border-[#E2E6E7] cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#2F96B4]" />
              <span>{showLedger ? "Toggle Empty View" : "Show Transactions"}</span>
            </button>
          </div>
        </div>

        {!showLedger ? (
          <div className="text-center py-12 bg-[#F6F6F6] rounded-xl border border-[#E2E6E7] border-dashed space-y-2">
            <FileText className="w-10 h-10 text-[#5C6B70] mx-auto" />
            <h4 className="font-semibold text-sm text-[#081921]">No Transactions Recorded</h4>
            <p className="text-xs text-[#5C6B70]">Your core bank transactions will automatically sync here.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (block sm:hidden) - No horizontal scrolling needed! */}
            <div className="space-y-3 block sm:hidden">
              {filteredTxns.map((txn) => (
                <div key={txn.id} className="bg-white p-4 rounded-xl border border-[#E2E6E7] shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#2F96B4] bg-[#2F96B4]/10 px-2 py-0.5 rounded border border-[#2F96B4]/20">
                      {txn.id}
                    </span>
                    <span className="text-xs text-[#5C6B70]">{txn.date}</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold text-[#081921] text-xs leading-snug">{txn.desc}</h4>
                    <span className="inline-block px-2 py-0.5 rounded bg-[#F6F6F6] text-[#5C6B70] font-medium text-[10px] border border-[#E2E6E7]">
                      {txn.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#E2E6E7]/60">
                    {txn.type === "INFLOW" ? (
                      <span className="inline-flex items-center space-x-1 text-[#2F9E5E] font-semibold bg-[#2F9E5E]/15 px-2 py-0.5 rounded-full text-[11px]">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Money In</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[#D9534F] font-semibold bg-[#D9534F]/15 px-2 py-0.5 rounded-full text-[11px]">
                        <ArrowDownRight className="w-3 h-3" />
                        <span>Money Out</span>
                      </span>
                    )}

                    <span className={`font-bold text-xs ${txn.type === "INFLOW" ? "text-[#2F9E5E]" : "text-[#D9534F]"}`}>
                      {txn.type === "INFLOW" ? "+" : "-"}PKR {txn.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#081921] text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Txn ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6E7] font-medium text-[#081921]">
                  {filteredTxns.map((txn) => (
                    <tr key={txn.id} className="hover:bg-[#F6F6F6] transition-all">
                      <td className="p-3 font-mono font-bold text-[#2F96B4]">{txn.id}</td>
                      <td className="p-3 text-[#5C6B70]">{txn.date}</td>
                      <td className="p-3 font-semibold text-[#081921]">{txn.desc}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-[#F6F6F6] text-[#081921] font-semibold text-[11px] border border-[#E2E6E7]">
                          {txn.category}
                        </span>
                      </td>
                      <td className="p-3">
                        {txn.type === "INFLOW" ? (
                          <span className="inline-flex items-center space-x-1 text-[#2F9E5E] font-semibold bg-[#2F9E5E]/15 px-2 py-0.5 rounded-full text-[11px]">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Money In</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[#D9534F] font-semibold bg-[#D9534F]/15 px-2 py-0.5 rounded-full text-[11px]">
                            <ArrowDownRight className="w-3 h-3" />
                            <span>Money Out</span>
                          </span>
                        )}
                      </td>
                      <td
                        className={`p-3 text-right font-bold ${
                          txn.type === "INFLOW" ? "text-[#2F9E5E]" : "text-[#D9534F]"
                        }`}
                      >
                        {txn.type === "INFLOW" ? "+" : "-"}PKR {txn.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
