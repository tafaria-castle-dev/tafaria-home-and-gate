<?php

namespace App\Http\Controllers;

use App\Models\EmailActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmailActivityController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', EmailActivity::class);

        $query = EmailActivity::with(['createdBy']);

        if ($opportunityId = $request->query('opportunity_id')) {
            $query->where('opportunity_id', $opportunityId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $this->authorize('create', EmailActivity::class);
        $validated = $request->validate([
            'subject' => 'required|string',
            'description' => 'required|string',
            'description_json' => 'array|nullable',
            'type' => 'required|string|in:sent,received',
            'opportunity_id' => 'required|string|exists:opportunities,id',
            'template_id' => 'string|nullable|exists:email_templates,id',
            'created_by_id' => 'required|string|exists:users,id',
            'super_staff' => 'string|nullable'
        ]);

        $emailActivity = EmailActivity::create(array_merge($validated, ['id' => Str::uuid()]));
        return response()->json($emailActivity, 201);
    }

    public function show($id)
    {
        $emailActivity = EmailActivity::findOrFail($id);
        $this->authorize('view', $emailActivity);
        return response()->json($emailActivity);
    }

    public function update(Request $request, $id)
    {
        $emailActivity = EmailActivity::findOrFail($id);
        $this->authorize('update', $emailActivity);
        $validated = $request->validate([
            'subject' => 'string',
            'description' => 'string',
            'description_json' => 'array|nullable',
            'type' => 'string|in:sent,received',
            'opportunity_id' => 'string|exists:opportunities,id',
            'template_id' => 'string|nullable|exists:email_templates,id',
            'created_by_id' => 'string|exists:users,id',
            'super_staff' => 'string|nullable'
        ]);

        $emailActivity->update(array_filter($validated));
        return response()->json($emailActivity);
    }

    public function destroy($id)
    {
        $emailActivity = EmailActivity::findOrFail($id);
        $this->authorize('delete', $emailActivity);
        $emailActivity->delete();
        return response()->json(null, 204);
    }

}