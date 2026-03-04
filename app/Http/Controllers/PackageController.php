<?php

namespace App\Http\Controllers;

use App\Models\Package;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PackageController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', Package::class);
        return Package::with([
            'taxes',
        ])->get();
    }

    public function store(Request $request)
    {
        $this->authorize('create', Package::class);
        $validated = $request->validate([
            'board_type' => 'required|string|max:256',
            'name' => 'required|string|max:256',
            'description' => 'required|string',
            'amount_ksh' => 'required|numeric',
            'resident' => 'string|in:ea,non',
            'room_type' => 'string|in:single,double,triple,quadra',
            'number_of_rooms' => 'integer|min:0',
            'taxable_amount' => 'numeric|min:0',
            'tax_ids' => 'array|nullable',
        ]);

        $package = Package::create(array_merge($validated, ['id' => Str::uuid()]));
        if (isset($validated['tax_ids'])) {
            $package->taxes()->sync($validated['tax_ids']);
        }
        $package->load(['taxes']);
        return response()->json($package, 201);
    }

    public function show($id)
    {
        $package = Package::findOrFail($id);
        $this->authorize('view', $package);
        return response()->json($package);
    }

    public function update(Request $request, $id)
    {
        $package = Package::findOrFail($id);
        $this->authorize('update', $package);
        $validated = $request->validate([
            'board_type' => 'string|max:256',
            'name' => 'string|max:256',
            'description' => 'string',
            'amount_ksh' => 'numeric',
            'resident' => 'string|in:ea,non',
            'room_type' => 'string|in:single,double,triple,quadra',
            'number_of_rooms' => 'integer|min:0',
            'taxable_amount' => 'numeric|min:0',
            'tax_ids' => 'array|nullable',
        ]);

        $package->update(array_filter($validated));
        if (isset($validated['tax_ids'])) {
            $package->taxes()->sync($validated['tax_ids']);
        }
        $package->load(['taxes']);
        return response()->json($package);
    }

    public function destroy($id)
    {
        $package = Package::findOrFail($id);
        $this->authorize('delete', $package);
        $package->delete();
        return response()->json(null, 204);
    }
}