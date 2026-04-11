<?php

namespace App\Http\Controllers;

use App\Models\CheckPoint;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CheckPointController extends Controller
{
    public function index(Request $request)
    {
        $query = CheckPoint::query()
            ->when($request->search, fn($q) => $q
                ->where('point_name', 'like', "%{$request->search}%")
                ->orWhere('location', 'like', "%{$request->search}%"))
            ->orderBy('point_name');

        return response()->json($query->paginate($request->per_page ?? 25));
    }

    public function show($id)
    {
        return response()->json(CheckPoint::findOrFail($id));
    }

    public function store(Request $request)
    {
        $request->validate([
            'point_name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'qr_link' => 'nullable|string|max:255|unique:check_points,qr_link',
        ]);

        $checkpoint = CheckPoint::create([
            'point_name' => $request->point_name,
            'location' => $request->location,
            'qr_link' => $request->qr_link ?? (string) Str::uuid(),
        ]);

        return response()->json($checkpoint, 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'point_name' => 'sometimes|required|string|max:255',
            'location' => 'sometimes|required|string|max:255',
            'qr_link' => "sometimes|required|string|max:255|unique:check_points,qr_link,{$id}",
        ]);

        $checkpoint = CheckPoint::findOrFail($id);
        $checkpoint->update($request->only(['point_name', 'location', 'qr_link']));

        return response()->json($checkpoint);
    }

    public function destroy($id)
    {
        CheckPoint::findOrFail($id)->delete();
        return response()->json(['message' => 'Checkpoint deleted successfully.']);
    }


}

