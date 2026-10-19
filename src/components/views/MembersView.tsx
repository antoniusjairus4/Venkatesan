import React, { useState } from 'react';
import { UserPlus, Search, Phone, MessageSquare, MapPin, Shield, Layers } from 'lucide-react';
import { Member } from '@/lib/api';
import { cleanPhone, createSmsUrl } from '@/lib/sms';

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
      (m.address && m.address.toLowerCase().includes(q)) ||
      (m.enrolled_schemes && m.enrolled_schemes.toLowerCase().includes(q)) ||
      (m.ticket_details && m.ticket_details.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Member Directory
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-200">
              {members.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            All registered subscribers, enrolled chit allocations, and direct contact
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
          placeholder="Search by member name, phone, town, or chit scheme (e.g. 1 Lakh, 2 Lakhs)..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-forest-700 shadow-xs"
        />
      </div>

      {/* Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((member) => {
          const rawPhone = member.phone;
          const chitsCount = Number(member.total_shares_held) || 0;

          return (
            <div
              key={member.id}
              className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-forest-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {member.name}
                    </h3>

                    {/* Directly below the name: Number of chits taken */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-forest-100/90 text-forest-800 border border-forest-200">
                        <Layers className="w-3.5 h-3.5 text-forest-700" />
                        <span>
                          {chitsCount === 1 ? '1 Chit Taken' : `${chitsCount} Chits Taken`}
                        </span>
                      </span>

                      {member.enrolled_schemes && (
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                          {member.enrolled_schemes}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{member.phone}</span>
                      {member.ticket_details && (
                        <>
                          <span className="text-slate-300">&bull;</span>
                          <span className="text-[10px] text-slate-400 font-semibold truncate">
                            {member.ticket_details}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      member.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {member.status}
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
                  href={createSmsUrl(
                    rawPhone,
                    `வணக்கம் / Hello ${member.name},\n\nRAJAMANICKAM CHIT FUND\nRegards,\nK. Venkatesan\nPh: +91 98765 43210`
                  )}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 text-xs font-bold transition-colors"
                  title="Send SMS via mobile Messages app"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-forest-700" />
                  <span>SMS</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

