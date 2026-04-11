<?php

namespace App\Http\Controllers;

use App\Models\Patrol;
use App\Models\PatrolShift;
use App\Models\PatrolCheckpoint;
use App\Models\CheckPoint;
use App\Models\User;
use Illuminate\Http\Request;

class PatrolController extends Controller
{
    public function index(Request $request)
    {
        $query = Patrol::with(['patrolGuard', 'shift', 'checkpoints.checkpoint'])
            ->when($request->guard_id, fn($q) => $q->where('guard_id', $request->guard_id))
            ->when($request->shift_id, fn($q) => $q->where('shift_id', $request->shift_id))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->date, fn($q) => $q->whereDate('started_at', $request->date))
            ->when($request->date_from, fn($q) => $q->whereDate('started_at', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('started_at', '<=', $request->date_to))
            ->orderByDesc('started_at');

        return response()->json($query->paginate($request->per_page ?? 25));
    }

    public function show($id)
    {
        $patrol = Patrol::with(['patrolGuard', 'shift', 'checkpoints.checkpoint'])->findOrFail($id);
        return response()->json($patrol);
    }

    public function start(Request $request)
    {
        $request->validate([
            'guard_id' => 'required|exists:users,id',
            'shift_id' => 'required|exists:patrol_shifts,id',
        ]);

        $existing = Patrol::where('guard_id', $request->guard_id)
            ->where('status', 'ongoing')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Guard already has an ongoing patrol.',
                'patrol' => $existing->load(['shift']),
            ], 422);
        }

        $patrol = Patrol::create([
            'guard_id' => $request->guard_id,
            'shift_id' => $request->shift_id,
            'status' => 'ongoing',
            'started_at' => now(),
        ]);

        return response()->json($patrol->load(['patrolGuard', 'shift']), 201);
    }

    public function end(Request $request, $id)
    {
        $patrol = Patrol::findOrFail($id);

        if ($patrol->status !== 'ongoing') {
            return response()->json(['message' => 'Patrol is not currently ongoing.'], 422);
        }

        $patrol->update([
            'status' => 'completed',
            'ended_at' => now(),
            'notes' => $request->notes,
        ]);

        return response()->json($patrol->load(['patrolGuard', 'shift', 'checkpoints.checkpoint']));
    }

    public function scan(Request $request, $id)
    {
        $request->validate([
            'check_point_id' => 'required|exists:check_points,id',
        ]);

        $patrol = Patrol::findOrFail($id);

        if ($patrol->status !== 'ongoing') {
            return response()->json(['message' => 'Patrol is not currently ongoing.'], 422);
        }

        $scan = PatrolCheckpoint::create([
            'patrol_id' => $patrol->id,
            'check_point_id' => $request->check_point_id,
            'scanned_at' => now(),
        ]);

        return response()->json($scan->load('checkpoint'), 201);
    }

    public function scanByQr(Request $request)
    {
        $request->validate([
            'qr_link' => 'required|string',
            'guard_id' => 'required|exists:users,id',
        ]);

        $checkpoint = CheckPoint::where('qr_link', $request->qr_link)->first();

        if (!$checkpoint) {
            return response()->json(['message' => 'Invalid QR code.'], 404);
        }

        $patrol = Patrol::where('guard_id', $request->guard_id)
            ->where('status', 'ongoing')
            ->latest('started_at')
            ->first();

        if (!$patrol) {
            return response()->json(['message' => 'No active patrol found. Please start a patrol first.'], 422);
        }

        $scan = PatrolCheckpoint::create([
            'patrol_id' => $patrol->id,
            'check_point_id' => $checkpoint->id,
            'scanned_at' => now(),
        ]);

        return response()->json([
            'scan' => $scan->load('checkpoint'),
            'patrol' => $patrol->load(['shift', 'checkpoints.checkpoint']),
        ], 201);
    }

    public function byGuard(Request $request)
    {
        $filterPatrols = fn($q) => $q
            ->when($request->date, fn($q) => $q->whereDate('started_at', $request->date))
            ->when($request->date_from, fn($q) => $q->whereDate('started_at', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('started_at', '<=', $request->date_to))
            ->when($request->shift_id, fn($q) => $q->where('shift_id', $request->shift_id))
            ->when($request->status, fn($q) => $q->where('status', $request->status));

        $guards = User::withCount([
            'patrols as total_patrols' => fn($q) => $filterPatrols($q),
            'patrols as ongoing_patrols' => fn($q) => $filterPatrols($q)->where('status', 'ongoing'),
            'patrols as completed_patrols' => fn($q) => $filterPatrols($q)->where('status', 'completed'),
            'patrols as missed_patrols' => fn($q) => $filterPatrols($q)->where('status', 'missed'),
        ])
            ->with([
                'patrols' => fn($q) => $filterPatrols($q)
                    ->with(['shift', 'checkpoints.checkpoint'])
                    ->orderByDesc('started_at')
            ])
            ->when($request->guard_id, fn($q) => $q->where('id', $request->guard_id))
            ->whereHas('patrols', fn($q) => $filterPatrols($q))
            ->get();

        return response()->json($guards);
    }

    public function aggregations(Request $request)
    {
        $base = Patrol::query()
            ->when($request->guard_id, fn($q) => $q->where('guard_id', $request->guard_id))
            ->when($request->shift_id, fn($q) => $q->where('shift_id', $request->shift_id))
            ->when($request->date, fn($q) => $q->whereDate('started_at', $request->date))
            ->when($request->date_from, fn($q) => $q->whereDate('started_at', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('started_at', '<=', $request->date_to));

        $ids = (clone $base)->pluck('id');

        return response()->json([
            'total' => (clone $base)->count(),
            'ongoing' => (clone $base)->where('status', 'ongoing')->count(),
            'completed' => (clone $base)->where('status', 'completed')->count(),
            'missed' => (clone $base)->where('status', 'missed')->count(),
            'total_checkpoints_scanned' => PatrolCheckpoint::whereIn('patrol_id', $ids)->count(),
            'guards_on_patrol' => (clone $base)->where('status', 'ongoing')->distinct('guard_id')->count('guard_id'),
        ]);
    }

    public function markMissed(Request $request, $id)
    {
        $patrol = Patrol::findOrFail($id);
        $patrol->update(['status' => 'missed', 'notes' => $request->notes]);
        return response()->json($patrol->load(['patrolGuard', 'shift']));
    }

    public function destroy($id)
    {
        Patrol::findOrFail($id)->delete();
        return response()->json(['message' => 'Patrol deleted.']);
    }

    public function shifts()
    {
        return response()->json(PatrolShift::orderBy('start_time')->get());
    }
}