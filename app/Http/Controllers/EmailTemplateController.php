<?php

namespace App\Http\Controllers;

use App\Models\EmailTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class EmailTemplateController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', EmailTemplate::class);
        return EmailTemplate::all();
    }

    public function store(Request $request)
    {
        $this->authorize('create', EmailTemplate::class);
        $validated = $request->validate([
            'name' => 'required|string|max:256',
            'subject' => 'required|string',
            'description' => 'required|string',
            'description_json' => 'array|nullable',
            'created_by_id' => 'required|string|exists:users,id'
        ]);
        $validated['description'] = $this->processContentImages($validated['description']);

        $emailTemplate = EmailTemplate::create(array_merge($validated, ['id' => Str::uuid()]));
        return response()->json($emailTemplate, 201);
    }

    public function show($id)
    {
        $emailTemplate = EmailTemplate::findOrFail($id);
        $this->authorize('view', $emailTemplate);
        return response()->json($emailTemplate);
    }

    public function update(Request $request, $id)
    {
        $emailTemplate = EmailTemplate::findOrFail($id);
        $this->authorize('update', $emailTemplate);
        $validated = $request->validate([
            'name' => 'string|max:256',
            'subject' => 'string',
            'description' => 'string',
            'description_json' => 'array|nullable',
            'created_by_id' => 'string|exists:users,id'
        ]);
        $validated['description'] = $this->processContentImages($validated['description']);
        $emailTemplate->update(array_filter($validated));
        return response()->json($emailTemplate);
    }

    public function destroy($id)
    {
        $emailTemplate = EmailTemplate::findOrFail($id);
        $this->authorize('delete', $emailTemplate);
        $emailTemplate->delete();
        return response()->json(null, 204);
    }
    private function processContentImages($content)
    {
        $pattern = '/<img[^>]+src=["\'](data:image\/[a-zA-Z]+;base64,[^"\']+)["\']/i';
        preg_match_all($pattern, $content, $matches);

        if (empty($matches[1])) {
            return $content;
        }

        foreach ($matches[1] as $base64Image) {
            if (preg_match('/data:image\/([a-zA-Z]+);base64,(.+)/', $base64Image, $imageParts)) {
                $imageType = $imageParts[1];
                $imageData = base64_decode($imageParts[2]);

                if ($imageData === false) {
                    continue;
                }

                $filename = 'post_images/' . Str::uuid() . '.' . $imageType;

                Storage::disk('public')->put($filename, $imageData);
                $path = config('app.url') . '/storage/' . $filename;

                $content = str_replace($base64Image, $path, $content);
            }
        }

        return $content;
    }
}