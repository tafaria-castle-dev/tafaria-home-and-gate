<?php

namespace App\Http\Controllers;

use App\Models\FileUpload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Laravel\Facades\Image as InterventionImage;

class FileUploadController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', FileUpload::class);
        $query = FileUpload::query();
        $search = $request->input('search');
        $category = $request->input('category');

        if ($category) {
            $query->where('category', 'like', "%{$category}%");
        }

        if ($search) {
            $search = trim($search);
            $query->where(function ($q) use ($search) {
                $q->where('category', 'like', "%{$search}%")
                    ->orWhere('file_name', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|mimes:pdf,doc,docx,jpeg,png,jpg,gif|max:51200',
            'category' => 'nullable|string',
        ]);

        $uploadedFiles = [];

        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $index => $uploadedFile) {
                $filename = time() . '_' . $index . '_' . $uploadedFile->getClientOriginalName();
                $extension = $uploadedFile->getClientOriginalExtension();
                $mimeType = $uploadedFile->getMimeType();
                $fileSize = $uploadedFile->getSize();

                $fileData = [
                    'id' => Str::uuid(),
                    'file_name' => $uploadedFile->getClientOriginalName(),
                    'file_size' => $fileSize,
                    'file_type' => $mimeType,
                    'category' => $data['category'] ?? null,
                ];

                if (in_array(strtolower($extension), ['jpeg', 'jpg', 'png', 'gif'])) {
                    $img = InterventionImage::read($uploadedFile)->scale(width: 800);
                    $path = 'uploads/' . $filename;
                    $encodedFile = $this->encodeImage($img, $extension);

                    Storage::disk('public')->put($path, $encodedFile);
                    $fileData['file_path'] = 'storage/' . $path;
                } else {
                    $path = 'uploads/' . $filename;
                    $uploadedFile->storeAs('uploads', $filename, 'public');
                    $fileData['file_path'] = 'storage/' . $path;
                }

                $fileUpload = FileUpload::create($fileData);
                $uploadedFiles[] = $fileUpload;
            }
        }

        return response()->json($uploadedFiles, 201);
    }

    public function update(Request $request, string $id)
    {
        $this->authorize('update', $fileUpload = FileUpload::findOrFail($id));

        $data = $request->validate([
            'category' => 'nullable|string',
            'files' => 'nullable|array|max:1',
            'files.*' => 'file|mimes:pdf,doc,docx,jpeg,png,jpg,gif|max:51200',
        ]);

        $fileUpload->update(['category' => $data['category'] ?? $fileUpload->category]);

        if ($request->hasFile('files') && count($request->file('files')) === 1) {
            $publicPath = str_replace('storage/', 'public/', $fileUpload->file_path);
            if (Storage::disk('public')->exists($publicPath)) {
                Storage::disk('public')->delete($publicPath);
            }

            $uploadedFile = $request->file('files')[0];
            $filename = time() . '_' . Str::uuid() . '_' . $uploadedFile->getClientOriginalName();
            $extension = $uploadedFile->getClientOriginalExtension();
            $mimeType = $uploadedFile->getMimeType();
            $fileSize = $uploadedFile->getSize();

            $fileData = [
                'file_name' => $uploadedFile->getClientOriginalName(),
                'file_size' => $fileSize,
                'file_type' => $mimeType,
            ];

            if (in_array(strtolower($extension), ['jpeg', 'jpg', 'png', 'gif'])) {
                $img = InterventionImage::read($uploadedFile)->scale(width: 800);
                $path = 'uploads/' . $filename;
                $encodedFile = $this->encodeImage($img, $extension);

                Storage::disk('public')->put($path, $encodedFile);
                $fileData['file_path'] = 'storage/' . $path;
            } else {
                $path = 'uploads/' . $filename;
                $uploadedFile->storeAs('uploads', $filename, 'public');
                $fileData['file_path'] = 'storage/' . $path;
            }

            $fileUpload->update($fileData);
        }

        return response()->json($fileUpload->fresh(), 200);
    }

    public function destroy(string $id)
    {
        $this->authorize('delete', $fileUpload = FileUpload::findOrFail($id));

        $publicPath = str_replace('storage/', 'public/', $fileUpload->file_path);
        if (Storage::disk('public')->exists($publicPath)) {
            Storage::disk('public')->delete($publicPath);
        }

        $fileUpload->delete();

        return response()->json(null, 204);
    }

    private function encodeImage($img, $extension)
    {
        $extension = strtolower($extension);

        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                return (string) $img->toJpeg(quality: 85);
            case 'png':
                return (string) $img->toPng();
            case 'gif':
                return (string) $img->toGif();
            default:
                return (string) $img->toJpeg(quality: 85);
        }
    }
}