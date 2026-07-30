"use client";

import React, { useState } from "react";
import { SMEProfile } from "@/types";
import { Wallet, ArrowUpRight, ArrowDownRight, History, Database, FileText, Search } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

interface AccountOverviewProps {
  sme: SMEProfile;
}

export default function AccountOverview({ sme }: AccountOverviewProps) {
  const [showLedger, setShowLedger] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const monthlyInflows = sme.monthlyInflows || sme.historyInflows || [0, 0, 0, 0, 0, 0];
  const monthlyOutflows = sme.monthlyOutflows || sme.historyOutflows || [0, 0, 0, 0, 0, 0];
  const currentBalance = sme.currentBalance ?? sme.initialBalance ?? 0;

  const MONTHS = ["M1", "M2", "M3", "M4", "M5", "M6"];
  const chartData = MONTHS.map((m, i) => ({
    month: m,
    inflow: monthlyInflows[i] || 0,
    outflow: monthlyOutflows[i] || 0,
    net: (monthlyInflows[i] || 0) - (monthlyOutflows[i] || 0),
  }));

  const avgInflow = monthlyInflows.reduce((a, b) => a + b, 0) / (monthlyInflows.length || 1);
  const avgOutflow = monthlyOutflows.reduce((a, b) => a + b, 0) / (monthlyOutflows.length || 1);

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
    <div className="space-y-6">
      {/* Account Info Banner */}
      <div className="bg-[#012A4A] text-white rounded-2xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#00B7E4] uppercase tracking-wider">
              Your UBL Bank Account
            </span>
            <h2 className="text-xl font-extrabold text-white">{sme.name}</h2>
            <p className="text-xs text-slate-300 font-medium">
              {sme.sector} • {sme.city}, Pakistan • IBAN: {sme.iban}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                <Wallet className="w-3.5 h-3.5 text-[#00B7E4]" />
                <span>Account Balance</span>
              </span>
              <span className="text-base font-extrabold text-white mt-1 block">
                PKR {currentBalance.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-[#1E9E5A]" />
                <span>Avg Monthly Money In</span>
              </span>
              <span className="text-base font-extrabold text-[#1E9E5A] mt-1 block">
                PKR {(avgInflow / 1000).toFixed(0)}k
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-[#D6455B]" />
                <span>Avg Monthly Money Out</span>
              </span>
              <span className="text-base font-extrabold text-[#D6455B] mt-1 block">
                PKR {(avgOutflow / 1000).toFixed(0)}k
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Past 6-Month Cashflow Graph (NO FORECAST) */}
      <div className="bg-white rounded-2xl p-6 border border-[#E4EBF2] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E4EBF2] pb-3 gap-2">
          <div>
            <h3 className="font-bold text-[#0E1B2A] text-base">
              6-Month Money History (M1 - M6)
            </h3>
            <p className="text-xs text-[#5B6B7C]">
              Monthly money coming in and going out of your account
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0083CA] inline-block"></span>
              <span className="text-[#0E1B2A]">Money In</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#D6455B] inline-block"></span>
              <span className="text-[#0E1B2A]">Money Out</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4EBF2" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5B6B7C" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#5B6B7C" }}
                tickFormatter={(val) => `PKR ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(value: any) => [`PKR ${Number(value || 0).toLocaleString()}`, "Amount"]} />
              <Legend />
              <Line type="monotone" name="Money In" dataKey="inflow" stroke="#0083CA" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" name="Money Out" dataKey="outflow" stroke="#D6455B" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Past Transaction Ledger Window */}
      <div className="bg-white rounded-2xl p-6 border border-[#E4EBF2] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E4EBF2] pb-3 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-[#0083CA]" />
              <h3 className="font-bold text-[#0E1B2A] text-base">Past Transactions</h3>
            </div>
            <p className="text-xs text-[#5B6B7C]">History of payments and deposits</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-[#5B6B7C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E4EBF2] focus:outline-none focus:border-[#0083CA]"
              />
            </div>

            <button
              onClick={() => setShowLedger(!showLedger)}
              className="px-3 py-1.5 bg-[#F4F7FB] hover:bg-[#E4EBF2] text-[#0E1B2A] rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border border-[#E4EBF2]"
            >
              <Database className="w-3.5 h-3.5 text-[#0083CA]" />
              <span>{showLedger ? "Toggle Empty View" : "Show Transactions"}</span>
            </button>
          </div>
        </div>

        {!showLedger ? (
          <div className="text-center py-12 bg-[#F4F7FB] rounded-xl border border-[#E4EBF2] border-dashed space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-sm text-[#0E1B2A]">No Transactions Recorded</h4>
            <p className="text-xs text-[#5B6B7C]">Your core bank transactions will automatically sync here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#012A4A] text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Txn ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EBF2] font-medium text-[#0E1B2A]">
                {filteredTxns.map((txn) => (
                  <tr key={txn.id} className="hover:bg-[#F4F7FB] transition-all">
                    <td className="p-3 font-mono font-bold text-[#0083CA]">{txn.id}</td>
                    <td className="p-3 text-[#5B6B7C]">{txn.date}</td>
                    <td className="p-3 font-semibold text-[#0E1B2A]">{txn.desc}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[#F4F7FB] text-[#0E1B2A] font-semibold text-[11px] border border-[#E4EBF2]">
                        {txn.category}
                      </span>
                    </td>
                    <td className="p-3">
                      {txn.type === "INFLOW" ? (
                        <span className="inline-flex items-center space-x-1 text-[#1E9E5A] font-bold bg-[#1E9E5A]/10 px-2 py-0.5 rounded-full text-[11px]">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Money In</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[#D6455B] font-bold bg-[#D6455B]/10 px-2 py-0.5 rounded-full text-[11px]">
                          <ArrowDownRight className="w-3 h-3" />
                          <span>Money Out</span>
                        </span>
                      )}
                    </td>
                    <td
                      className={`p-3 text-right font-extrabold ${
                        txn.type === "INFLOW" ? "text-[#1E9E5A]" : "text-[#D6455B]"
                      }`}
                    >
                      {txn.type === "INFLOW" ? "+" : "-"}PKR {txn.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
