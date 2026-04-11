<?php

namespace App\Http\Controllers;

use App\Models\PatrolIncident;
use App\Models\Patrol;
use Illuminate\Http\Request;

class PatrolIncidentController extends Controller
{
    public function index(Request $request)
    {
        $query = PatrolIncident::with(['patrolGuard', 'patrol.shift', 'checkpoint', 'resolvedBy'])
            ->when($request->patrol_id, fn($q) => $q->where('patrol_id', $request->patrol_id))
            ->when($request->guard_id, fn($q) => $q->where('guard_id', $request->guard_id))
            ->when($request->severity, fn($q) => $q->where('severity', $request->severity))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->date, fn($q) => $q->whereDate('reported_at', $request->date))
            ->orderByDesc('reported_at');

        return response()->json($query->paginate($request->per_page ?? 25));
    }

    public function show($id)
    {
        return response()->json(
            PatrolIncident::with(['patrolGuard', 'patrol.shift', 'checkpoint', 'resolvedBy'])->findOrFail($id)
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'patrol_id' => 'required|exists:patrols,id',
            'guard_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'severity' => 'required|in:low,medium,high,critical',
            'check_point_id' => 'nullable|exists:check_points,id',
            'photos' => 'nullable|array',
            'photos.*' => 'string',
        ]);

        $patrol = Patrol::findOrFail($request->patrol_id);

        if ($patrol->status !== 'ongoing') {
            return response()->json(['message' => 'Can only report incidents on an ongoing patrol.'], 422);
        }

        $incident = PatrolIncident::create([
            ...$request->only(['patrol_id', 'guard_id', 'check_point_id', 'title', 'description', 'severity', 'photos']),
            'reported_at' => now(),
            'status' => 'open',
        ]);

        return response()->json($incident->load(['patrolGuard', 'checkpoint']), 201);
    }

    public function resolve(Request $request, $id)
    {
        $request->validate([
            'resolved_by_user_id' => 'required|exists:users,id',
            'resolution_notes' => 'nullable|string',
        ]);

        $incident = PatrolIncident::findOrFail($id);
        $incident->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'resolved_by_user_id' => $request->resolved_by_user_id,
            'resolution_notes' => $request->resolution_notes,
        ]);

        return response()->json($incident->load(['patrolGuard', 'resolvedBy', 'checkpoint']));
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:open,investigating,resolved']);
        $incident = PatrolIncident::findOrFail($id);
        $incident->update(['status' => $request->status]);
        return response()->json($incident);
    }

    public function destroy($id)
    {
        PatrolIncident::findOrFail($id)->delete();
        return response()->json(['message' => 'Incident deleted.']);
    }

    public function aggregations(Request $request)
    {
        $base = PatrolIncident::query()
            ->when($request->date, fn($q) => $q->whereDate('reported_at', $request->date))
            ->when($request->guard_id, fn($q) => $q->where('guard_id', $request->guard_id));

        return response()->json([
            'total' => (clone $base)->count(),
            'open' => (clone $base)->where('status', 'open')->count(),
            'investigating' => (clone $base)->where('status', 'investigating')->count(),
            'resolved' => (clone $base)->where('status', 'resolved')->count(),
            'critical' => (clone $base)->where('severity', 'critical')->count(),
            'high' => (clone $base)->where('severity', 'high')->count(),
        ]);
    }
}