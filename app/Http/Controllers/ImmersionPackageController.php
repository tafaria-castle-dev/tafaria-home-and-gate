<?php

namespace App\Http\Controllers;

use App\Models\ImmersionPackage;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ImmersionPackageController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', ImmersionPackage::class);
        return ImmersionPackage::with([
            'taxes',
        ])->get();
    }

    public function store(Request $request)
    {
        $this->authorize('create', ImmersionPackage::class);
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

        $immersionPackage = ImmersionPackage::create(array_merge($validated, ['id' => Str::uuid()]));
        if (isset($validated['tax_ids'])) {
            $immersionPackage->taxes()->sync($validated['tax_ids']);
        }
        $immersionPackage->load(['taxes']);
        return response()->json($immersionPackage, 201);
    }

    public function show($id)
    {
        $immersionPackage = ImmersionPackage::findOrFail($id);
        $this->authorize('view', $immersionPackage);
        return response()->json($immersionPackage);
    }

    public function update(Request $request, $id)
    {
        $immersionPackage = ImmersionPackage::findOrFail($id);
        $this->authorize('update', $immersionPackage);
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

        $immersionPackage->update(array_filter($validated));
        if (isset($validated['tax_ids'])) {
            $immersionPackage->taxes()->sync($validated['tax_ids']);
        }
        $immersionPackage->load(['taxes']);
        return response()->json($immersionPackage);
    }

    public function destroy($id)
    {
        $immersionPackage = ImmersionPackage::findOrFail($id);
        $this->authorize('delete', $immersionPackage);
        $immersionPackage->delete();
        return response()->json(null, 204);
    }
}