<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\PatrolResource;
use App\Http\Resources\PatrolCheckpointResource;
use App\Models\CheckPoint;
use App\Models\Patrol;
use App\Models\PatrolCheckpoint;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PatrolController extends Controller
{
    public function index()
    {
        $patrols = Patrol::with(['guard', 'patrolCheckpoints.checkPoint'])->latest()->paginate(20);

        return PatrolResource::collection($patrols);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'guard_id' => 'required|exists:guards,id',
            'status' => 'in:ongoing,completed,missed',
            'started_at' => 'nullable|date',
            'ended_at' => 'nullable|date',
        ]);

        $data['started_at'] = $data['started_at'] ?? now();

        $patrol = Patrol::create($data);
        $patrol->load(['guard', 'patrolCheckpoints.checkPoint']);

        return new PatrolResource($patrol);
    }

    public function show(Patrol $patrol)
    {
        $patrol->load(['guard', 'patrolCheckpoints.checkPoint']);

        return new PatrolResource($patrol);
    }

    public function update(Request $request, Patrol $patrol)
    {
        $data = $request->validate([
            'guard_id' => 'sometimes|exists:guards,id',
            'status' => 'sometimes|in:ongoing,completed,missed',
            'started_at' => 'nullable|date',
            'ended_at' => 'nullable|date',
        ]);

        $patrol->update($data);
        $patrol->load(['guard', 'patrolCheckpoints.checkPoint']);

        return new PatrolResource($patrol);
    }

    public function destroy(Patrol $patrol)
    {
        $patrol->delete();

        return response()->json(['message' => 'Patrol deleted successfully']);
    }

    public function scan(Request $request, Patrol $patrol)
    {
        $data = $request->validate([
            'check_point_id' => 'required|exists:check_points,id',
            'scanned_at' => 'nullable|date',
        ]);

        if ($patrol->status !== 'ongoing') {
            return response()->json(['message' => 'Cannot scan on a patrol that is not ongoing'], 422);
        }

        $scan = PatrolCheckpoint::create([
            'patrol_id' => $patrol->id,
            'check_point_id' => $data['check_point_id'],
            'scanned_at' => $data['scanned_at'] ?? now(),
        ]);

        $scan->load('checkPoint');

        return new PatrolCheckpointResource($scan);
    }

    public function complete(Patrol $patrol)
    {
        $patrol->update([
            'status' => 'completed',
            'ended_at' => now(),
        ]);

        $patrol->load(['guard', 'patrolCheckpoints.checkPoint']);

        return new PatrolResource($patrol);
    }
}