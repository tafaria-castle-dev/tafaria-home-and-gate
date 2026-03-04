<?php

namespace App\Http\Controllers;

use App\Models\OpportunityName;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OpportunityNameController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', OpportunityName::class);
        return OpportunityName::all();
    }

    public function store(Request $request)
    {
        $this->authorize('create', OpportunityName::class);
        $validated = $request->validate([
            'name' => 'required|string|max:256'
        ]);

        $opportunityName = OpportunityName::create(array_merge($validated, ['id' => Str::uuid()]));
        return response()->json($opportunityName, 201);
    }

    public function show($id)
    {
        $opportunityName = OpportunityName::findOrFail($id);
        $this->authorize('view', $opportunityName);
        return response()->json($opportunityName);
    }

    public function update(Request $request, $id)
    {
        $opportunityName = OpportunityName::findOrFail($id);
        $this->authorize('update', $opportunityName);
        $validated = $request->validate([
            'name' => 'string|max:256'
        ]);

        $opportunityName->update(array_filter($validated));
        return response()->json($opportunityName);
    }

    public function destroy($id)
    {
        $opportunityName = OpportunityName::findOrFail($id);
        $this->authorize('delete', $opportunityName);
        $opportunityName->delete();
        return response()->json(null, 204);
    }
}