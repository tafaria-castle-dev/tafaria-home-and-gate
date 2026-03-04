<?php

namespace App\Http\Controllers;

use App\Models\AccommodationNote;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AccommodationNoteController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', AccommodationNote::class);
        return AccommodationNote::all();
    }

    public function store(Request $request)
    {
        $this->authorize('create', AccommodationNote::class);
        $validated = $request->validate([
            'name' => 'required|string',
            'description' => 'required|string',
            'created_by' => 'required|string|exists:users,id'
        ]);

        $accommodationNote = AccommodationNote::create(array_merge($validated, ['id' => Str::uuid()]));
        return response()->json($accommodationNote, 201);
    }

    public function show($id)
    {
        $accommodationNote = AccommodationNote::findOrFail($id);
        $this->authorize('view', $accommodationNote);
        return response()->json($accommodationNote);
    }

    public function update(Request $request, $id)
    {
        $accommodationNote = AccommodationNote::findOrFail($id);
        $this->authorize('update', $accommodationNote);
        $validated = $request->validate([
            'name' => 'string',
            'description' => 'string',
            'created_by' => 'string|exists:users,id'
        ]);

        $accommodationNote->update(array_filter($validated));
        return response()->json($accommodationNote);
    }

    public function destroy($id)
    {
        $accommodationNote = AccommodationNote::findOrFail($id);
        $this->authorize('delete', $accommodationNote);
        $accommodationNote->delete();
        return response()->json(null, 204);
    }
}