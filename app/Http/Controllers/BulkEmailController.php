<?php

namespace App\Http\Controllers;

use App\Models\BulkEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BulkEmailController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', BulkEmail::class);
        return BulkEmail::all();
    }

    public function store(Request $request)
    {
        $this->authorize('create', BulkEmail::class);
        $validated = $request->validate([
            'subject' => 'string|nullable',
            'description' => 'string|nullable',
            'description_json' => 'array|nullable',
            'template_id' => 'string|nullable|exists:email_templates,id',
            'created_by_id' => 'required|string|exists:users,id',
            'sent_by' => 'string|nullable',
            'recipient_ids' => 'array|nullable'
        ]);

        $bulkEmail = BulkEmail::create(array_merge($validated, ['id' => Str::uuid()]));
        if (isset($validated['recipient_ids'])) {
            $bulkEmail->recipients()->sync($validated['recipient_ids']);
        }
        return response()->json($bulkEmail, 201);
    }

    public function show($id)
    {
        $bulkEmail = BulkEmail::findOrFail($id);
        $this->authorize('view', $bulkEmail);
        return response()->json($bulkEmail);
    }

    public function update(Request $request, $id)
    {
        $bulkEmail = BulkEmail::findOrFail($id);
        $this->authorize('update', $bulkEmail);
        $validated = $request->validate([
            'subject' => 'string|nullable',
            'description' => 'string|nullable',
            'description_json' => 'array|nullable',
            'template_id' => 'string|nullable|exists:email_templates,id',
            'created_by_id' => 'string|exists:users,id',
            'sent_by' => 'string|nullable',
            'recipient_ids' => 'array|nullable'
        ]);

        $bulkEmail->update(array_filter($validated));
        if (isset($validated['recipient_ids'])) {
            $bulkEmail->recipients()->sync($validated['recipient_ids']);
        }
        return response()->json($bulkEmail);
    }

    public function destroy($id)
    {
        $bulkEmail = BulkEmail::findOrFail($id);
        $this->authorize('delete', $bulkEmail);
        $bulkEmail->delete();
        return response()->json(null, 204);
    }
}