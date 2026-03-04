<?php
namespace App\Http\Controllers;

use App\Models\OpportunityFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Laravel\Facades\Image as InterventionImage;

class OpportunityFileController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|mimes:pdf,doc,docx,jpeg,png,jpg,gif|max:51200',
            'opportunity_id' => 'required|exists:opportunities,id',

        ]);

        $uploadedFiles = [];

        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $index => $uploadedFile) {
                $filename = time() . '_' . $index . '_' . $uploadedFile->getClientOriginalName();
                $extension = $uploadedFile->getClientOriginalExtension();
                $mimeType = $uploadedFile->getMimeType();

                $fileData = [
                    'opportunity_id' => $data['opportunity_id'],
                    'original_name' => $uploadedFile->getClientOriginalName(),
                    'extension' => strtolower($extension),
                    'mime_type' => $mimeType,
                ];

                if (in_array(strtolower($extension), ['jpeg', 'jpg', 'png', 'gif'])) {
                    $imageData = getimagesize($uploadedFile->getPathname());
                    $originalWidth = $imageData[0];
                    $originalHeight = $imageData[1];

                    $img = InterventionImage::read($uploadedFile)->scale(width: 800);
                    $path = 'opportunity_files/' . $filename;
                    $encodedFile = $this->encodeImage($img, $extension);

                    Storage::disk('public')->put($path, $encodedFile);
                    $updated_path = 'storage/' . $path;

                    $scaleFactor = 800 / $originalWidth;
                    $newHeight = (int) ($originalHeight * $scaleFactor);

                    $fileData['file_path'] = $updated_path;
                } else {
                    $path = 'opportunity_files/' . $filename;
                    $uploadedFile->storeAs('opportunity_files', $filename, 'public');
                    $updated_path = 'storage/' . $path;

                    $fileData['file_path'] = $updated_path;
                }



                $opportunityFile = OpportunityFile::create(array_merge($fileData, ['id' => Str::uuid()]));
                $uploadedFiles[] = $opportunityFile;
            }
        }

        return response()->json($uploadedFiles, 201);
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