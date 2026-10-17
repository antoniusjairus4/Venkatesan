import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatINR } from '@/lib/whatsapp';
import { CheckCircle2, Clock } from 'lucide-react';

interface CollectionDonutChartProps {
  collected: number;
  pending: number;
  percentage: number;
  title?: string;
}

export const CollectionDonutChart: React.FC<CollectionDonutChartProps> = ({
  collected,
  pending,
  percentage,
  title = 'Collection Health',
}) => {
  const data = [
    { name: 'Collected', value: collected, color: '#165B40' }, // Forest Green
    { name: 'Pending Dues', value: pending, color: '#D97706' }, // Amber
  ];

  const total = collected + pending;

  // Custom Tooltip formatter for INR
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-slate-900 text-white text-xs p-2 rounded-xl shadow-lg border border-slate-700">
          <p className="font-bold">{item.name}</p>
          <p className="text-slate-300">{formatINR(item.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      {/* Title */}
      <div className="border-b border-slate-100 pb-2.5 mb-2">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-[11px] text-slate-500">
          Ratio of collected installments to outstanding dues
        </p>
      </div>

      {/* Chart Area */}
      <div className="relative h-56 sm:h-64 w-full flex items-center justify-center my-1">
        {total === 0 ? (
          <div className="text-center text-slate-400 text-xs">
            No collection data recorded yet
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="88%"
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Content Inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {percentage}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Settled
              </span>
            </div>
          </>
        )}
      </div>

      {/* Legend & Summary */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-forest-700 shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Collected</span>
            <strong className="text-slate-800 font-bold">{formatINR(collected)}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Pending Dues</span>
            <strong className="text-amber-700 font-bold">{formatINR(pending)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

