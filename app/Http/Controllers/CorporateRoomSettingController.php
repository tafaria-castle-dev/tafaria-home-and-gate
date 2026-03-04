<?php

namespace App\Http\Controllers;

use App\Models\CorporateRoomSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CorporateRoomSettingController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', CorporateRoomSetting::class);
        return CorporateRoomSetting::with("taxes")->get();
    }

    public function store(Request $request)
    {
        $this->authorize('create', CorporateRoomSetting::class);
        $validated = $request->validate([
            'board_type' => 'required|string|max:256',
            'room_type' => 'string|in:single,double,triple,quadra',
            'description' => 'required|string',
            'amount_ksh' => 'numeric',
            'taxable_amount' => 'numeric|min:0',
            'tax_ids' => 'array|nullable',
        ]);

        $corporateRoomSetting = CorporateRoomSetting::create(array_merge($validated, ['id' => Str::uuid()]));
        if (isset($validated['tax_ids'])) {
            $corporateRoomSetting->taxes()->sync($validated['tax_ids']);
        }
        $corporateRoomSetting->load(['taxes']);
        return response()->json($corporateRoomSetting, 201);
    }

    public function show($id)
    {
        $corporateRoomSetting = CorporateRoomSetting::findOrFail($id);
        $this->authorize('view', $corporateRoomSetting);
        return response()->json($corporateRoomSetting);
    }

    public function update(Request $request, $id)
    {
        $corporateRoomSetting = CorporateRoomSetting::findOrFail($id);
        $this->authorize('update', $corporateRoomSetting);
        $validated = $request->validate([
            'board_type' => 'string|max:256',
            'room_type' => 'string|in:single,double,triple,quadra',
            'description' => 'string',
            'amount_ksh' => 'numeric',
            'taxable_amount' => 'numeric|min:0',
            'tax_ids' => 'array|nullable',
        ]);

        $corporateRoomSetting->update(array_filter($validated));
        if (isset($validated['tax_ids'])) {
            $corporateRoomSetting->taxes()->sync($validated['tax_ids']);
        }
        $corporateRoomSetting->load(['taxes']);
        return response()->json($corporateRoomSetting);
    }

    public function destroy($id)
    {
        $corporateRoomSetting = CorporateRoomSetting::findOrFail($id);
        $this->authorize('delete', $corporateRoomSetting);
        $corporateRoomSetting->delete();
        return response()->json(null, 204);
    }
}