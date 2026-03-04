<?php

namespace App\Http\Controllers;

use App\Models\Tax;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TaxController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', Tax::class);
        return Tax::all();
    }

    public function store(Request $request)
    {
        $this->authorize('create', Tax::class);
        $validated = $request->validate([
            'name' => 'required|string|max:256',
            'tax_code' => 'required|string',
            'rate' => 'required|numeric',
            'additional_ids' => 'array|nullable',
            'package_ids' => 'array|nullable',
            'corporate_room_setting_ids' => 'array|nullable'
        ]);

        $tax = Tax::create(array_merge($validated, ['id' => Str::uuid()]));
        if (isset($validated['additional_ids'])) {
            $tax->additionals()->sync($validated['additional_ids']);
        }
        if (isset($validated['package_ids'])) {
            $tax->packages()->sync($validated['package_ids']);
        }
        if (isset($validated['corporate_room_setting_ids'])) {
            $tax->corporateRoomSettings()->sync($validated['corporate_room_setting_ids']);
        }
        return response()->json($tax, 201);
    }

    public function show($id)
    {
        $tax = Tax::findOrFail($id);
        $this->authorize('view', $tax);
        return response()->json($tax);
    }

    public function update(Request $request, $id)
    {
        $tax = Tax::findOrFail($id);
        $this->authorize('update', $tax);
        $validated = $request->validate([
            'name' => 'string|max:256',
            'tax_code' => 'string',
            'rate' => 'numeric',
            'additional_ids' => 'array|nullable',
            'package_ids' => 'array|nullable',
            'corporate_room_setting_ids' => 'array|nullable'
        ]);

        $tax->update(array_filter($validated));
        if (isset($validated['additional_ids'])) {
            $tax->additionals()->sync($validated['additional_ids']);
        }
        if (isset($validated['package_ids'])) {
            $tax->packages()->sync($validated['package_ids']);
        }
        if (isset($validated['corporate_room_setting_ids'])) {
            $tax->corporateRoomSettings()->sync($validated['corporate_room_setting_ids']);
        }
        return response()->json($tax);
    }

    public function destroy($id)
    {
        $tax = Tax::findOrFail($id);
        $this->authorize('delete', $tax);
        $tax->delete();
        return response()->json(null, 204);
    }
}