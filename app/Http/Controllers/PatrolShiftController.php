<?php

namespace App\Http\Controllers;

use App\Models\PatrolShift;
use Illuminate\Http\Request;

class PatrolShiftController extends Controller
{
    public function index()
    {
        return response()->json(PatrolShift::orderBy('start_time')->get());
    }

    public function show($id)
    {
        return response()->json(PatrolShift::findOrFail($id));
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:patrol_shifts,name',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
        ]);

        $shift = PatrolShift::create([
            'name' => $request->name,
            'start_time' => $request->start_time . ':00',
            'end_time' => $request->end_time . ':00',
        ]);

        return response()->json($shift, 201);
    }

    public function update(Request $request, $id)
    {
        $shift = PatrolShift::findOrFail($id);

        $request->validate([
            'name' => "sometimes|required|string|max:255|unique:patrol_shifts,name,{$id}",
            'start_time' => 'sometimes|required|date_format:H:i',
            'end_time' => 'sometimes|required|date_format:H:i',
        ]);

        $data = $request->only(['name']);
        if ($request->has('start_time'))
            $data['start_time'] = $request->start_time . ':00';
        if ($request->has('end_time'))
            $data['end_time'] = $request->end_time . ':00';

        $shift->update($data);

        return response()->json($shift);
    }

    public function destroy($id)
    {
        $shift = PatrolShift::findOrFail($id);

        if ($shift->patrols()->exists()) {
            return response()->json(['message' => 'Cannot delete shift with existing patrols.'], 422);
        }

        $shift->delete();
        return response()->json(['message' => 'Shift deleted successfully.']);
    }
}