<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\CheckPointResource;
use App\Models\CheckPoint;
use Illuminate\Http\Request;

class CheckPointController extends Controller
{
    public function index()
    {
        return CheckPointResource::collection(CheckPoint::all());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'point_name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
        ]);

        $checkPoint = CheckPoint::create($data);

        return new CheckPointResource($checkPoint);
    }

    public function show(CheckPoint $checkPoint)
    {
        return new CheckPointResource($checkPoint);
    }

    public function update(Request $request, CheckPoint $checkPoint)
    {
        $data = $request->validate([
            'point_name' => 'sometimes|string|max:255',
            'location' => 'sometimes|string|max:255',
        ]);

        $checkPoint->update($data);

        return new CheckPointResource($checkPoint);
    }

    public function destroy(CheckPoint $checkPoint)
    {
        $checkPoint->delete();

        return response()->json(['message' => 'Checkpoint deleted successfully']);
    }
}