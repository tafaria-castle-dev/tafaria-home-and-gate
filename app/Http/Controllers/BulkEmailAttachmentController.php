<?php

namespace App\Http\Controllers;

use App\Models\BulkEmailAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class BulkEmailAttachmentController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', BulkEmailAttachment::class);
        return BulkEmailAttachment::all();
    }

    public function store(Request $request)
    {
        $this->authorize('create', BulkEmailAttachment::class);
        $validated = $request->validate([
            'file' => 'required|file',
            'file_name' => 'required|string',
            'file_type' => 'required|string',
            'email_id' => 'required|string|exists:bulk_emails,id'
        ]);

        $file = $request->file('file');
        $path = $file->store('uploads', 'public');
        $bulkEmailAttachment = BulkEmailAttachment::create([
            'id' => Str::uuid(),
            'file_name' => $validated['file_name'],
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'file_type' => $validated['file_type'],
            'email_id' => $validated['email_id']
        ]);

        return response()->json($bulkEmailAttachment, 201);
    }

    public function show($id)
    {
        $bulkEmailAttachment = BulkEmailAttachment::findOrFail($id);
        $this->authorize('view', $bulkEmailAttachment);
        return response()->json($bulkEmailAttachment);
    }

    public function update(Request $request, $id)
    {
        $bulkEmailAttachment = BulkEmailAttachment::findOrFail($id);
        $this->authorize('update', $bulkEmailAttachment);
        $validated = $request->validate([
            'file' => 'file|nullable',
            'file_name' => 'string',
            'file_type' => 'string',
            'email_id' => 'string|exists:bulk_emails,id'
        ]);

        if (isset($validated['file'])) {
            $file = $request->file('file');
            Storage::disk('public')->delete($bulkEmailAttachment->file_path);
            $validated['file_path'] = $file->store('uploads', 'public');
            $validated['file_size'] = $file->getSize();
        }
        $bulkEmailAttachment->update(array_filter($validated));
        return response()->json($bulkEmailAttachment);
    }

    public function destroy($id)
    {
        $bulkEmailAttachment = BulkEmailAttachment::findOrFail($id);
        $this->authorize('delete', $bulkEmailAttachment);
        Storage::disk('public')->delete($bulkEmailAttachment->file_path);
        $bulkEmailAttachment->delete();
        return response()->json(null, 204);
    }
}