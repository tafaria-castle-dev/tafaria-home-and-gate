<?php

namespace App\Http\Controllers;

use App\Models\CallLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CallLogController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', CallLog::class);

        $query = CallLog::with(['createdBy']);

        if ($opportunityId = $request->query('opportunity_id')) {
            $query->where('opportunity_id', $opportunityId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $this->authorize('create', CallLog::class);
        $validated = $request->validate([
            'subject' => 'required|string',
            'description' => 'required|string',
            'opportunity_id' => 'required|string|exists:opportunities,id',
            'created_by_id' => 'required|string|exists:users,id',
            'super_staff' => 'string|nullable'
        ]);

        $callLog = CallLog::create(array_merge($validated, ['id' => Str::uuid()]));
        return response()->json($callLog, 201);
    }

    public function show($id)
    {
        $callLog = CallLog::findOrFail($id);
        $this->authorize('view', $callLog);
        return response()->json($callLog);
    }

    public function update(Request $request, $id)
    {
        $callLog = CallLog::findOrFail($id);
        $this->authorize('update', $callLog);
        $validated = $request->validate([
            'subject' => 'string',
            'description' => 'string',
            'opportunity_id' => 'string|exists:opportunities,id',
            'created_by_id' => 'string|exists:users,id',
            'super_staff' => 'string|nullable'
        ]);

        $callLog->update(array_filter($validated));
        return response()->json($callLog);
    }

    public function destroy($id)
    {
        $callLog = CallLog::findOrFail($id);
        $this->authorize('delete', $callLog);
        $callLog->delete();
        return response()->json(null, 204);
    }
}