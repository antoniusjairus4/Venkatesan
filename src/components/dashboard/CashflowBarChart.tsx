import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatINR } from '@/lib/whatsapp';

interface CashflowBarChartProps {
  data: Array<{
    month: string;
    inflow: number;
    outflow: number;
  }>;
}

export const CashflowBarChart: React.FC<CashflowBarChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-lg border border-slate-700 space-y-1">
          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-bold">{formatINR(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasData = data.some((d) => d.inflow > 0 || d.outflow > 0);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      <div className="border-b border-slate-100 pb-2.5 mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Cash Inflow vs. Winner Payouts
          </h3>
          <p className="text-[11px] text-slate-500">
            Monthly member collections compared to auction prize disbursements
          </p>
        </div>
      </div>

      <div className="h-60 sm:h-64 w-full my-1">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs">
            No monthly financial cash flow recorded yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              {/* Inflow: Member Collections */}
              <Bar
                name="Inflow (Collections)"
                dataKey="inflow"
                fill="#165B40"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              {/* Outflow: Winner Payouts */}
              <Bar
                name="Outflow (Payouts)"
                dataKey="outflow"
                fill="#C5A059"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>* Green: Inward payments</span>
        <span>* Gold: Outward prize disbursements</span>
      </div>
    </div>
  );
};

