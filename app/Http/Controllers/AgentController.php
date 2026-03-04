<?php

namespace App\Http\Controllers;

use App\Models\Agent;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AgentController extends Controller
{
    public function index()
    {
        $agents = Agent::all();
        return response()->json($agents);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone_number' => 'nullable|string|max:20',
        ]);

        $agent = Agent::create($validated);

        return response()->json($agent, 201);
    }

    public function show(Agent $agent)
    {
        return response()->json($agent);
    }

    public function update(Request $request, Agent $agent)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone_number' => 'nullable|string|max:20',
        ]);

        $agent->update($validated);

        return response()->json($agent);
    }

    public function destroy(Agent $agent)
    {
        $agent->delete();

        return response()->json(null, 204);
    }
}