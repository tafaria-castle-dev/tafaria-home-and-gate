import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ChevronRight, Edit2, Plus, QrCode, RefreshCw, Search, Shield, Trash2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
interface CheckPoint {
    id: number;
    point_name: string;
    location: string;
    qr_link: string;
    created_at: string;
    updated_at: string;
}

export default function CheckPoints() {
    const [checkpoints, setCheckpoints] = useState<CheckPoint[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [isFetching, setIsFetching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<CheckPoint | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CheckPoint | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ point_name: '', location: '', qr_link: '' });
    const [qrPreview, setQrPreview] = useState<CheckPoint | null>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const fetchCheckpoints = async (page = 1) => {
        setIsFetching(true);
        try {
            const params: Record<string, string> = { page: page.toString(), per_page: '20' };
            if (searchQuery.trim()) params.search = searchQuery.trim();
            const res = await axios.get('/api/check-points', { params });
            const data = res.data;
            setCheckpoints(data.data ?? data);
            setTotalCount(data.total ?? (data.data ?? data).length);
            setCurrentPage(data.current_page ?? 1);
            setLastPage(data.last_page ?? 1);
        } catch {
            toast.error('Failed to load checkpoints.');
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchCheckpoints(1);
    }, [searchQuery]);

    const openCreate = () => {
        setEditTarget(null);
        setForm({ point_name: '', location: '', qr_link: '' });
        setIsModalOpen(true);
    };

    const openEdit = (cp: CheckPoint) => {
        setEditTarget(cp);
        setForm({ point_name: cp.point_name, location: cp.location, qr_link: cp.qr_link });
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.point_name.trim()) {
            toast.error('All fields are required.');
            return;
        }
        setIsSubmitting(true);
        try {
            if (editTarget) {
                await axios.patch(`/api/check-points/${editTarget.id}`, form);
                toast.success('Checkpoint updated.');
            } else {
                await axios.post('/api/check-points', form);
                toast.success('Checkpoint created.');
            }
            setIsModalOpen(false);
            fetchCheckpoints(currentPage);
        } catch {
            toast.error('Failed to save checkpoint.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsSubmitting(true);
        try {
            await axios.delete(`/api/check-points/${deleteTarget.id}`);
            toast.success('Checkpoint deleted.');
            setIsDeleteModalOpen(false);
            fetchCheckpoints(currentPage);
        } catch {
            toast.error('Failed to delete checkpoint.');
        } finally {
            setIsSubmitting(false);
            setDeleteTarget(null);
        }
    };

    return (
        <div
            className="min-h-screen"
            style={{
                background: 'linear-gradient(135deg, #fdf8f3 0%, #f9f4ee 50%, #f5efe8 100%)',
                fontFamily: "'Cormorant Garamond', Georgia, serif",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
                .dm { font-family: 'DM Sans', sans-serif; }
                .brand-grad { background: linear-gradient(135deg, #902729, #b83a3c); }
                .gold-grad { background: linear-gradient(135deg, #93723c, #b8914d); }
                .stat-card { background: white; border-radius: 16px; border: 1px solid rgba(147,114,60,0.15); box-shadow: 0 2px 12px rgba(144,39,41,0.06); }
                .cp-row { transition: background 0.15s; border-bottom: 1px solid rgba(147,114,60,0.08); }
                .cp-row:hover { background: rgba(147,114,60,0.04); }
                .action-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; padding: 7px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: all 0.15s; cursor: pointer; border: none; }
                .btn-primary { background: linear-gradient(135deg, #902729, #b83a3c); color: white; }
                .btn-primary:hover { box-shadow: 0 4px 12px rgba(144,39,41,0.35); transform: translateY(-1px); }
                .btn-gold { background: linear-gradient(135deg, #93723c, #b8914d); color: white; }
                .btn-gold:hover { box-shadow: 0 4px 12px rgba(147,114,60,0.35); transform: translateY(-1px); }
                .btn-outline { background: white; color: #5a4a3a; border: 1.5px solid rgba(147,114,60,0.25); }
                .btn-outline:hover { border-color: #93723c; color: #93723c; }
                .btn-danger { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; }
                .btn-danger:hover { box-shadow: 0 4px 12px rgba(220,38,38,0.35); transform: translateY(-1px); }
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .modal-box { background: white; border-radius: 20px; padding: 28px; width: 480px; max-width: 92vw; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
                .input-styled { width: 100%; border-radius: 10px; border: 1.5px solid rgba(147,114,60,0.2); background: white; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #2d1f0e; outline: none; transition: border 0.15s; box-sizing: border-box; }
                .input-styled:focus { border-color: #93723c; box-shadow: 0 0 0 3px rgba(147,114,60,0.1); }
                .th-cell { padding: 13px 16px; text-align: left; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.85); white-space: nowrap; }
                .td-cell { padding: 15px 16px; vertical-align: middle; }
                .icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid rgba(147,114,60,0.2); background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; color: #9a8060; }
                .icon-btn:hover { border-color: #93723c; color: #93723c; background: rgba(147,114,60,0.06); }
                .icon-btn.danger:hover { border-color: #dc2626; color: #dc2626; background: rgba(220,38,38,0.06); }
                .qr-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 8px; background: rgba(147,114,60,0.07); border: 1px solid rgba(147,114,60,0.15); font-family: 'DM Sans', sans-serif; font-size: 11px; color: #6a5030; font-weight: 600; cursor: pointer; transition: all 0.15s; }
                .qr-badge:hover { background: rgba(147,114,60,0.14); border-color: #93723c; }
                .pag-btn { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: 1.5px solid rgba(147,114,60,0.2); background: white; cursor: pointer; transition: all 0.15s; color: #6a5030; }
                .pag-btn:hover:not(:disabled) { border-color: #93723c; color: #93723c; }
                .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .pag-btn.active { background: #93723c; border-color: #93723c; color: white; }
            `}</style>

            <div className="mx-auto w-full px-6 py-8">
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="mb-1 flex items-center gap-3">
                                <div className="brand-grad flex h-10 w-10 items-center justify-center rounded-xl">
                                    <Shield size={20} color="white" />
                                </div>
                                <h1
                                    style={{
                                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                                        fontSize: 32,
                                        fontWeight: 700,
                                        color: '#1a0e06',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    Patrol Checkpoints
                                </h1>
                            </div>
                            <p className="dm ml-1 text-sm text-stone-500">Manage QR scan points across the property</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="action-btn btn-outline" onClick={() => fetchCheckpoints(currentPage)}>
                                <RefreshCw size={14} />
                                <span>Refresh</span>
                            </button>
                            <button className="action-btn btn-primary" onClick={openCreate}>
                                <Plus size={14} />
                                <span>Add Checkpoint</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5">
                    <div className="relative max-w-sm">
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9a8060' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or location…"
                            className="input-styled"
                            style={{ paddingLeft: 36 }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9a8060',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    style={{
                        background: 'white',
                        borderRadius: 16,
                        border: '1px solid rgba(147,114,60,0.12)',
                        overflow: 'hidden',
                        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
                    }}
                >
                    {isFetching ? (
                        <div className="flex items-center justify-center" style={{ minHeight: 240 }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    border: '3px solid rgba(147,114,60,0.2)',
                                    borderTopColor: '#93723c',
                                }}
                            />
                        </div>
                    ) : checkpoints.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: 240, color: '#c4a87a' }}>
                            <Shield size={40} opacity={0.3} />
                            <p className="dm text-sm font-medium" style={{ color: '#c4a87a' }}>
                                No checkpoints found
                            </p>
                            <button className="action-btn btn-primary" onClick={openCreate}>
                                <Plus size={13} /> Add First Checkpoint
                            </button>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'linear-gradient(135deg, #902729, #7a2124)' }}>
                                        {['#', 'Checkpoint Name', 'QR Code', 'Last Updated', 'Actions'].map((h, i) => (
                                            <th key={i} className="th-cell">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {checkpoints.map((cp, idx) => (
                                        <motion.tr
                                            key={cp.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="cp-row"
                                        >
                                            <td className="td-cell">
                                                <span className="dm text-xs font-bold" style={{ color: '#9a8060' }}>
                                                    {(currentPage - 1) * 20 + idx + 1}
                                                </span>
                                            </td>
                                            <td className="td-cell">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        style={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 10,
                                                            background: 'rgba(144,39,41,0.08)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <Shield size={16} color="#902729" />
                                                    </div>
                                                    <span className="dm text-sm font-semibold" style={{ color: '#1a0e06' }}>
                                                        {cp.point_name}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="td-cell">
                                                <button className="qr-badge" onClick={() => setQrPreview(cp)}>
                                                    <QrCode size={11} />
                                                    View QR
                                                </button>
                                            </td>
                                            <td className="td-cell">
                                                <span className="dm text-xs" style={{ color: '#9a8060' }}>
                                                    {new Date(cp.updated_at).toLocaleDateString('en-KE', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </span>
                                            </td>
                                            <td className="td-cell">
                                                <div className="flex items-center gap-2">
                                                    <button className="icon-btn" title="Edit" onClick={() => openEdit(cp)}>
                                                        <Edit2 size={13} />
                                                    </button>

                                                    <button
                                                        className="icon-btn danger"
                                                        title="Delete"
                                                        onClick={() => {
                                                            setDeleteTarget(cp);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!isFetching && lastPage > 1 && (
                        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid rgba(147,114,60,0.1)' }}>
                            <span className="dm text-xs text-stone-400">
                                Page <strong>{currentPage}</strong> of <strong>{lastPage}</strong> &bull; <strong>{totalCount}</strong> records
                            </span>
                            <div className="flex gap-1">
                                <button className="pag-btn" disabled={currentPage <= 1} onClick={() => fetchCheckpoints(currentPage - 1)}>
                                    <ChevronLeft size={14} />
                                </button>
                                {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                                    const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                                    if (page < 1 || page > lastPage) return null;
                                    return (
                                        <button
                                            key={page}
                                            className={`pag-btn dm text-xs font-semibold ${page === currentPage ? 'active' : ''}`}
                                            onClick={() => fetchCheckpoints(page)}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                                <button className="pag-btn" disabled={currentPage >= lastPage} onClick={() => fetchCheckpoints(currentPage + 1)}>
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal-box" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
                            <div className="mb-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        style={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: 12,
                                            background: 'rgba(144,39,41,0.08)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Shield size={18} color="#902729" />
                                    </div>
                                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#1a0e06' }}>
                                        {editTarget ? 'Edit Checkpoint' : 'New Checkpoint'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 8,
                                        background: 'rgba(147,114,60,0.08)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#9a8060',
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div>
                                    <label
                                        className="dm"
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            letterSpacing: '0.07em',
                                            textTransform: 'uppercase',
                                            color: '#9a8060',
                                            display: 'block',
                                            marginBottom: 6,
                                        }}
                                    >
                                        Checkpoint Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.point_name}
                                        onChange={(e) => setForm((p) => ({ ...p, point_name: e.target.value, location: e.target.value }))}
                                        placeholder="e.g. Barbican,Swimming Pool, Castle front…"
                                        className="input-styled"
                                    />
                                </div>
                                {/* <div>
                                    <label
                                        className="dm"
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            letterSpacing: '0.07em',
                                            textTransform: 'uppercase',
                                            color: '#9a8060',
                                            display: 'block',
                                            marginBottom: 6,
                                        }}
                                    >
                                        Location Description *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.location}
                                        onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                                        placeholder="e.g. Front entrance near reception…"
                                        className="input-styled"
                                    />
                                </div> */}
                                <div>
                                    <label
                                        className="dm"
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            letterSpacing: '0.07em',
                                            textTransform: 'uppercase',
                                            color: '#9a8060',
                                            display: 'block',
                                            marginBottom: 6,
                                        }}
                                    >
                                        QR Link / Data *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.qr_link}
                                        onChange={(e) => setForm((p) => ({ ...p, qr_link: e.target.value.trim() }))}
                                        placeholder="Paste the QR code link here..."
                                        className="input-styled"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button className="action-btn btn-outline flex-1 justify-center" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </button>
                                <button className="action-btn btn-primary flex-1 justify-center" onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                            style={{
                                                width: 14,
                                                height: 14,
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: 'white',
                                                borderRadius: '50%',
                                            }}
                                        />
                                    ) : (
                                        <CheckCircle2 size={14} />
                                    )}
                                    {editTarget ? 'Save Changes' : 'Create Checkpoint'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isDeleteModalOpen && deleteTarget && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal-box" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
                            <div className="mb-4 flex items-center gap-3">
                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 12,
                                        background: 'rgba(220,38,38,0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Trash2 size={18} color="#dc2626" />
                                </div>
                                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#1a0e06' }}>
                                    Delete Checkpoint
                                </h3>
                            </div>
                            <div
                                style={{
                                    background: 'rgba(220,38,38,0.04)',
                                    border: '1px solid rgba(220,38,38,0.15)',
                                    borderRadius: 12,
                                    padding: '12px 16px',
                                    marginBottom: 20,
                                }}
                            >
                                <p className="dm text-sm font-semibold" style={{ color: '#1a0e06' }}>
                                    {deleteTarget.point_name}
                                </p>
                            </div>
                            <p className="dm mb-5 text-sm" style={{ color: '#5a4a3a' }}>
                                This will permanently delete the checkpoint and all associated scan records. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button className="action-btn btn-outline flex-1 justify-center" onClick={() => setIsDeleteModalOpen(false)}>
                                    Cancel
                                </button>
                                <button className="action-btn btn-danger flex-1 justify-center" onClick={handleDelete} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        '…'
                                    ) : (
                                        <>
                                            <Trash2 size={13} /> Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {qrPreview && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setQrPreview(null)}
                    >
                        <motion.div
                            className="modal-box"
                            style={{ textAlign: 'center', maxWidth: 340 }}
                            initial={{ scale: 0.85, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.85, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: '#1a0e06' }}>
                                    QR Code
                                </h3>
                                <button
                                    onClick={() => setQrPreview(null)}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 8,
                                        background: 'rgba(147,114,60,0.08)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#9a8060',
                                    }}
                                >
                                    <X size={13} />
                                </button>
                            </div>
                            <p className="dm mb-1 text-sm font-semibold" style={{ color: '#1a0e06' }}>
                                {qrPreview.point_name}
                            </p>

                            <div ref={qrRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                <QRCodeSVG
                                    value={qrPreview.qr_link}
                                    size={200}
                                    level="H"
                                    imageSettings={{ src: '/logo.png', height: 40, width: 40, excavate: true }}
                                />
                            </div>
                            <p
                                className="dm text-xs"
                                style={{
                                    color: '#9a8060',
                                    wordBreak: 'break-all',
                                    background: 'rgba(147,114,60,0.05)',
                                    borderRadius: 8,
                                    padding: '8px 10px',
                                }}
                            >
                                {qrPreview.qr_link}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <button className="action-btn btn-outline flex-1 justify-center" onClick={() => setQrPreview(null)}>
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
