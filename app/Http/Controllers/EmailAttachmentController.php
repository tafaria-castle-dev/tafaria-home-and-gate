<?php

namespace App\Http\Controllers;

use App\Models\EmailAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Laravel\Facades\Image as InterventionImage;

class EmailAttachmentController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', EmailAttachment::class);
        return EmailAttachment::all();
    }

    public function store(Request $request)
    {
        $this->authorize('create', EmailAttachment::class);
        $validated = $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|mimes:pdf,doc,docx,jpeg,png,jpg,gif|max:51200',
            'email_id' => 'required|string|exists:email_activities,id'
        ]);

        $uploadedFiles = [];

        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $index => $uploadedFile) {
                $filename = time() . '_' . $index . '_' . $uploadedFile->getClientOriginalName();
                $extension = $uploadedFile->getClientOriginalExtension();
                $mimeType = $uploadedFile->getMimeType();

                $fileData = [
                    'email_id' => $validated['email_id'],
                    'original_name' => $uploadedFile->getClientOriginalName(),
                    'extension' => strtolower($extension),
                    'mime_type' => $mimeType,
                ];

                if (in_array(strtolower($extension), ['jpeg', 'jpg', 'png', 'gif'])) {

                    $img = InterventionImage::read($uploadedFile)->scale(width: 800);
                    $path = 'email_attachments/' . $filename;
                    $encodedFile = $this->encodeImage($img, $extension);
                    Storage::disk('public')->put($path, $encodedFile);
                    $updated_path = 'storage/' . $path;
                    $fileData['file_path'] = $updated_path;
                } else {
                    $path = 'email_attachments/' . $filename;
                    $uploadedFile->storeAs('email_attachments', $filename, 'public');
                    $updated_path = 'storage/' . $path;

                    $fileData['file_path'] = $updated_path;
                }



                $emailAttchment = EmailAttachment::create(array_merge($fileData, ['id' => Str::uuid()]));
                $uploadedFiles[] = $emailAttchment;
            }
        }

        return response()->json($uploadedFiles, 201);
    }

    public function show($id)
    {
        $emailAttachment = EmailAttachment::findOrFail($id);
        $this->authorize('view', $emailAttachment);
        return response()->json($emailAttachment);
    }

    public function update(Request $request, $id)
    {
        $emailAttachment = EmailAttachment::findOrFail($id);
        $this->authorize('update', $emailAttachment);
        $validated = $request->validate([
            'file' => 'file|nullable',
            'file_name' => 'string',
            'file_type' => 'string',
            'email_id' => 'string|exists:email_activities,id'
        ]);

        if (isset($validated['file'])) {
            $file = $request->file('file');
            Storage::disk('public')->delete($emailAttachment->file_path);
            $validated['file_path'] = $file->store('uploads', 'public');
            $validated['file_size'] = $file->getSize();
        }
        $emailAttachment->update(array_filter($validated));
        return response()->json($emailAttachment);
    }

    public function destroy($id)
    {
        $emailAttachment = EmailAttachment::findOrFail($id);
        $this->authorize('delete', $emailAttachment);
        Storage::disk('public')->delete($emailAttachment->file_path);
        $emailAttachment->delete();
        return response()->json(null, 204);
    }
}