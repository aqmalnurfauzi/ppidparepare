import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer id="kontak" className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo-kemenag.png" alt="Logo Kemenag" className="w-full h-full object-contain" />
              </div>
              <h4 className="font-bold text-white text-lg">Kemenag Parepare</h4>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Kementerian Agama Kota Parepare berkomitmen untuk mewujudkan zona integritas WBK dan WBBM melalui peningkatan kualitas pelayanan publik.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Hubungi Kami</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Jl. Jend. Sudirman No.KM. 3, Bumi Harapan, Kec. Bacukiki Bar., Kota Parepare, Sulawesi Selatan 91122</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>(0421) 21124</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>kemenagparepare@kemenag.go.id</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Jam Pelayanan PPID</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Senin - Kamis</span>
                <span className="font-medium text-slate-300">08:00 - 16:00</span>
              </li>
              <li className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Jumat</span>
                <span className="font-medium text-slate-300">08:00 - 16:30</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-400">Sabtu - Minggu</span>
                <span className="font-medium text-slate-500">Tutup</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} PPID Kementerian Agama Kota Parepare. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
