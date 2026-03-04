<?php

namespace App\Http\Controllers;

use App\Models\Additional;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdditionalController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', Additional::class);
        return Additional::with("taxes")->get();
    }

    public function store(Request $request)
    {
        $this->authorize('create', Additional::class);
        $validated = $request->validate([
            'name' => 'required|string|max:256',
            'description' => 'nullable|string',
            'type' => 'required|string',
            'priority' => 'required|numeric',
            'resident' => 'required|string',
            'dynamic' => 'string',
            'amount_ksh' => 'numeric',
            'taxable_amount' => 'numeric|min:0',
            'tax_ids' => 'array|nullable'
        ]);

        $additional = Additional::create(array_merge($validated, ['id' => Str::uuid()]));
        if (isset($validated['tax_ids'])) {
            $additional->taxes()->sync($validated['tax_ids']);
        }
        $additional->load(['taxes']);
        return response()->json($additional, 201);
    }

    public function show($id)
    {
        $additional = Additional::findOrFail($id);
        $this->authorize('view', $additional);
        return response()->json($additional);
    }

    public function update(Request $request, $id)
    {
        $additional = Additional::findOrFail($id);
        $this->authorize('update', $additional);
        $validated = $request->validate([
            'name' => 'string|max:256',
            'description' => 'nullable|string',
            'type' => 'string',
            'resident' => 'string',
            'priority' => 'numeric',
            'dynamic' => 'string',
            'amount_ksh' => 'numeric',
            'taxable_amount' => 'numeric|min:0',
            'tax_ids' => 'array|nullable'
        ]);

        $additional->update(array_filter($validated, fn($value) => !is_null($value)));
        if (isset($validated['tax_ids'])) {
            $additional->taxes()->sync($validated['tax_ids']);
        }
        $additional->load(['taxes']);
        return response()->json($additional);
    }

    public function destroy($id)
    {
        $additional = Additional::findOrFail($id);
        $this->authorize('delete', $additional);
        $additional->delete();
        return response()->json(null, 204);
    }
}