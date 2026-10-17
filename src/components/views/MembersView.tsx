import React, { useState } from 'react';
import { UserPlus, Search, Phone, MessageCircle, MapPin, Shield } from 'lucide-react';
import { Member } from '@/lib/api';
import { cleanPhone } from '@/lib/whatsapp';

interface MembersViewProps {
  members: Member[];
  onNewMember: () => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  onNewMember,
}) => {
  const [search, setSearch] = useState('');

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      (m.address && m.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Member Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered subscribers, ticket allotments, and direct mobile communication
          </p>
        </div>

        <button
          onClick={onNewMember}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by member name, phone number, or town..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-forest-700 shadow-xs"
        />
      </div>

      {/* Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((member) => {
          const rawPhone = member.phone;
          const waPhone = member.whatsapp_phone || rawPhone;
          const waUrl = `https://wa.me/${cleanPhone(waPhone)}`;

          return (
            <div
              key={member.id}
              className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-forest-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {member.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {member.phone}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-200">
                    {member.total_shares_held || 0} Shares
                  </span>
                </div>

                {member.address && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 my-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{member.address}</span>
                  </p>
                )}

                {member.id_proof_type && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 my-1">
                    <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {member.id_proof_type}: {member.id_proof_number || 'Verified'}
                    </span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                <a
                  href={`tel:${rawPhone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span>Call</span>
                </a>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

