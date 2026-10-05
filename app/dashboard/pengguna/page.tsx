'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Users, Plus, Search, Edit, Trash2, ShieldCheck, Mail, KeyRound, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPengguna, createPengguna, updatePengguna, deletePengguna } from '@/lib/actions';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function PenggunaPage() {
  const [dataPengguna, setDataPengguna] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    role: 'Admin PPID',
    status: 'Aktif',
    last_login: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const data = await getPengguna();
    setDataPengguna(data);
    setLoading(false);
  }

  const filteredData = useMemo(() => {
    let filtered = dataPengguna;
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (roleFilter) {
      filtered = filtered.filter(item => item.role === roleFilter);
    }
    return filtered;
  }, [dataPengguna, searchQuery, roleFilter]);

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setFormData({ nama: '', email: '', role: 'Admin PPID', status: 'Aktif', last_login: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setFormData({ 
      nama: user.nama || '', 
      email: user.email || '', 
      role: user.role || 'Admin PPID', 
      status: user.status || 'Aktif',
      last_login: user.last_login || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nama || !formData.email) {
      alert('Nama dan Email harus diisi.');
      return;
    }
    setIsSaving(true);
    
    let res;
    if (selectedUser) {
      res = await updatePengguna(selectedUser.id, formData);
    } else {
      res = await createPengguna({ ...formData, last_login: '-' });
    }

    if (res.success) {
      alert(selectedUser ? 'Pengguna berhasil diperbarui' : 'Pengguna berhasil ditambahkan');
      setIsModalOpen(false);
      loadData();
    } else {
      alert('Gagal menyimpan data pengguna');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus pengguna ini?')) return;
    const res = await deletePengguna(id);
    if (res.success) {
      setDataPengguna(prev => prev.filter(item => item.id !== id));
      alert('Pengguna berhasil dihapus');
    } else {
      alert('Gagal menghapus pengguna');
    }
  };


  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'Atasan PPID':
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-md text-xs font-bold border border-purple-200 dark:border-purple-800/50">{role}</span>;
      case 'Admin PPID':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md text-xs font-bold border border-emerald-200 dark:border-emerald-800/50">{role}</span>;
      case 'Petugas Informasi':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md text-xs font-bold border border-blue-200 dark:border-blue-800/50">{role}</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-md text-xs font-bold border border-slate-200 dark:border-slate-700">{role}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Manajemen Pengguna</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola akun, role, dan hak akses staf PPID Kemenag Parepare.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Total Pengguna</p>
            <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white">{dataPengguna.length}</h4>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Admin Aktif</p>
            <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white">{dataPengguna.filter(p => p.role === 'Admin PPID' && p.status === 'Aktif').length}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Perlu Reset Password</p>
            <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white">{dataPengguna.filter(p => !p.last_login).length}</h4>
          </div>
        </div>
      </div>

      {/* Filter/Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama atau email pengguna..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 sm:w-auto px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
          >
            <option value="">Semua Role</option>
            <option value="Atasan PPID">Atasan PPID</option>
            <option value="Admin PPID">Admin PPID</option>
            <option value="Petugas Informasi">Petugas Informasi</option>
          </select>
        </div>
      </div>

      {/* Data Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton />
          ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Nama Pengguna</th>
                <th className="px-6 py-4">Role Akses</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Login Terakhir</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data pengguna yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold shrink-0">
                          {item.nama?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{item.nama}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {item.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(item.role)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${item.status === 'Aktif' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${item.status === 'Aktif' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {item.last_login}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Reset Password">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenEdit(item)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit Pengguna">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Hapus/Nonaktifkan">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Modal Add / Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {selectedUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                  >
                    <option value="Admin PPID">Admin PPID</option>
                    <option value="Atasan PPID">Atasan PPID</option>
                    <option value="Petugas Informasi">Petugas Informasi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{selectedUser ? 'Simpan Perubahan' : 'Tambah'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
