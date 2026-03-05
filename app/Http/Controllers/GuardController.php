<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\GuardResource;
use App\Models\Guard;
use Illuminate\Http\Request;

class GuardController extends Controller
{
    public function index()
    {
        return GuardResource::collection(Guard::all());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'badge_number' => 'required|string|max:255|unique:guards,badge_number',
        ]);

        $guard = Guard::create($data);

        return new GuardResource($guard);
    }

    public function show(Guard $guard)
    {
        return new GuardResource($guard);
    }

    public function update(Request $request, Guard $guard)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'badge_number' => 'sometimes|string|max:255|unique:guards,badge_number,' . $guard->id,
        ]);

        $guard->update($data);

        return new GuardResource($guard);
    }

    public function destroy(Guard $guard)
    {
        $guard->delete();

        return response()->json(['message' => 'Guard deleted successfully']);
    }
}