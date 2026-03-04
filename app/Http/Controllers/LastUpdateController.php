<?php
namespace App\Http\Controllers;
use App\Models\LastUpdate;
use App\Models\Opportunity;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
class LastUpdateController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', LastUpdate::class);
        return LastUpdate::all();
    }
    public function store(Request $request)
    {
        $this->authorize('create', LastUpdate::class);
        $validated = $request->validate([
            'updated_by_id' => 'required|string|exists:users,id',
            'super_staff' => 'string|nullable',
            'opportunity_id' => 'string|nullable|exists:opportunities,id',
            'updated_at' => 'date|nullable',
        ]);
        $lastUpdate = LastUpdate::updateOrCreate(array_merge($validated, [
            'id' => Str::uuid(),
            'updated_at' => $validated['updated_at'] ?? now(),
        ]));
        if ($lastUpdate->opportunity_id) {
            $opportunity = Opportunity::find($lastUpdate->opportunity_id);
            if ($opportunity) {
                $opportunity->update(['last_update_id' => $lastUpdate->id]);
            }
        }
        return response()->json($lastUpdate->load('updatedBy'), 201);
    }
    public function show($id)
    {
        $lastUpdate = LastUpdate::findOrFail($id);
        $this->authorize('view', $lastUpdate);
        return response()->json($lastUpdate->load('updatedBy'));
    }
    public function update(Request $request, $id)
    {
        $lastUpdate = LastUpdate::findOrFail($id);
        $this->authorize('update', $lastUpdate);
        $validated = $request->validate([
            'updated_by_id' => 'string|exists:users,id',
            'super_staff' => 'string|nullable',
            'opportunity_id' => 'string|nullable|exists:opportunities,id',
            'updated_at' => 'date|nullable',
        ]);
        $originalOpportunityId = $lastUpdate->opportunity_id;
        $lastUpdate->update(array_filter($validated));
        if (isset($validated['opportunity_id']) && $validated['opportunity_id'] !== $originalOpportunityId) {
            if ($originalOpportunityId) {
                $originalOpportunity = Opportunity::find($originalOpportunityId);
                if ($originalOpportunity) {
                    $originalOpportunity->update(['last_update_id' => null]);
                }
            }
            if ($validated['opportunity_id']) {
                $newOpportunity = Opportunity::find($validated['opportunity_id']);
                if ($newOpportunity) {
                    $newOpportunity->update(['last_update_id' => $lastUpdate->id]);
                }
            }
        } elseif ($lastUpdate->opportunity_id) {
            $opportunity = Opportunity::find($lastUpdate->opportunity_id);
            if ($opportunity && $opportunity->last_update_id !== $lastUpdate->id) {
                $opportunity->update(['last_update_id' => $lastUpdate->id]);
            }
        }
        return response()->json($lastUpdate->load('updatedBy'));
    }
    public function destroy($id)
    {
        $lastUpdate = LastUpdate::findOrFail($id);
        $this->authorize('delete', $lastUpdate);
        if ($lastUpdate->opportunity_id) {
            $opportunity = Opportunity::find($lastUpdate->opportunity_id);
            if ($opportunity) {
                $opportunity->update(['last_update_id' => null]);
            }
        }
        $lastUpdate->delete();
        return response()->json(null, 204);
    }
}
